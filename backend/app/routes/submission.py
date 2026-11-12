from flask import jsonify, Blueprint

from app.services.submission_service import (
    ScenarioDatabaseService, QuestionService, SubmissionService, SupabaseService, SQLGrader, ServiceError,
)
from app.utils.decorators import role_required, current_user, json_body
from app.utils.serializers import serialize_question, serialize_scenario

submission_bp = Blueprint('main', __name__)


def _is_staff():
    role, _ = current_user()
    return role in ('admin', 'teacher')


def _scenario_payload(scenario, counts=None):
    counts = counts if counts is not None else ScenarioDatabaseService.question_counts()
    return serialize_scenario(scenario, has_credentials=SupabaseService.has_credentials(scenario.slug),
                              question_count=counts.get(scenario.id, 0))


# =========================================================================
# CENÁRIOS (SCENARIO DATABASES)
# =========================================================================

@submission_bp.route('/scenarios', methods=['GET'])
@role_required('admin', 'teacher', 'student')
def get_scenarios():
    success, result = ScenarioDatabaseService.get_all_scenarios()
    if not success:
        return jsonify({"error": result}), 500
    counts = ScenarioDatabaseService.question_counts()
    return jsonify([_scenario_payload(s, counts) for s in result]), 200


@submission_bp.route('/scenarios', methods=['POST'])
@role_required('admin', 'teacher')
def create_scenario():
    success, result = ScenarioDatabaseService.create_scenario(json_body())
    if success:
        return jsonify(_scenario_payload(result)), 201
    return jsonify({"error": result}), 400


@submission_bp.route('/scenarios/<slug>', methods=['GET'])
@role_required('admin', 'teacher', 'student')
def get_scenario(slug):
    success, result = ScenarioDatabaseService.get_scenario_by_slug(slug)
    if success:
        return jsonify(_scenario_payload(result)), 200
    return jsonify({"error": result}), 404


@submission_bp.route('/scenarios/<slug>', methods=['PUT'])
@role_required('admin', 'teacher')
def update_scenario(slug):
    found, scenario = ScenarioDatabaseService.get_scenario_by_slug(slug)
    if not found:
        return jsonify({"error": "Cenário não encontrado"}), 404
    success, result = ScenarioDatabaseService.update_scenario(scenario.id, json_body())
    if success:
        return jsonify(_scenario_payload(result)), 200
    return jsonify({"error": result}), 400


@submission_bp.route('/scenarios/<slug>', methods=['DELETE'])
@role_required('admin', 'teacher')
def delete_scenario(slug):
    found, scenario = ScenarioDatabaseService.get_scenario_by_slug(slug)
    if not found:
        return jsonify({"error": "Cenário não encontrado"}), 404
    success, result = ScenarioDatabaseService.delete_scenario(scenario.id)
    if success:
        return jsonify({"msg": result}), 200
    return jsonify({"error": result}), 500


# =========================================================================
# QUESTÕES (o gabarito só é enviado a professores e administradores)
# =========================================================================

@submission_bp.route('/questions', methods=['GET'])
@role_required('admin', 'teacher')
def get_all_questions():
    success, result = QuestionService.get_all_questions()
    if success:
        return jsonify([serialize_question(q, include_answer=True) for q in result]), 200
    return jsonify({"error": result}), 500


@submission_bp.route('/questions', methods=['POST'])
@role_required('admin', 'teacher')
def create_question():
    success, result = QuestionService.create_question(json_body())
    if success:
        return jsonify(serialize_question(result, include_answer=True)), 201
    return jsonify({"error": result}), 404 if 'não encontrado' in result else 400


@submission_bp.route('/questions/<int:question_id>', methods=['GET'])
@role_required('admin', 'teacher')
def get_question(question_id):
    success, result = QuestionService.get_question_by_id(question_id)
    if success:
        return jsonify(serialize_question(result, include_answer=True)), 200
    return jsonify({"error": result}), 404


@submission_bp.route('/questions/<int:question_id>', methods=['PUT'])
@role_required('admin', 'teacher')
def update_question(question_id):
    success, result = QuestionService.update_question(question_id, json_body())
    if success:
        return jsonify(serialize_question(result, include_answer=True)), 200
    return jsonify({"error": result}), 404 if 'não encontrada' in result else 400


@submission_bp.route('/questions/<int:question_id>', methods=['DELETE'])
@role_required('admin', 'teacher')
def delete_question(question_id):
    success, result = QuestionService.delete_question(question_id)
    if success:
        return jsonify({"msg": result}), 200
    return jsonify({"error": result}), 404 if 'não encontrada' in result else 500


@submission_bp.route('/questions/<slug>', methods=['GET'])
@role_required('admin', 'teacher', 'student')
def get_questions_by_scenario(slug):
    found, scenario = ScenarioDatabaseService.get_scenario_by_slug(slug)
    if not found:
        return jsonify({"error": scenario}), 404
    success, result = QuestionService.get_questions_by_scenario(scenario.id)
    if not success:
        return jsonify({"error": result}), 500
    include_answer = _is_staff()
    return jsonify([serialize_question(q, include_answer=include_answer) for q in result]), 200


# =========================================================================
# CAT (TESTE ADAPTATIVO COMPUTADORIZADO)
# =========================================================================

def _student_scenario(slug):
    found, scenario = ScenarioDatabaseService.get_scenario_by_slug(slug)
    if not found:
        return None, (jsonify({"error": scenario}), 404)
    return scenario, None


@submission_bp.route('/adaptive/<slug>/start-or-next', methods=['GET'])
@role_required('student')
def get_adaptive_state(slug):
    """Inicia a sessão adaptativa ou retorna o estado atual da trilha do aluno."""
    _, student_id = current_user()
    scenario, error = _student_scenario(slug)
    if error:
        return error
    success, result = SubmissionService.get_or_start_adaptive_session(student_id, scenario.id)
    if not success:
        return jsonify(result), 400
    return jsonify(result), 200


@submission_bp.route('/adaptive/<slug>/reset', methods=['POST'])
@role_required('student')
def reset_adaptive_state(slug):
    """Recomeça a trilha do aluno no cenário (o histórico é mantido)."""
    _, student_id = current_user()
    scenario, error = _student_scenario(slug)
    if error:
        return error
    success, result = SubmissionService.reset_session(student_id, scenario.id)
    if not success:
        return jsonify(result), 400
    return jsonify(result), 200


def _load_question(question_id):
    if not isinstance(question_id, int):
        try:
            question_id = int(question_id)
        except (TypeError, ValueError):
            return None
    found, question = QuestionService.get_question_by_id(question_id)
    return question if found else None


def _adaptive_payload(state):
    keys = ('session_id', 'is_finished', 'trail_size', 'mastered_until', 'current_question', 'next_question',
            'solved_question_ids', 'skipped_orders', 'can_skip', 'skip_available_in', 'skip_min_seconds',
            'advanced', 'is_practice', 'cat_message')
    return {k: state.get(k) for k in keys}


def _service_error_response(err, statement=None):
    body = {'valid': False, 'error': err.message}
    if statement is not None:
        body['statement'] = statement
    return jsonify(body), err.status


@submission_bp.route('/validate', methods=['POST'])
@role_required('student')
def validate():
    """
    Executa e corrige a consulta do aluno. A sessão, o cenário e o tempo da tentativa são
    determinados pelo servidor a partir da questão (o cliente não escolhe a sessão).
    """
    _, student_id = current_user()
    data = json_body()
    question = _load_question(data.get('question_id'))
    if question is None:
        return jsonify({'valid': False, 'error': 'Questão não encontrada.'}), 404

    student_sql = data.get('student_sql') if isinstance(data.get('student_sql'), str) else ''
    if not student_sql.strip():
        return jsonify({'valid': False, 'error': 'Sua consulta está em branco.', 'statement': question.statement}), 400

    scenario = ScenarioDatabaseService.get_scenario_by_id(question.scenario_database_id)
    client_seconds = data.get('time_spent_seconds')

    def record(is_correct, output):
        return SubmissionService.submit_adaptive_answer(
            student_id, question, student_sql, is_correct, output, client_seconds=client_seconds)

    is_safe, safe_msg, cleaned_sql = SQLGrader.is_safe_query(student_sql)
    if not is_safe:
        ok, state = record(False, safe_msg)
        if not ok:
            return _service_error_response(state, question.statement)
        return jsonify({'valid': False, 'error': safe_msg, 'statement': question.statement,
                        'adaptive_state': _adaptive_payload(state)}), 200

    client = SupabaseService.get_client(scenario.slug)
    if not client:
        return jsonify({'valid': False, 'error': f'Credenciais do Supabase para o cenário "{scenario.slug}" '
                                                  'não foram configuradas no servidor.'}), 503

    base_res = SupabaseService.execute_expected(client, scenario.slug, question)
    if base_res.get('error'):
        return jsonify({'valid': False, 'error': f"Erro no gabarito da questão (avise o professor): {base_res['error']}",
                        'statement': question.statement}), 500

    stu_res = SupabaseService.execute_query(client, cleaned_sql)
    if stu_res.get('error'):
        ok, state = record(False, stu_res['error'])
        if not ok:
            return _service_error_response(state, question.statement)
        return jsonify({'valid': False, 'error': stu_res['error'], 'statement': question.statement,
                        'result_table': None, 'expected_table': SupabaseService.for_display(base_res),
                        'adaptive_state': _adaptive_payload(state)}), 200

    is_valid, msg = SQLGrader.compare(question.expected_query, cleaned_sql, base_res, stu_res)
    ok, state = record(is_valid, msg)
    if not ok:
        return _service_error_response(state, question.statement)

    return jsonify({
        'valid': is_valid,
        'message': msg if is_valid else None,
        'error': msg if not is_valid else None,
        'statement': question.statement,
        'result_table': SupabaseService.for_display(stu_res),
        'expected_table': SupabaseService.for_display(base_res),
        'adaptive_state': _adaptive_payload(state),
    }), 200


@submission_bp.route('/validate/skip', methods=['POST'])
@role_required('student')
def skip_question_route():
    """Pula a questão atual da trilha (liberado após o tempo mínimo de tentativa)."""
    _, student_id = current_user()
    question = _load_question(json_body().get('question_id'))
    if question is None:
        return jsonify({"error": "Questão não encontrada."}), 404

    ok, state = SubmissionService.submit_adaptive_answer(
        student_id, question, None, False, "Pulou a questão", is_skipped=True)
    if not ok:
        return jsonify({"error": state.message}), state.status
    return jsonify({
        "valid": True,
        "message": state.get("cat_message"),
        "adaptive_state": _adaptive_payload(state),
    }), 200


# =========================================================================
# VALIDAÇÃO DE GABARITOS (PROFESSOR/ADMIN - NÃO AFETA O CAT)
# =========================================================================

@submission_bp.route('/validate/testing', methods=['POST'])
@role_required('teacher', 'admin')
def validate_testing():
    """Valida uma consulta contra o gabarito sem registrar submissões."""
    data = json_body()
    question = _load_question(data.get('question_id'))
    if question is None:
        return jsonify({'valid': False, 'error': 'Questão não encontrada.'}), 404
    testing_sql = data.get('testing_sql') if isinstance(data.get('testing_sql'), str) else ''
    if not testing_sql.strip():
        return jsonify({'valid': False, 'error': 'Sua consulta está em branco.', 'statement': question.statement}), 400

    scenario = ScenarioDatabaseService.get_scenario_by_id(question.scenario_database_id)

    is_safe, safe_msg, cleaned_sql = SQLGrader.is_safe_query(testing_sql)
    if not is_safe:
        return jsonify({'valid': False, 'error': safe_msg, 'statement': question.statement}), 200

    client = SupabaseService.get_client(scenario.slug)
    if not client:
        return jsonify({'valid': False, 'error': f'Credenciais do Supabase para o cenário "{scenario.slug}" '
                                                  'não foram configuradas no servidor.'}), 503

    testing_res = SupabaseService.execute_query(client, cleaned_sql)
    base_res = SupabaseService.execute_query(client, question.expected_query)
    response = {
        'statement': question.statement,
        'result_table': SupabaseService.for_display(testing_res),
        'expected_table': SupabaseService.for_display(base_res),
    }
    if base_res.get('error'):
        response.update({'valid': False, 'error': f"Erro no gabarito: {base_res['error']}"})
        return jsonify(response), 200
    if testing_res.get('error'):
        response.update({'valid': False, 'error': testing_res['error']})
        return jsonify(response), 200

    is_valid, msg = SQLGrader.compare(question.expected_query, cleaned_sql, base_res, testing_res)
    response.update({'valid': is_valid, 'message': msg if is_valid else None, 'error': None if is_valid else msg})
    return jsonify(response), 200
