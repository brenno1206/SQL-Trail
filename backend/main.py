from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import os
import requests
import time
import json
from supabase import create_client
import pandas as pd
import re

load_dotenv()

# Gerenciamento do groq
GROQ_API_KEY = os.getenv('API_KEY')
GROQ_MODEL = os.getenv('GROQ_MODEL')
GROQ_URL = os.getenv('GROQ_URL')

# Transforma a lista de questões em dicionário indexado por slug e ID
with open('questoes.json', encoding='utf-8') as f:
    lista = json.load(f)
QUESTOES = {
    # KEY: (slug, id) VALUE: question dict
    (db['slug'], q['id']): q
        for db in lista
        for q in db['questions']
}
print(f'Carregadas {len(QUESTOES)} questões de {len(lista)} bancos de dados.')


app = Flask(__name__)
CORS(app, origins=["http://localhost:3000", "http://127.0.0.1:3000"])

# Retorna True se a query for um SELECT
def is_select(query: str) -> bool:
    return query.strip().lower().startswith('select')

# Retorna o resultado da query via Supabase RPC
def supabase_query(supabase_client, sql: str, max_rows: int = 20, retries: int = 3, backoff: float = 1.0):
    sql = sql.strip().rstrip(';')
    last_exception = None
    for attempt in range(1, retries + 1):
        try:
            response = supabase_client.rpc('rpc_sql', {'p_query': sql}).execute()
        except Exception as e:
            last_exception = e
            if getattr(e, 'winerror', None) == 10054 and attempt < retries:
                print(f'Conexão resetada (tentativa {attempt}/{retries}), retry em {backoff}s…')
                time.sleep(backoff)
                backoff *= 2
                continue
            print('RPC exception:', e)

            return {'data': None, 'error': f'Exceção na chamada RPC: {e}'}

        if getattr(response, 'error', None):
            print('RPC error:', response.error)
            error_message = getattr(response.error, 'message', str(response.error))
            return {'data': None, 'error': f'Erro no Banco de Dados: {error_message}'}

        data = response.data

        if isinstance(data, str):
            try:
                data = json.loads(data)
            except Exception as e:
                print('JSON decode error:', e, data)
                return {'data': None, 'error': f'Erro ao decodificar JSON retornado pelo banco: {e}'}

        if not isinstance(data, list):
            print('RPC retornou formato inesperado:', type(data), data)
            return {'data': None, 'error': data['error']}

        total = len(data)
        display = data if max_rows == 0 else data[:max_rows]

        columns = list(display[0].keys()) if display else []

        rows = [tuple(item.values()) for item in display]

        return { 
            'data': {
            'columns': columns,
            'rows': rows,
            'total_rows': total
        },
        'error': None
        }
    if last_exception:
        return {'data': None, 'error': f'Falha na conexão após {retries} tentativas: {last_exception}'}
    
    return {'data': None, 'error': f'Falha na conexão após {retries} tentativas.'}

# Comparação da consulta SQL
def check_sql_structure(base_sql, student_sql):
    base_upper = " " + base_sql.upper().replace('\n', ' ') + " "
    stu_upper = " " + student_sql.upper().replace('\n', ' ') + " "

    keywords = [
        r'\sORDER\s+BY\s', 
        r'\sDISTINCT\s', 
        r'\sGROUP\s+BY\s', 
        r'\sLIMIT\s', 
        r'\sHAVING\s'
    ]
    warnings = []

    for pattern in keywords:
        # Se a base tem a keyword e o aluno não tem
        if re.search(pattern, base_upper) and not re.search(pattern, stu_upper):
            kw_readable = pattern.replace(r'\s', ' ').replace(r'+', '').strip()
            warnings.append(f"Parece que você esqueceu de usar o '{kw_readable}'.")

    if warnings:
        return False, " ".join(warnings)
    
    return True, None

# Comparação dos resultados
def compare_results(base_res, student_res):
    base_data = base_res.get('data')
    stu_data = student_res.get('data')

    if not base_data or not stu_data:
        return False, "Erro: Dados incompletos ou consulta retornou vazio."

    df_base = pd.DataFrame(base_data['rows'], columns=base_data['columns'])
    df_stu = pd.DataFrame(stu_data['rows'], columns=stu_data['columns'])

    if df_base.empty and df_stu.empty:
        return True, "Parabéns, sua consulta está correta."
    
    # Normalização básica
    def normalize_df(df):
        df = df.round(2)
        df = df.astype(str)
        df = df.map(lambda x: x.strip().lower() if isinstance(x, str) else x)
        return df

    df_base_norm = normalize_df(df_base)
    df_stu_norm = normalize_df(df_stu)

    # NÍVEL 1: Conteúdo Correto, Ordem Correta
    if df_base_norm.values.tolist() == df_stu_norm.values.tolist():
        return True, "Resultado perfeito! Dados e ordem corretos."

    # NÍVEL 2: Conteúdo Correto, Ordem Errada
    def sort_matrix(df):
        return sorted(df.values.tolist())

    if sort_matrix(df_base_norm) == sort_matrix(df_stu_norm):
        return False, "Os dados estão corretos, mas a ordem das linhas está errada."

    # NÍVEL 3: Ignora ordem das colunas
    def flatten_rows(df):
        flattened = []
        for _, row in df.iterrows():
            row_values = sorted([str(x) for x in row.values])
            flattened.append("".join(row_values))
        return sorted(flattened)

    if flatten_rows(df_base_norm) == flatten_rows(df_stu_norm):
        return False, "Os dados parecem corretos, mas verifique a ordem das colunas ou a ordenação das linhas."

    # NÍVEL 4: Comparação Alfanumérica 
    def get_alphanumeric_fingerprint(df):
        fingerprints = []
        for _, row in df.iterrows():
            row_str = "".join([str(x) for x in row.values])
            clean_str = re.sub(r'[^a-z0-9]', '', row_str.lower())
            fingerprints.append(clean_str)
        return sorted(fingerprints)

    if get_alphanumeric_fingerprint(df_base_norm) == get_alphanumeric_fingerprint(df_stu_norm):
        return True, "Parabéns! As consultas são equivalentes."

    return False, "Os dados não conferem."

#Validação semântica via Groq
def groq_validate(enunciado: str, base_sql: str, student_sql: str) -> bool:
    headers = {
        'Authorization': f'Bearer {GROQ_API_KEY}',
        'Content-Type': 'application/json'
    }

    prompt_system = """
    Você é um avaliador de SQL de nível especialista, com profundo entendimento de semântica e requisitos de negócio. 
    Sua tarefa é verificar se a consulta do aluno atende aos requisitos do enunciado — ou seja, se os dados retornados permitem deduzir corretamente as informações solicitadas, mesmo que:
    - o aluno use aliases diferentes;
    - retorne colunas separadas em vez de concatenadas (por exemplo, first_name e last_name em vez de uma coluna “nome completo”);
    - renomeie campos ou altere a ordem das colunas;
    - utilize operadores equivalentes ou formatações diversas.

    Por exemplo, se o enunciado pede “nome completo”, aceite tanto uma única coluna concatenada quanto duas colunas separadas que, juntas, permitam compor o nome completo.  

    Responda estritamente com **True** se a consulta do aluno satisfaz os requisitos do enunciado ou **False** caso contrário, sem qualquer outra palavra, pontuação ou explicação.
    """.strip()

    prompt_user = f"""
    Enunciado: {enunciado}
    Consulta base: {base_sql}
    Consulta do aluno: {student_sql}
    Ambas as consultas acima retornam resultados que satisfazem corretamente o enunciado?
    Responda apenas True ou False.
    """.strip()

    payload = {
        'model': GROQ_MODEL,
        'messages': [
            {'role': 'system', 'content': prompt_system},
            {'role': 'user', 'content': prompt_user}
        ],
        'temperature': 0.0,
        'max_tokens': 4
    }

    try:
        print("--- DEBUG: Enviando para Groq API ---")
        resp = requests.post(GROQ_URL, headers=headers, json=payload, timeout=30)

        print(f"--- DEBUG: Groq Status Code: {resp.status_code} ---")

        if resp.status_code != 200:
            print(f"--- DEBUG: Erro na API Groq: {resp.text} ---")

        resp.raise_for_status()

        data = resp.json()
        text = data['choices'][0]['message']['content'].strip().lower()

        print(f"--- DEBUG: Resposta da IA (limpa): '{text}' ---")

        return text.startswith('true')

    except requests.exceptions.HTTPError as http_err:
        print(f"Erro HTTP na API Groq: {http_err}")
        print(f"Resposta completa do erro: {resp.text}")
    except Exception as e:
        print(f'Erro desconhecido ao chamar Groq: {e}')

    return False

app.secret_key = os.getenv('FLASK_SECRET_KEY')

# Endpoint para listar questões disponíveis com base no slug
@app.route('/questions')
def questions():
    slug = request.args.get('slug') 

    if slug is None:
        return jsonify({'error': 'Parâmetro slug é obrigatório.'}), 400

    question_list = [
        {'id': q['id'], 'slug': slug, 'enunciado': q['enunciado']}
        for key, q in QUESTOES.items()
        if key[0] == slug
    ]
    return jsonify(question_list)

# Endpoint para validação da consulta do aluno
# Retorna JSON com resultado da validação
@app.route('/validate', methods=['POST'])
def validate():
    data = request.get_json() or {}
    slug = data.get('slug')
    question_id = data.get('question_id')

    if slug is None or question_id is None or (slug, question_id) not in QUESTOES:
        return jsonify({'valid': False, 'error': 'Questão inválida ou não carregada.'}), 400

    # Carrega credenciais do Supabase específicas para o slug
    SUPABASE_URL = os.getenv('SUPABASE_URL_' + slug.upper().replace('-', '_'))
    SUPABASE_KEY = os.getenv('SUPABASE_KEY_' + slug.upper().replace('-', '_'))
    if not SUPABASE_URL or not SUPABASE_KEY:
        return jsonify({'error': f'Credenciais para o slug {slug} não encontradas.'}), 404
    supabase_client = create_client(SUPABASE_URL, SUPABASE_KEY)

    
    q = QUESTOES[(slug, question_id)]
    base_sql = q['resposta_base']
    enunciado = q['enunciado']
    student_sql = data.get('student_sql', '').strip()

    # 0) Verifica se consulta está vazia
    if not student_sql:
        return jsonify({'valid': False, 'error': 'Sua Consulta está em branco.', 'enunciado': enunciado}), 400

    # 1) Valida SELECT
    if not is_select(student_sql):
        return jsonify({'valid': False, 'error': 'Sua consulta não inicia com SELECT.', 'enunciado': enunciado}), 200

    # 2) Validação de sintaxe/semântica via Supabase
    stu_res = supabase_query(supabase_client, student_sql)
    if stu_res['error']:
        return jsonify({'valid': False, 'error': stu_res['error'], 'enunciado': enunciado}), 200
    base_res = supabase_query(supabase_client, base_sql)
    if base_res['error']:
        error_msg = f"Erro ao executar consulta base: {base_res['error']}"
        return jsonify({'valid': False, 'error': error_msg, 'enunciado': enunciado}), 500
    
    # 3) Verificação de estrutura SQL
    struct_ok, struct_msg = check_sql_structure(base_sql, student_sql)
    if not struct_ok:
        return jsonify({
            'valid': False, 
            'error': struct_msg,
            'enunciado': enunciado,
            'result_table': stu_res,
            'expected_table': base_res
        }), 200

    # 3.5) Validação de resultados exatos
    match_data, match_msg = compare_results(base_res, stu_res)
    if match_data:
        payload = {
            'valid': True,
            'message': f'Parabéns! {match_msg}',
            'enunciado': enunciado,
            'result_table': stu_res,
            'expected_table': base_res
        }
        return jsonify(payload), 200
    else:
        if "ordem das linhas" in match_msg:
             return jsonify({
                'valid': False,
                'error': match_msg, 
                'enunciado': enunciado,
                'result_table': stu_res,
                'expected_table': base_res
            }), 200
    
    # 4) Último caso: Validação semântica com Groq
    equivalent = groq_validate(enunciado, base_sql, student_sql)
    payload = {'valid': equivalent, 'enunciado': enunciado}
    if equivalent:
        payload['message'] = 'GROQ: Parabéns! Sua consulta está correta e atende aos requisitos.'
    else:
        payload['error'] = 'GROQ: Seu resultado não está correto, as consultas não são equivalentes.'

    if stu_res['data']:
        payload['result_table'] = stu_res
    if base_res['data']:
        payload['expected_table'] = base_res

    return jsonify(payload)

if __name__ == '__main__':
    app.run(debug=True, port=5000)

