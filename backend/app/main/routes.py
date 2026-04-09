from flask import request, jsonify, Blueprint
from flask_jwt_extended import get_jwt_identity, get_jwt
from .services import ScenarioDatabaseService, QuestionService, SubmissionService, SupabaseService, SQLGrader
from app.auth.decorators import role_required

bp = Blueprint('main', __name__)

def serialize_question(q):
    return {
        "id": q.id,
        "scenario_database_id": q.scenario_database_id,
        "statement": q.statement,
        "expected_query": q.expected_query,
        "question_number": q.question_number,
        "is_special": q.is_special
    }

def serialize_submission(s):
    return {
        "id": s.id,
        "student_id": s.student_id,
        "question_id": s.question_id,
        "time_spent_seconds": s.time_spent_seconds,
        "student_sql": s.student_sql,
        "is_correct": s.is_correct,
        "feedback": s.feedback,
        "timestamp": s.timestamp.isoformat()
    }

def serialize_scenario(s):
    return {
        "id": s.id,
        "slug": s.slug,
        "name": s.name,
        "diagram_url": s.diagram_url
    }

# --- ROTAS DE SCENARIO DATABASES ---

@bp.route('/scenarios', methods=['GET'])
def get_scenarios():
    success, result = ScenarioDatabaseService.get_all_scenarios()
    if success:
        return jsonify([serialize_scenario(s) for s in result]), 200
    return jsonify({"error": result}), 500

@bp.route('/scenarios', methods=['POST'])
@role_required('admin', 'teacher')
def create_scenario():
    data = request.get_json() or {}
    success, result = ScenarioDatabaseService.create_scenario(data)
    if success:
        return jsonify(serialize_scenario(result)), 201
    return jsonify({"error": result}), 400

@bp.route('/scenarios/<slug>', methods=['GET'])
def get_scenario(slug):
    success, result = ScenarioDatabaseService.get_scenario_by_slug(slug)
    if success:
        return jsonify(serialize_scenario(result)), 200
    return jsonify({"error": result}), 404

@bp.route('/scenarios/<slug>', methods=['PUT'])
@role_required('admin', 'teacher')
def update_scenario(slug):
    data = request.get_json() or {}
    success, result = ScenarioDatabaseService.update_scenario(slug, data)
    if success:
        return jsonify(serialize_scenario(result)), 200
    return jsonify({"error": result}), 400

@bp.route('/scenarios/<slug>', methods=['DELETE'])
@role_required('admin', 'teacher')
def delete_scenario(slug):
    success, result = ScenarioDatabaseService.delete_scenario(slug)
    if success:
        return jsonify({"msg": result}), 200
    return jsonify({"error": result}), 400

# --- ROTAS DE QUESTÕES (CRUD) ---

@bp.route('/questions', methods=['GET'])
def get_all_questions():
    success, result = QuestionService.get_all_questions()
    if success:
        return jsonify([serialize_question(q) for q in result]), 200
    return jsonify({"error": result}), 500

@bp.route('/questions', methods=['POST'])
@role_required('admin', 'teacher')
def create_question():
    data = request.get_json() or {}
    success, result = QuestionService.create_question(data)
    if success:
        return jsonify(serialize_question(result)), 201
    return jsonify({"error": result}), 400

@bp.route('/questions/<int:question_id>', methods=['GET'])
def get_question(question_id):
    success, result = QuestionService.get_question_by_id(question_id)
    if success:
        return jsonify(serialize_question(result)), 200
    return jsonify({"error": result}), 404

@bp.route('/questions/<int:question_id>', methods=['PUT'])
@role_required('admin', 'teacher')
def update_question(question_id):
    data = request.get_json() or {}
    success, result = QuestionService.update_question(question_id, data)
    if success:
        return jsonify(serialize_question(result)), 200
    return jsonify({"error": result}), 400

@bp.route('/questions/<int:question_id>', methods=['DELETE'])
@role_required('admin', 'teacher')
def delete_question(question_id):
    success, result = QuestionService.delete_question(question_id)
    if success:
        return jsonify({"msg": result}), 200
    return jsonify({"error": result}), 400


# --- ROTAS ESPECÍFICAS DE CENÁRIO ---

@bp.route('/questions/<slug>', methods=['GET'])
def get_questions_by_scenario(slug):
    success_scenario, scenario = ScenarioDatabaseService.get_scenario_by_slug(slug)
    if not success_scenario:
        return jsonify({"error": scenario}), 404
        
    success, result = QuestionService.get_questions_by_scenario(scenario.id)
    if success:

        return jsonify( [serialize_question(q) for q in result]), 200
    return jsonify({"error": result}), 500

@bp.route('/questions/<slug>/special', methods=['GET'])
def get_special_questions(slug):
    success_scenario, scenario = ScenarioDatabaseService.get_scenario_by_slug(slug)
    if not success_scenario:
        return jsonify({"error": scenario}), 404

    success, result = QuestionService.get_special_questions(scenario.id)
    if success:
        return jsonify([serialize_question(q) for q in result]), 200
    return jsonify({"error": result}), 500

@bp.route('/questions/<slug>/not-special', methods=['GET'])
def get_not_special_questions(slug):
    success_scenario, scenario = ScenarioDatabaseService.get_scenario_by_slug(slug)
    if not success_scenario:
        return jsonify({"error": scenario}), 404

    success, result = QuestionService.get_not_special_questions(scenario.id)
    if success:
        return jsonify([serialize_question(q) for q in result]), 200
    return jsonify({"error": result}), 500

@bp.route('/scenarios/<slug>/special-completed', methods=['GET'])
@role_required('student')
def check_special_completion(slug):
    student_id = get_jwt_identity()
    
    success_scenario, scenario = ScenarioDatabaseService.get_scenario_by_slug(slug)
    if not success_scenario:
        return jsonify({"error": scenario}), 404

    success, result = SubmissionService.check_special_completion(student_id, scenario.id)
    if success:
        return jsonify(result), 200
    return jsonify({"error": result}), 500


# --- ROTA DE VALIDAÇÃO ---

@bp.route('/validate', methods=['POST'])
@role_required('student')
def validate():
    claims = get_jwt()
    student_id = claims.get('user_id')
    data = request.get_json() or {}
    slug = data.get('slug')
    q_id = data.get('question_id')
    time_spent = data.get('time_spent_seconds', 0)
    student_sql = (data.get('student_sql') or '').strip()

    if not all([slug, q_id]):
        return jsonify({'valid': False, 'error': 'Parâmetros slug e question_id são obrigatórios.'}), 400

    success_q, question_data = QuestionService.get_question_by_id(q_id)
    if not success_q:
        return jsonify({'valid': False, 'error': 'Questão não encontrada.'}), 404

    statement = question_data.statement
    expected_sql = question_data.expected_query

    if not student_sql:
        return jsonify({'valid': False, 'error': 'Sua consulta está em branco.', 'statement': statement}), 400
    
    is_safe, safe_msg = SQLGrader.is_safe_query(student_sql)
    if not is_safe:
        return jsonify({'valid': False, 'error': safe_msg, 'statement': statement}), 200

    client = SupabaseService.get_client(slug)
    if not client:
        return jsonify({'error': f'Credenciais para o slug {slug} não encontradas.'}), 404

    stu_res = SupabaseService.execute_query(client, student_sql, max_rows=0)
    if stu_res.get('error'):
        SubmissionService.save_submission(student_id, q_id, time_spent, student_sql, False, stu_res['error'])
        return jsonify({'valid': False, 'error': stu_res['error'], 'statement': statement}), 200
        
    base_res = SupabaseService.execute_query(client, expected_sql, max_rows=0)
    if base_res.get('error'):
        return jsonify({'valid': False, 'error': f"Erro na base: {base_res['error']}", 'statement': statement}), 500

    is_valid, msg = SQLGrader.compare(expected_sql, student_sql, base_res, stu_res)
    
    success_save, save_msg = SubmissionService.save_submission(student_id, q_id, time_spent, student_sql, is_valid, msg)
    if not success_save:
        return jsonify({'valid': False, 'error': f"Erro ao salvar submissão: {save_msg}", 'statement': statement}), 500
    return jsonify({
        'valid': is_valid,
        'message': msg if is_valid else None,
        'error': msg if not is_valid else None,
        'statement': statement,
        'result_table': stu_res,
        'expected_table': base_res
    }), 200

@bp.route('/validate/skip', methods=['POST'])
@role_required('student')
def skip_question_route():
    claims = get_jwt()
    student_id = claims.get('user_id')
    data = request.get_json() or {}
    question_id = data.get('question_id')
    
    success, msg = SubmissionService.skip_question(student_id, question_id)
    if success: return jsonify({"valid": True, "message": msg}), 200
    return jsonify({"error": msg}), 400

@bp.route('/validate/testing', methods=['POST'])
@role_required('teacher', 'admin')
def validate_testing():
    data = request.get_json() or {}
    slug = data.get('slug')
    q_id = data.get('question_id')
    testing_sql = (data.get('testing_sql') or '').strip()

    if not all([slug, q_id]):
        return jsonify({'valid': False, 'error': 'Parâmetros slug e question_id são obrigatórios.'}), 400

    success_q, question_data = QuestionService.get_question_by_id(q_id)
    if not success_q:
        return jsonify({'valid': False, 'error': 'Questão não encontrada.'}), 404

    statement = question_data.statement
    expected_sql = question_data.expected_query

    if not testing_sql:
        return jsonify({'valid': False, 'error': 'Sua consulta está em branco.', 'statement': statement}), 400
    
    is_safe, safe_msg = SQLGrader.is_safe_query(testing_sql)
    if not is_safe:
        return jsonify({'valid': False, 'error': safe_msg, 'statement': statement}), 200

    client = SupabaseService.get_client(slug)
    if not client:
        return jsonify({'error': f'Credenciais para o slug {slug} não encontradas.'}), 404

    testing_res = SupabaseService.execute_query(client, testing_sql, max_rows=0)
    if testing_res.get('error'):
        return jsonify({'valid': False, 'error': testing_res['error'], 'statement': statement}), 200      
    base_res = SupabaseService.execute_query(client, expected_sql, max_rows=0)
    if base_res.get('error'):
        return jsonify({'valid': False, 'error': f"Erro na base: {base_res['error']}", 'statement': statement}), 500

    is_valid, msg = SQLGrader.compare(expected_sql, testing_sql, base_res, testing_res)
    
    return jsonify({
        'valid': is_valid,
        'message': msg if is_valid else None,
        'error': msg if not is_valid else None,
        'statement': statement,
        'result_table': testing_res,
        'expected_table': base_res
    }), 200