"""Execução das consultas nos bancos dos cenários (Supabase / PostgreSQL) via RPC."""
import json
import logging
import os
import threading
import time

from flask import current_app

logger = logging.getLogger(__name__)

try:  # Exceções de rede do cliente HTTP usado pelo supabase-py
    import httpx
    _NETWORK_ERRORS = (httpx.TransportError, ConnectionError, TimeoutError)
except ImportError:  # pragma: no cover
    _NETWORK_ERRORS = (ConnectionError, TimeoutError)


def _env_suffix(slug):
    return (slug or '').upper().replace('-', '_')


class SupabaseService:
    """Gerencia conexões e execução de queries RPC no Supabase."""

    _clients = {}
    _clients_lock = threading.Lock()
    _expected_cache = {}
    _cache_lock = threading.Lock()
    EXPECTED_CACHE_TTL = 600  # segundos

    @staticmethod
    def has_credentials(slug):
        suffix = _env_suffix(slug)
        return bool(os.getenv(f"SUPABASE_URL_{suffix}") and os.getenv(f"SUPABASE_KEY_{suffix}"))

    @classmethod
    def get_client(cls, slug):
        """Retorna (e reutiliza) o cliente Supabase do cenário, ou None sem credenciais."""
        suffix = _env_suffix(slug)
        url = os.getenv(f"SUPABASE_URL_{suffix}")
        key = os.getenv(f"SUPABASE_KEY_{suffix}")
        if not url or not key:
            return None
        cache_key = (url, key)
        with cls._clients_lock:
            client = cls._clients.get(cache_key)
            if client is None:
                from supabase import create_client, ClientOptions
                client = create_client(url, key, options=ClientOptions(postgrest_client_timeout=20))
                cls._clients[cache_key] = client
            return client

    @staticmethod
    def _parse_payload(data):
        """
        Converte a resposta do RPC em (colunas, linhas). Aceita o RPC antigo (retorno json, já
        decodificado) e o novo (retorno text), que preserva colunas com nomes repetidos.
        """
        if isinstance(data, str):
            try:
                data = json.loads(data, object_pairs_hook=lambda pairs: pairs)
            except ValueError as e:
                raise ValueError(f'Falha ao interpretar o resultado: {e}')

        if data is None:
            return [], []
        if isinstance(data, dict):
            raise RuntimeError(data.get('error') or 'Formato inesperado')
        if isinstance(data, list) and data and isinstance(data[0], tuple):
            # Objeto de erro vindo como lista de pares: [('error', 'mensagem')]
            keys = [k for k, _ in data]
            if keys == ['error']:
                raise RuntimeError(data[0][1])
        if not isinstance(data, list):
            raise ValueError('Formato inesperado')

        columns, rows = [], []
        for item in data:
            pairs = list(item.items()) if isinstance(item, dict) else list(item)
            if not columns:
                columns = [k for k, _ in pairs]
            rows.append([v for _, v in pairs])
        return columns, rows

    @classmethod
    def execute_query(cls, client, sql: str, retries: int = 3, backoff: float = 0.5):
        """
        Executa uma consulta (já validada) e devolve {'data': {columns, rows, total}, 'error'}.
        Uma quebra de linha é adicionada ao final para que um comentário de linha nunca anule o
        fechamento da subconsulta montada pela função RPC.
        """
        from postgrest.exceptions import APIError

        sql = (sql or '').strip().rstrip(';') + '\n'
        max_rows = current_app.config.get('MAX_RESULT_ROWS', 10000) if current_app else 10000
        last_exception = None

        for attempt in range(1, retries + 1):
            try:
                response = client.rpc('rpc_sql', {'p_query': sql}).execute()
            except APIError as e:
                message = getattr(e, 'message', None) or str(e)
                return {'data': None, 'error': f'Erro no banco de dados: {message}'}
            except _NETWORK_ERRORS as e:
                last_exception = e
                if attempt < retries:
                    logger.warning("Falha de rede ao executar RPC (tentativa %s/%s): %s", attempt, retries, e)
                    time.sleep(backoff)
                    backoff *= 2
                    continue
                break
            except Exception as e:  # erro inesperado do cliente
                return {'data': None, 'error': str(e)}

            try:
                columns, rows = cls._parse_payload(response.data)
            except RuntimeError as e:
                return {'data': None, 'error': str(e)}
            except ValueError as e:
                return {'data': None, 'error': str(e)}

            if len(rows) > max_rows:
                return {'data': None, 'error': (f'O resultado tem {len(rows)} linhas, acima do limite de '
                                                 f'{max_rows}. Refine sua consulta.')}
            return {'data': {'columns': columns, 'rows': rows, 'total': len(rows)}, 'error': None}

        return {'data': None, 'error': f"Falha ao executar a consulta após {retries} tentativas: {last_exception}"}

    @classmethod
    def execute_expected(cls, client, slug, question):
        """Executa o gabarito, reaproveitando o resultado em cache por alguns minutos."""
        key = (slug, question.id, question.expected_query)
        now = time.monotonic()
        with cls._cache_lock:
            cached = cls._expected_cache.get(key)
            if cached and now - cached[0] < cls.EXPECTED_CACHE_TTL:
                return cached[1]
        result = cls.execute_query(client, question.expected_query)
        if not result.get('error'):
            with cls._cache_lock:
                cls._expected_cache[key] = (now, result)
        return result

    @classmethod
    def invalidate_expected_cache(cls, question_id=None):
        with cls._cache_lock:
            if question_id is None:
                cls._expected_cache.clear()
            else:
                for key in [k for k in cls._expected_cache if k[1] == question_id]:
                    cls._expected_cache.pop(key, None)

    @staticmethod
    def for_display(result, limit=None):
        """Cópia do resultado limitada a `limit` linhas, mantendo o total real."""
        if not result or not result.get('data'):
            return result
        if limit is None:
            limit = current_app.config.get('DISPLAY_RESULT_ROWS', 500)
        data = result['data']
        rows = data['rows'][:limit]
        return {
            'data': {
                'columns': data['columns'],
                'rows': rows,
                'total': data['total'],
                'truncated': len(rows) < data['total'],
            },
            'error': result.get('error'),
        }
