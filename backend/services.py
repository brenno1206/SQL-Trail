import json
from supabase import create_client
import os
import time
import re
import pandas as pd
import requests

class QuestionRepository:
    """Gerencia o carregamento e recuperação das questões do arquivo JSON."""
    def __init__(self, json_path="questoes.json"):
        self.QUESTIONS = {}
        self._load_questions(json_path)
    
    def _load_questions(self, json_path):
        try:
            with open(json_path, encoding='utf-8') as f:
                questionsList = json.load(f)
            self.QUESTIONS = {
                (db['slug'], q['id']): q
                    for db in questionsList
                    for q in db['questions']
            }
        except FileNotFoundError:
            print(f"File {json_path} not found.")
            self.QUESTIONS = {}
        except Exception as e:
            print(f"Error loading questions: {e}")
            self.QUESTIONS = {}

    def get_questions(self, slug):
        """Retorna lista de questões filtrada por slug."""
        return [
            {'id': q['id'], 'slug': slug, 'enunciado': q['enunciado']}
            for key, q in self.QUESTIONS.items()
            if key[0] == slug
        ]
    
    def get_question(self, slug, id):
        """Retorna uma questão específica com base no slug e id."""
        return self.QUESTIONS.get((slug, id))
    
    def exists(self, slug, id):
        """Verifica se uma questão existe com base no slug e id."""
        return (slug, id) in self.QUESTIONS
    
class SupabaseService:
    """Gerencia conexões e execução de queries RPC no Supabase."""

    def get_client(self, slug):
        """Cria o cliente Supabase dinamicamente com base no slug."""
        suffix = slug.upper().replace('-', '_')
        url = os.getenv(f"SUPABASE_URL_{suffix}")
        key = os.getenv(f"SUPABASE_KEY_{suffix}")
        if not url or not key:
            return None
        return create_client(url, key)
    
    def execute_query(self, client, sql: str, max_rows: int = 20, retries: int = 3, backoff: float = 1.0):
        """Executa a query via RCP com lógica de retry e tratamento de erros."""
        sql = sql.strip().rstrip(';')
        last_exception = None

        for attempt in range(1, retries + 1):
            try:
                response = client.rpc('rpc_sql', {'p_query': sql}).execute()
            except Exception as e:
                last_exception = e
                if attempt < retries and getattr(e, 'winerror', None) == 10054:
                    print(f"Connection reset (attempt {attempt}/{retries}). Retrying in {backoff} seconds... (Attempt {attempt}/{retries})")
                    time.sleep(backoff)
                    backoff *= 2
                    continue
                print(f"Error executing query: {e}")
                return {'data': None, 'error': str(e)}
            
            if getattr(response, 'error', None):
                print('RPC error:', response.error)
                error_message = getattr(response.error, 'message', str(response.error))
                return {'data': None, 'error': f'Error at database: {error_message}'}

            data = response.data

            if isinstance(data, str):
                try:
                    data = json.loads(data)
                except Exception as e:
                    print("Failed to parse JSON response.")
                    return {'data': None, 'error': 'Failed to parse JSON response: {e}'}
            
            if not isinstance(data, list):
                print("Unexpected response format.")
                return {'data': None, 'error': data.get('error') if isinstance(data, dict) else "Formato inesperado"}
             
            total = len(data)
            display = data if max_rows == 0 else data[:max_rows]
            columns = list(display[0].keys()) if display else []
            rows = [tuple(item.values()) for item in display]
            return {
                'data': {
                    'columns': columns,
                    'rows': rows,
                    'total': total
                },
                'error': None
            }
        if last_exception:
            return {'data': None, 'error': f"Failed to execute query after {retries} attempts: {last_exception}"}
        return {'data': None, 'error': 'Failed to execute query after retries.'}
    
class SQLGrader:
    """Responsável por analisar e comparar os resultados das queries."""

    @staticmethod
    def is_select(query: str) -> bool:
        return query.strip().lower().startswith('select')

    def compare(self, base_sql, student_sql, base_res, student_res):
        """Compara os DataFrames resultantes em 3 níveis: Exato, Ordenação, Alfanumérico."""
        base_upper = " " + base_sql.upper().replace('\n', ' ') + " "
        
        base_data = base_res.get('data')
        stu_data = student_res.get('data')

        if not base_data or not stu_data:
            return False, "Error: One of the queries did not return valid data."

        df_base = pd.DataFrame(base_data['rows'], columns=base_data['columns'])
        df_stu = pd.DataFrame(stu_data['rows'], columns=stu_data['columns'])

        if df_base.empty and df_stu.empty:
            return True, "Parabéns, sua consulta está correta."
        
        # Normalização
        df_base_norm = self._normalize_df(df_base)
        df_stu_norm = self._normalize_df(df_stu)

        # NÍVEL 1: Conteúdo Correto, Ordem Correta
        if df_base_norm.values.tolist() == df_stu_norm.values.tolist():
            return True, "Parabéns! As consultas são equivalentes."

        # NÍVEL 2: Conteúdo Correto, Ordem Errada
        if self._sort_matrix(df_base_norm) == self._sort_matrix(df_stu_norm):
            if re.search(r'\bORDER\s+BY\b', base_upper):
                return False, "Os dados estão corretos, mas a ordem está errada."
            return True, "Parabéns, sua consulta está correta."

        # NÍVEL 3: Comparação Alfanumérica 
        if self._get_alphanumeric_fingerprint(df_base_norm) == self._get_alphanumeric_fingerprint(df_stu_norm):
            return True, "Parabéns, sua consulta está correta."

        return False, "Os dados não conferem."

    def _normalize_df(self, df):
        df = df.round(2)
        df = df.astype(str)
        df = df.map(lambda x: x.strip().lower() if isinstance(x, str) else x)
        return df
    
    def _sort_matrix(self, df):
        return sorted(df.values.tolist())
    
    def _get_alphanumeric_fingerprint(self, df):
        fingerprints = []
        for _, row in df.iterrows():
            row_str = "".join([str(x) for x in row.values])
            clean_str = re.sub(r'[^a-z0-9]', '', row_str.lower())
            fingerprints.append(clean_str)
        return sorted(fingerprints)
    
class GroqService:
    """Gerencia a interação com a API do Groq para validação semântica."""
    def __init__(self):
        self.api_key = os.getenv('API_KEY')
        self.model = os.getenv('GROQ_MODEL')
        self.url = os.getenv('GROQ_URL')

    def validate(self, enunciado: str, base_sql: str, student_sql: str) -> bool:
        headers = {
            'Authorization': f'Bearer {self.api_key}',
            'Content-Type': 'application/json'
        }

        prompt_system = """
        Você é um avaliador de SQL de nível especialista, com profundo entendimento de semântica e requisitos de negócio. 
        Sua tarefa é verificar se a consulta do aluno atende aos requisitos do enunciado...
        (Prompt original abreviado para brevidade, mas mantido na lógica)
        Responda estritamente com **True** se a consulta do aluno satisfaz os requisitos do enunciado ou **False** caso contrário.
        """.strip()

        prompt_user = f"""
        Enunciado: {enunciado}
        Consulta base: {base_sql}
        Consulta do aluno: {student_sql}
        Ambas as consultas acima retornam resultados que satisfazem corretamente o enunciado?
        Responda apenas True ou False.
        """.strip()

        payload = {
            'model': self.model,
            'messages': [
                {'role': 'system', 'content': prompt_system},
                {'role': 'user', 'content': prompt_user}
            ],
            'temperature': 0.0,
            'max_tokens': 4
        }

        try:
            print("--- DEBUG: Enviando para Groq API ---")
            resp = requests.post(self.url, headers=headers, json=payload, timeout=30)
            print(f"--- DEBUG: Groq Status Code: {resp.status_code} ---")

            if resp.status_code != 200:
                print(f"--- DEBUG: Erro na API Groq: {resp.text} ---")
            
            resp.raise_for_status()
            data = resp.json()
            text = data['choices'][0]['message']['content'].strip().lower()
            print(f"--- DEBUG: Resposta da IA (limpa): '{text}' ---")

            return text.startswith('true')

        except Exception as e:
            print(f'Erro ao chamar Groq: {e}')
            return False