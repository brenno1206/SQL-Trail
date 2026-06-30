from flask import request, jsonify, Blueprint
from flask_jwt_extended import get_jwt_identity, get_jwt
from app.services.submission_service import ScenarioDatabaseService, QuestionService, SubmissionService, SupabaseService, SQLGrader
from app.utils.decorators import role_required

submission_bp = Blueprint('main', __name__)

# =========================================================================
# SERIALIZADORES
# =========================================================================

def serialize_question(q):
    """Converte um objeto Question em um dicionário para resposta JSON."""
    if not q: return None
    return {
        "id": q.id,
        "scenario_database_id": q.scenario_database_id,
        "statement": q.statement,
        "expected_query": q.expected_query,
        "question_order": q.question_order,
        "difficulty": q.difficulty,
        "is_special": q.is_special
    }

def serialize_submission(s):
    """Converte um objeto Submission em um dicionário para resposta JSON."""
    return {
        "id": s.id,
        "student_id": s.student_id,
        "question_id": s.question_id,
        "adaptive_session_id": s.adaptive_session_id,
        "time_spent_seconds": s.time_spent_seconds,
        "submitted_query": s.submitted_query,
        "is_correct": s.is_correct,
        "is_skipped": s.is_skipped,
        "attempt_number": s.attempt_number,
        "execution_output": s.execution_output,
        "submitted_at": s.submitted_at.isoformat() if s.submitted_at else None
    }

def serialize_scenario(s):
    """Converte um objeto ScenarioDatabase em um dicionário para resposta JSON."""
    return {
        "id": s.id,
        "slug": s.slug,
        "name": s.name,
        "diagram_url": s.diagram_url
    }

# =========================================================================
# ROTAS DE SCENARIO DATABASES -- CRUD 
# =========================================================================

@submission_bp.route('/scenarios', methods=['GET'])
def get_scenarios():
    success, result = ScenarioDatabaseService.get_all_scenarios()
    if success:
        return jsonify([serialize_scenario(s) for s in result]), 200
    return jsonify({"error": result}), 500

@submission_bp.route('/scenarios', methods=['POST'])
@role_required('admin', 'teacher')
def create_scenario():
    data = request.get_json() or {}
    success, result = ScenarioDatabaseService.create_scenario(data)
    if success:
        return jsonify(serialize_scenario(result)), 201
    return jsonify({"error": result}), 400

@submission_bp.route('/scenarios/<slug>', methods=['GET'])
def get_scenario(slug):
    success, result = ScenarioDatabaseService.get_scenario_by_slug(slug)
    if success:
        return jsonify(serialize_scenario(result)), 200
    return jsonify({"error": result}), 404

@submission_bp.route('/scenarios/<slug>', methods=['PUT'])
@role_required('admin', 'teacher')
def update_scenario(slug):
    data = request.get_json() or {}
    # Nota: Precisaria do ID para atualizar no service novo, então buscamos pelo slug primeiro
    success_scen, scenario = ScenarioDatabaseService.get_scenario_by_slug(slug)
    if not success_scen: return jsonify({"error": "Cenário não encontrado"}), 404
    
    success, result = ScenarioDatabaseService.update_scenario(scenario.id, data)
    if success:
        return jsonify(serialize_scenario(result)), 200
    return jsonify({"error": result}), 400

@submission_bp.route('/scenarios/<slug>', methods=['DELETE'])
@role_required('admin', 'teacher')
def delete_scenario(slug):
    success_scen, scenario = ScenarioDatabaseService.get_scenario_by_slug(slug)
    if not success_scen: return jsonify({"error": "Cenário não encontrado"}), 404

    success, result = ScenarioDatabaseService.delete_scenario(scenario.id)
    if success:
        return jsonify({"msg": result}), 200
    return jsonify({"error": result}), 400

# =========================================================================
# ROTAS DE QUESTÕES -- CRUD
# =========================================================================

@submission_bp.route('/questions', methods=['GET'])
def get_all_questions():
    success, result = QuestionService.get_all_questions()
    if success:
        return jsonify([serialize_question(q) for q in result]), 200
    return jsonify({"error": result}), 500

@submission_bp.route('/questions', methods=['POST'])
@role_required('admin', 'teacher')
def create_question():
    data = request.get_json() or {}
    success, result = QuestionService.create_question(data)
    if success:
        return jsonify(serialize_question(result)), 201
    return jsonify({"error": result}), 400

@submission_bp.route('/questions/<int:question_id>', methods=['GET'])
def get_question(question_id):
    success, result = QuestionService.get_question_by_id(question_id)
    if success:
        return jsonify(serialize_question(result)), 200
    return jsonify({"error": result}), 404

@submission_bp.route('/questions/<int:question_id>', methods=['PUT'])
@role_required('admin', 'teacher')
def update_question(question_id):
    data = request.get_json() or {}
    success, result = QuestionService.update_question(question_id, data)
    if success:
        return jsonify(serialize_question(result)), 200
    return jsonify({"error": result}), 400

@submission_bp.route('/questions/<int:question_id>', methods=['DELETE'])
@role_required('admin', 'teacher')
def delete_question(question_id):
    success, result = QuestionService.delete_question(question_id)
    if success:
        return jsonify({"msg": result}), 200
    return jsonify({"error": result}), 400

@submission_bp.route('/questions/<slug>', methods=['GET'])
def get_questions_by_scenario(slug):
    success_scenario, scenario = ScenarioDatabaseService.get_scenario_by_slug(slug)
    if not success_scenario:
        return jsonify({"error": scenario}), 404
        
    success, result = QuestionService.get_questions_by_scenario(scenario.id)
    if success:
        return jsonify([serialize_question(q) for q in result]), 200
    return jsonify({"error": result}), 500

# =========================================================================
# ROTAS DO CAT (TESTE ADAPTATIVO COMPUTADORIZADO)
# =========================================================================

@submission_bp.route('/adaptive/<slug>/start-or-next', methods=['GET'])
@role_required('student')
def get_adaptive_state(slug):
    """
    Inicia uma sessão CAT ou retorna a questão atual caso o aluno já tenha começado.
    O frontend deve chamar essa rota ao abrir a página do cenário.
    """
    claims = get_jwt()
    student_id = claims.get('user_id')
    
    success_scenario, scenario = ScenarioDatabaseService.get_scenario_by_slug(slug)
    if not success_scenario:
        return jsonify({"error": scenario}), 404

    success, result = SubmissionService.get_or_start_adaptive_session(student_id, scenario.id)
    if not success:
        return jsonify(result), 500

    return jsonify({
        "session_id": result["session_id"],
        "current_question": serialize_question(result["question"])
    }), 200

@submission_bp.route('/validate', methods=['POST'])
@role_required('student')
def validate():
    """Valida a consulta, registra no histórico CAT e avança a busca binária."""
    claims = get_jwt()
    student_id = claims.get('user_id')
    data = request.get_json() or {}
    
    slug = data.get('slug')
    q_id = data.get('question_id')
    session_id = data.get('session_id') # NOVO REQUISITO: O frontend deve enviar isso
    time_spent = data.get('time_spent_seconds', 0)
    student_sql = (data.get('student_sql') or '').strip()

    if not all([slug, q_id, session_id]):
        return jsonify({'valid': False, 'error': 'Parâmetros slug, question_id e session_id são obrigatórios.'}), 400

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

    # 1. Executa Query do Aluno
    stu_res = SupabaseService.execute_query(client, student_sql, max_rows=0)
    if stu_res.get('error'):
        # Mesmo com erro de SQL, é considerado erro lógico na busca binária
        SubmissionService.submit_adaptive_answer(student_id, session_id, q_id, time_spent, student_sql, False, stu_res['error'])
        return jsonify({'valid': False, 'error': stu_res['error'], 'statement': statement}), 200
        
    # 2. Executa Query Base
    base_res = SupabaseService.execute_query(client, expected_sql, max_rows=0)
    if base_res.get('error'):
        return jsonify({'valid': False, 'error': f"Erro na base: {base_res['error']}", 'statement': statement}), 500

    # 3. Compara Resultados
    is_valid, msg = SQLGrader.compare(expected_sql, student_sql, base_res, stu_res)
    
    # 4. Registra no CAT e obtém próxima ação
    success_save, adaptive_result = SubmissionService.submit_adaptive_answer(
        student_id=student_id, 
        session_id=session_id, 
        question_id=q_id, 
        time_spent=time_spent, 
        submitted_query=student_sql, 
        is_correct=is_valid, 
        output=msg
    )

    if not success_save:
        return jsonify({'valid': False, 'error': f"Erro interno do CAT: {adaptive_result.get('error')}"}), 500

    return jsonify({
        'valid': is_valid,
        'message': msg if is_valid else None,
        'error': msg if not is_valid else None,
        'statement': statement,
        'result_table': stu_res,
        'expected_table': base_res,
        # Dados do CAT para o Frontend atualizar a tela
        'adaptive_state': {
            'is_finished': adaptive_result.get("finished"),
            'next_question': serialize_question(adaptive_result.get("next_question")),
            'mastered_until': adaptive_result.get("mastered_until"),
            'cat_message': adaptive_result.get("msg")
        }
    }), 200

@submission_bp.route('/validate/skip', methods=['POST'])
@role_required('student')
def skip_question_route():
    """Pula a questão: considera como erro no cálculo do CAT e envia uma mais fácil."""
    claims = get_jwt()
    student_id = claims.get('user_id')
    data = request.get_json() or {}
    
    question_id = data.get('question_id')
    session_id = data.get('session_id')

    if not all([question_id, session_id]):
        return jsonify({"error": "Parâmetros question_id e session_id são obrigatórios."}), 400
    
    # Pular envia is_correct=False e is_skipped=True
    success, adaptive_result = SubmissionService.submit_adaptive_answer(
        student_id=student_id,
        session_id=session_id,
        question_id=question_id,
        time_spent=0,
        submitted_query=None,
        is_correct=False,
        output="Pulou a questão",
        is_skipped=True
    )
    
    if not success:
        return jsonify({"error": adaptive_result.get("error")}), 500

    return jsonify({
        "valid": True, 
        "message": "Questão pulada. Reajustando nível...",
        "adaptive_state": {
            'is_finished': adaptive_result.get("finished"),
            'next_question': serialize_question(adaptive_result.get("next_question")),
            'mastered_until': adaptive_result.get("mastered_until"),
            'cat_message': adaptive_result.get("msg")
        }
    }), 200

# =========================================================================
# ROTAS DE VALIDAÇÃO (TEACHER/ADMIN - NÃO AFETAM O CAT)
# =========================================================================

@submission_bp.route('/validate/testing', methods=['POST'])
@role_required('teacher', 'admin')
def validate_testing():
    """Valida a consulta do professor sem afetar sessões de teste ou salvar dados."""
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