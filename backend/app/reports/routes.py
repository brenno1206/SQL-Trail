from flask import request, jsonify, Blueprint
from flask_jwt_extended import get_jwt_identity
from .services import ReportService
from app.auth.decorators import role_required

reports_bp = Blueprint('reports', __name__)

# --- FUNÇÕES AUXILIARES ---

def serialize_submission_report(s):
    if not s: return None
    return {
        "id": s.id,
        "student_id": s.student_id,
        "question_id": s.question_id,
        "time_spent_seconds": s.time_spent_seconds,
        "submitted_query": s.submitted_query,
        "timestamp": s.timestamp.isoformat() if hasattr(s, 'timestamp') else None
    }


# --- MÉTRICAS GLOBAIS E DE TURMA (ADMIN / PROFESSORES) ---

@reports_bp.route('/questions/metrics', methods=['GET'])
@role_required('admin', 'teacher')
def get_global_metrics():
    """
    Retorna estatísticas detalhadas de acerto, tempo e tentativas por questão.
    Aceita filtros via Query Params: ?scenario_id=1 & class_id=3 & year_semester=2026/1 & question_id=10
    """
    scenario_id = request.args.get('scenario_id', type=int)
    class_id = request.args.get('class_id', type=int)
    year_semester = request.args.get('year_semester', type=str)
    question_id = request.args.get('question_id', type=int)

    success, result = ReportService.get_question_metrics(
        scenario_id=scenario_id, 
        class_id=class_id, 
        year_semester=year_semester, 
        question_id=question_id
    )
    
    if success:
        return jsonify(result), 200
    return jsonify(result), 500


# --- RELATÓRIOS ESPECÍFICOS DO ALUNO (ESTUDANTES) ---

@reports_bp.route('/me/submissions/correct/latest', methods=['GET'])
@role_required('student')
def get_my_latest_correct_submissions():
    """
    Retorna a última submissão correta do usuário logado.
    Filtros opcionais: ?scenario_id=2 & question_id=5
    """
    student_id = get_jwt_identity()
    scenario_id = request.args.get('scenario_id', type=int)
    question_id = request.args.get('question_id', type=int)

    success, result = ReportService.get_user_last_correct_submissions(
        student_id=student_id, 
        question_id=question_id, 
        scenario_id=scenario_id
    )
    
    if success:
        return jsonify([serialize_submission_report(s) for s in result]), 200
    return jsonify(result), 500

@reports_bp.route('/me/questions/<int:question_id>/engagement', methods=['GET'])
@role_required('student')
def get_my_question_engagement(question_id):
    """
    Retorna o total de tentativas e tempo gasto pelo usuário logado em uma questão específica.
    """
    student_id = get_jwt_identity()
    
    success, result = ReportService.get_user_question_engagement(student_id, question_id)
    if success:
        return jsonify(result), 200
    return jsonify(result), 500

@reports_bp.route('/me/progress', methods=['GET'])
@role_required('student')
def get_my_progress():
    """
    Retorna a quantidade total de questões e quantas o aluno resolveu.
    Filtro opcional: ?scenario_id=1
    """
    student_id = get_jwt_identity()
    scenario_id = request.args.get('scenario_id', type=int)

    success, result = ReportService.get_progress_summary(student_id, scenario_id)
    if success:
        return jsonify(result), 200
    return jsonify(result), 500


# --- RELATÓRIOS DO ALUNO VISTOS PELO PROFESSOR ---

@reports_bp.route('/students/<int:student_id>/progress', methods=['GET'])
@role_required('admin', 'teacher')
def get_student_progress(student_id):
    """
    Permite ao professor/admin verificar o progresso de um aluno específico.
    Filtro opcional: ?scenario_id=1
    """
    scenario_id = request.args.get('scenario_id', type=int)

    success, result = ReportService.get_progress_summary(student_id, scenario_id)
    if success:
        return jsonify(result), 200
    return jsonify(result), 500

@reports_bp.route('/students/<int:student_id>/questions/<int:question_id>/engagement', methods=['GET'])
@role_required('admin', 'teacher')
def get_student_question_engagement(student_id, question_id):
    """
    Permite ao professor ver as tentativas/tempo de um aluno em uma questão.
    """
    success, result = ReportService.get_user_question_engagement(student_id, question_id)
    if success:
        return jsonify(result), 200
    return jsonify(result), 500