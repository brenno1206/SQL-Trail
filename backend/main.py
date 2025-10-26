from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import os
import requests
import time
import json
import random
from supabase import create_client

load_dotenv()
SUPABASE_URL = os.getenv('SUPABASE_URL')
SUPABASE_KEY = os.getenv('SUPABASE_KEY')
supabase = create_client(SUPABASE_URL, SUPABASE_KEY)
GROQ_API_KEY = os.getenv('API_KEY')
GROQ_MODEL = os.getenv('GROQ_MODEL')
GROQ_URL = os.getenv('GROQ_URL')

with open('questoes.json', encoding='utf-8') as f:
    lista = json.load(f)
QUESTOES = {q['id']: q for q in lista}

app = Flask(__name__)
CORS(app)

def is_select(query: str) -> bool:
    return query.strip().lower().startswith('select')

def supabase_query(sql: str, max_rows: int = 20, retries: int = 3, backoff: float = 1.0):
    sql = sql.strip().rstrip(';')
    for attempt in range(1, retries + 1):
        try:
            response = supabase.rpc('rpc_sql', {'p_query': sql}).execute()
        except Exception as e:
            if getattr(e, 'winerror', None) == 10054 and attempt < retries:
                print(f'Conexão resetada (tentativa {attempt}/{retries}), retry em {backoff}s…')
                time.sleep(backoff)
                backoff *= 2
                continue
            print('RPC exception:', e)
            return None

        if getattr(response, 'error', None):
            print('RPC error:', response.error)
            return None

        data = response.data

        if isinstance(data, str):
            try:
                data = json.loads(data)
            except Exception as e:
                print('JSON decode error:', e, data)
                return None

        if not isinstance(data, list):
            print('RPC retornou formato inesperado:', type(data), data)
            return None

        total = len(data)
        display = data if max_rows == 0 else data[:max_rows]

        columns = list(display[0].keys()) if display else []

        rows = [tuple(item.values()) for item in display]

        return {
            'columns': columns,
            'rows': rows,
            'total_rows': total
        }

    return None

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
        'max_tokens': 10
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

# Retorna JSON da questão
@app.route('/question')
def question():
    global CURRENT_QUESTION_ID
    q = random.choice(list(QUESTOES.values()))
    CURRENT_QUESTION_ID = q['id']
    return jsonify({'id': q['id'], 'enunciado': q['enunciado']})
''' 
@app.route('/')
def index():
    return render_template('index.html')
'''

# Retorna JSON
@app.route('/validate', methods=['POST'])
def validate():
    data = request.get_json() or {}

    question_id = data.get('question_id')

    if question_id is None or question_id not in QUESTOES:
        return jsonify({'valid': False, 'error': 'Questão inválida ou não carregada.'}), 400

    q = QUESTOES[question_id]
    base_sql = q['resposta_base']
    enunciado = q['enunciado']
    student_sql = data.get('student_sql', '').strip()

    if not student_sql:
        return jsonify({'valid': False, 'error': 'Falta consulta do aluno.', 'enunciado': enunciado}), 400

    # 1) Valida SELECT
    if not is_select(student_sql):
        return jsonify({'valid': False, 'error': 'Consulta não inicia com SELECT.', 'enunciado': enunciado}), 200

    # 2) Validação de sintaxe/semântica via Supabase
    stu_res = supabase_query(student_sql)
    if stu_res is None:
        return jsonify({'valid': False, 'error': 'Erro na execução da consulta (sintaxe ou semântica).', 'enunciado': enunciado}), 200

    # 3) Valida número de linhas
    base_res = supabase_query(base_sql)
    if base_res is None:
        return jsonify({'valid': False, 'error': 'Erro na execução da consulta base.', 'enunciado': enunciado}), 500

    if stu_res['total_rows'] != base_res['total_rows']:
        msg = f'Número de linhas diferente (esperado {base_res["total_rows"]} vs obtido {stu_res["total_rows"]}).'
        payload = {
            'valid': False,
            'error': msg,
            'enunciado': enunciado,
            'result_table':    stu_res,
            'expected_table':  base_res
        }
        return jsonify(payload), 200

                        
    # 4) Validação semântica com Groq
    equivalent = groq_validate(enunciado, base_sql, student_sql)
    payload = {'valid': equivalent, 'enunciado': enunciado}
    if equivalent:
        payload['message'] = 'OK'
    else:
        payload['error'] = 'Consultas não são equivalentes.'

    if stu_res:
        payload['result_table'] = stu_res
    if base_res:
        payload['expected_table'] = base_res

    return jsonify(payload)

if __name__ == '__main__':
    app.run(debug=True, port=5000)
