"""
Análise e correção de consultas SQL (SQLGrader).

A correção compara o resultado da consulta do aluno com o do gabarito em três níveis de rigor:
  1. Estrutural exato: mesmas colunas, mesmas linhas, na mesma ordem.
  2. Ordem flexível: mesmas linhas em qualquer ordem (exceto quando o gabarito exige ORDER BY).
  3. Busca flexível avançada: cada coluna do gabarito é encontrada em uma coluna do aluno, de
     modo que submissões com colunas extras ou em outra ordem/apelido ainda sejam aceitas,
     desde que os dados exigidos estejam presentes linha a linha.
"""
import math
import re
from decimal import Decimal

# Palavras-chave que não podem aparecer fora de literais em uma consulta de aluno.
_BLOCKED_KEYWORDS = {
    'DROP', 'DELETE', 'UPDATE', 'INSERT', 'ALTER', 'TRUNCATE', 'GRANT', 'REVOKE', 'EXEC',
    'EXECUTE', 'CREATE', 'CALL', 'DO', 'COPY', 'MERGE', 'VACUUM', 'LOCK', 'SET', 'RESET',
    'COMMENT', 'REFRESH', 'LISTEN', 'NOTIFY', 'UNLISTEN', 'PREPARE', 'DEALLOCATE', 'DISCARD',
    'REINDEX', 'CLUSTER', 'SECURITY', 'IMPORT', 'ANALYZE', 'CHECKPOINT', 'LOAD',
}
# Funções com efeito colateral ou acesso ao servidor (chamadas seguidas de "(").
_BLOCKED_FUNCTION_PATTERNS = [
    re.compile(r'^pg_\w+$'), re.compile(r'^lo_\w+$'), re.compile(r'^dblink\w*$'),
    re.compile(r'^(set_config|setval|nextval|txid_current|current_setting|query_to_xml\w*|'
               r'table_to_xml\w*|cursor_to_xml\w*|database_to_xml\w*|schema_to_xml\w*)$'),
]


class SQLAnalysis:
    """Resultado da tokenização de uma consulta (fora de literais e comentários)."""

    def __init__(self, cleaned, words, has_inner_semicolon, top_level_order_by, function_calls, error=None):
        self.cleaned = cleaned
        self.words = words
        self.has_inner_semicolon = has_inner_semicolon
        self.top_level_order_by = top_level_order_by
        self.function_calls = function_calls
        self.error = error


def analyze_sql(query):
    """
    Remove comentários, identifica palavras fora de literais, ponto e vírgula fora de literais
    e se existe ORDER BY no nível mais externo da consulta (fora de parênteses).

    Suporta: 'strings' (com '' escapado), E'strings' (com \\ escapado), "identificadores",
    $tag$dollar quoting$tag$, comentários -- e /* */ (aninhados, como no PostgreSQL).
    """
    out = []
    words = []          # (palavra_em_maiúsculas, profundidade_de_parênteses)
    function_calls = []
    semicolons = []     # posições no texto limpo
    depth = 0
    i, n = 0, len(query)
    error = None

    while i < n:
        ch = query[i]
        nxt = query[i + 1] if i + 1 < n else ''

        # Comentário de linha
        if ch == '-' and nxt == '-':
            j = query.find('\n', i)
            i = n if j == -1 else j
            out.append(' ')
            continue
        # Comentário de bloco (aninhável)
        if ch == '/' and nxt == '*':
            level, j = 1, i + 2
            while j < n and level:
                if query.startswith('/*', j):
                    level, j = level + 1, j + 2
                elif query.startswith('*/', j):
                    level, j = level - 1, j + 2
                else:
                    j += 1
            if level:
                error = "Comentário /* sem fechamento */."
            i = j
            out.append(' ')
            continue
        # String com escape estilo C: E'...'
        if ch in 'eE' and nxt == "'" and (i == 0 or not (query[i - 1].isalnum() or query[i - 1] == '_')):
            j = i + 2
            while j < n:
                if query[j] == '\\':
                    j += 2
                    continue
                if query[j] == "'":
                    if j + 1 < n and query[j + 1] == "'":
                        j += 2
                        continue
                    break
                j += 1
            if j >= n:
                error = "Texto entre aspas simples sem fechamento."
            out.append(query[i:j + 1])
            i = j + 1
            continue
        # String padrão '...' ou identificador "..."
        if ch in ("'", '"'):
            j = i + 1
            while j < n:
                if query[j] == ch:
                    if j + 1 < n and query[j + 1] == ch:
                        j += 2
                        continue
                    break
                j += 1
            if j >= n:
                error = "Texto entre aspas sem fechamento."
            if ch == '"' and re.match(r'\s*\(', query[j + 1:]):
                # Identificador entre aspas usado como função: "pg_sleep"(1)
                function_calls.append(query[i + 1:j].replace('""', '"').lower())
            out.append(query[i:j + 1])
            i = j + 1
            continue
        # Dollar quoting $tag$...$tag$
        if ch == '$':
            m = re.match(r'\$([A-Za-z_][A-Za-z0-9_]*)?\$', query[i:])
            if m:
                tag = m.group(0)
                j = query.find(tag, i + len(tag))
                if j == -1:
                    error = "Texto delimitado por $ sem fechamento."
                    j = n
                end = min(n, j + len(tag))
                out.append(query[i:end])
                i = end
                continue
        if ch == '(':
            depth += 1
        elif ch == ')':
            depth = max(0, depth - 1)
        elif ch == ';':
            semicolons.append(len(''.join(out)))
        if ch.isalpha() or ch == '_':
            m = re.match(r'[A-Za-z_][A-Za-z0-9_$]*', query[i:])
            word = m.group(0)
            words.append((word.upper(), depth))
            rest = query[i + len(word):]
            if re.match(r'\s*\(', rest):
                function_calls.append(word.lower())
            out.append(word)
            i += len(word)
            continue
        out.append(ch)
        i += 1

    cleaned = ''.join(out)
    # Ponto e vírgula apenas no final é aceito (e removido).
    stripped = cleaned.rstrip()
    trailing = 0
    while stripped.endswith(';'):
        stripped = stripped[:-1].rstrip()
        trailing += 1
    has_inner_semicolon = len(semicolons) > trailing
    if not has_inner_semicolon:
        cleaned = stripped

    top_level_order_by = any(
        w == 'ORDER' and d == 0 and k + 1 < len(words) and words[k + 1][0] == 'BY'
        for k, (w, d) in enumerate(words)
    )
    return SQLAnalysis(cleaned.strip(), words, has_inner_semicolon, top_level_order_by, function_calls, error)


def top_level_order_by(query):
    """True se a consulta possui ORDER BY no nível externo (ignora OVER(...) e subconsultas)."""
    return analyze_sql(query or '').top_level_order_by


class SQLGrader:
    """Responsável por validar e comparar os resultados das queries."""

    @staticmethod
    def is_safe_query(query: str) -> tuple:
        """
        Verifica se a consulta pode ser executada no cenário.
        Retorna (seguro: bool, mensagem: str, consulta_limpa: str).
        """
        analysis = analyze_sql(query or '')
        cleaned = analysis.cleaned
        if analysis.error:
            return False, analysis.error, cleaned
        if not cleaned:
            return False, "Sua consulta está em branco.", cleaned
        first_word = analysis.words[0][0] if analysis.words else ''
        if first_word not in ('SELECT', 'WITH'):
            return False, "Sua consulta deve iniciar com SELECT ou WITH.", cleaned
        if analysis.has_inner_semicolon:
            return False, "Apenas uma instrução SQL é permitida por vez.", cleaned
        for word, _ in analysis.words:
            if word in _BLOCKED_KEYWORDS:
                return False, f"Uso de comando não permitido: {word}", cleaned
        for fn in analysis.function_calls:
            if any(p.match(fn) for p in _BLOCKED_FUNCTION_PATTERNS):
                return False, f"Uso de função não permitida: {fn}", cleaned
        return True, "Valid.", cleaned

    # ------------------------------------------------------------------
    # Comparação de resultados
    # ------------------------------------------------------------------

    @staticmethod
    def _canon(value):
        """Normaliza uma célula: números arredondados a 2 casas, textos sem espaços e minúsculos."""
        if value is None:
            return '\x00null'
        if isinstance(value, bool):
            return 'true' if value else 'false'
        if isinstance(value, (int, float, Decimal)):
            return SQLGrader._canon_number(float(value))
        if isinstance(value, (list, dict)):
            return str(value).strip().lower()
        text_value = str(value).strip()
        if re.fullmatch(r'[+-]?(\d+\.?\d*|\.\d+)([eE][+-]?\d+)?', text_value):
            return SQLGrader._canon_number(float(text_value))
        return text_value.lower()

    @staticmethod
    def _canon_number(number):
        if math.isnan(number) or math.isinf(number):
            return str(number)
        rounded = round(number, 2)
        if rounded == 0:
            rounded = 0.0
        text_value = f"{rounded:.2f}".rstrip('0').rstrip('.')
        return text_value

    @staticmethod
    def _matrix(result):
        return [[SQLGrader._canon(v) for v in row] for row in result['rows']]

    @staticmethod
    def compare(base_sql, student_sql, base_res, student_res):
        base_data = (base_res or {}).get('data')
        stu_data = (student_res or {}).get('data')

        if base_data is None or stu_data is None:
            return False, "Erro. Uma das queries não retornou dados válidos."

        if base_data['total'] != stu_data['total']:
            return False, (f"O número de linhas retornadas difere. "
                           f"Esperado: {base_data['total']}, Recebido: {stu_data['total']}.")

        order_required = top_level_order_by(base_sql)
        base = SQLGrader._matrix(base_data)
        stu = SQLGrader._matrix(stu_data)
        n_base_cols = len(base_data['columns'])
        n_stu_cols = len(stu_data['columns'])

        if not base and not stu:
            return True, "Parabéns! As consultas são equivalentes."

        if n_stu_cols < n_base_cols:
            return False, (f"Faltam colunas no resultado. Esperado: {n_base_cols}, "
                           f"Recebido: {n_stu_cols}.")

        same_width = n_stu_cols == n_base_cols
        # Nível 1: estrutural exato
        if same_width and base == stu:
            return True, "Parabéns! As consultas são equivalentes."
        # Nível 2: ordem flexível
        if same_width and sorted(base) == sorted(stu):
            if order_required:
                return False, "Os dados estão corretos, mas a ordem está errada."
            return True, "Parabéns! As consultas são equivalentes."
        # Nível 3: busca flexível avançada (colunas extras ou em outra posição)
        verdict = SQLGrader._column_mapping_match(base, stu, n_base_cols, n_stu_cols, order_required)
        if verdict == 'match':
            extra = n_stu_cols - n_base_cols
            note = f" (as {extra} coluna(s) extra(s) foram desconsideradas)" if extra else ""
            return True, f"Parabéns! As consultas são equivalentes{note}."
        if verdict == 'order':
            return False, "Os dados estão corretos, mas a ordem está errada."
        return False, "Os dados não conferem."

    @staticmethod
    def _column_mapping_match(base, stu, n_base_cols, n_stu_cols, order_required, max_steps=20000):
        """
        Procura uma associação injetiva coluna_do_gabarito -> coluna_do_aluno em que a projeção
        das linhas do aluno seja igual às linhas do gabarito. Retorna 'match', 'order' ou None.
        """
        base_cols = [sorted(row[j] for row in base) for j in range(n_base_cols)]
        stu_cols = [sorted(row[k] for row in stu) for k in range(n_stu_cols)]
        candidates = [[k for k in range(n_stu_cols) if stu_cols[k] == base_cols[j]] for j in range(n_base_cols)]
        if any(not c for c in candidates):
            return None

        base_sorted = sorted(base)
        found_unordered = False
        steps = 0
        mapping = []
        used = set()

        def search(j):
            nonlocal steps, found_unordered
            steps += 1
            if steps > max_steps:
                return None
            if j == n_base_cols:
                projected = [[row[k] for k in mapping] for row in stu]
                if projected == base:
                    return 'match'
                if sorted(projected) == base_sorted:
                    if not order_required:
                        return 'match'
                    found_unordered = True
                return None
            for k in candidates[j]:
                if k in used:
                    continue
                used.add(k)
                mapping.append(k)
                result = search(j + 1)
                mapping.pop()
                used.discard(k)
                if result == 'match':
                    return result
            return None

        if search(0) == 'match':
            return 'match'
        return 'order' if found_unordered else None
