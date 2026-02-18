from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import os
from services import QuestionRepository, SupabaseService, SQLGrader

load_dotenv()

app = Flask(__name__)
CORS(app, origins=["http://localhost:3000", "http://127.0.0.1:3000"])
app.secret_key = os.getenv('FLASK_SECRET_KEY')

repo = QuestionRepository()
db_service = SupabaseService()
grader = SQLGrader()


@app.route('/questions')
def questions():
    slug = request.args.get('slug') 
    if slug is None:
        return jsonify({'error': 'Parâmetro slug é obrigatório.'}), 400

    question_list = repo.get_questions(slug)
    return jsonify(question_list)

@app.route('/validate', methods=['POST'])
def validate():
    data = request.get_json() or {}
    slug, q_id = data.get('slug'), data.get('question_id')

    # 1. Validações iniciais (Input e Existência)
    if not all([slug, q_id]) or not repo.exists(slug, q_id):
        return jsonify({'valid': False, 'error': 'Questão inválida ou não carregada.'}), 400

    q_data = repo.get_question(slug, q_id)
    enunciado = q_data['enunciado']
    student_sql = data.get('student_sql', '').strip()

    # 2. Validações da Consulta do Aluno
    if not student_sql:
        return jsonify({'valid': False, 'error': 'Sua Consulta está em branco.', 'enunciado': enunciado}), 400
    
    if not grader.is_select(student_sql):
        return jsonify({'valid': False, 'error': 'Sua consulta não inicia com SELECT.', 'enunciado': enunciado}), 200

    # 3. Configuração do Supabase
    client = db_service.get_client(slug)
    if not client:
        return jsonify({'error': f'Credenciais para o slug {slug} não encontradas.'}), 404

    # 4. Execução das Queries
    stu_res = db_service.execute_query(client, student_sql)
    if stu_res.get('error'):
        return jsonify({'valid': False, 'error': stu_res['error'], 'enunciado': enunciado}), 200
        
    base_res = db_service.execute_query(client, q_data['resposta_base'])
    if base_res.get('error'):
        return jsonify({'valid': False, 'error': f"Erro na base: {base_res['error']}", 'enunciado': enunciado}), 500

    # 5. Comparação e Resposta Final
    is_valid, msg = grader.compare(q_data['resposta_base'], student_sql, base_res, stu_res)
    
    return jsonify({
        'valid': is_valid,
        'message': msg if is_valid else None,
        'error': msg if not is_valid else None,
        'enunciado': enunciado,
        'result_table': stu_res,
        'expected_table': base_res
    }), 200
if __name__ == '__main__':
    app.run(debug=True, port=5000)
