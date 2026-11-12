from flask import request, jsonify, Blueprint

from app.services.classroom_service import ClassroomService
from app.services.reports_service import ReportService
from app.services.submission_service import ScenarioDatabaseService
from app.utils.decorators import role_required, current_user
from app.utils.serializers import serialize_submission

reports_bp = Blueprint('reports', __name__)


def _deny_student_access(student_id):
    """Professores só veem relatórios de alunos matriculados nas suas turmas."""
    role, user_id = current_user()
    if role == 'teacher' and not ClassroomService.teacher_has_student(user_id, student_id):
        return jsonify({"error": "Acesso negado. O aluno não pertence às suas turmas."}), 403
    return None


# MÉTRICAS GLOBAIS E DE TURMA (ADMIN / PROFESSORES)

@reports_bp.route('/questions/metrics', methods=['GET'])
@role_required('admin', 'teacher')
def get_global_metrics():
    """
    Estatísticas agregadas por questão (sem identificar alunos).
    Filtros: ?scenario_id=1&class_id=3&year_semester=2026/1&question_id=10
    Professores só veem dados das próprias turmas.
    """
    class_id = request.args.get('class_id', type=int)
    role, user_id = current_user()
    if class_id and role == 'teacher' and not ClassroomService.verify_class_ownership(class_id, user_id):
        return jsonify({"error": "Acesso negado. Você não é o proprietário desta turma."}), 403

    success, result = ReportService.get_question_metrics(
        scenario_id=request.args.get('scenario_id', type=int),
        class_id=class_id,
        year_semester=request.args.get('year_semester', type=str),
        question_id=request.args.get('question_id', type=int),
        # Professores veem apenas dados dos alunos das próprias turmas.
        teacher_id=user_id if role == 'teacher' else None,
    )
    return jsonify(result), 200 if success else 500


@reports_bp.route('/classes/<int:class_id>/questions/details', methods=['GET'])
@role_required('admin', 'teacher')
def get_class_questions_detail(class_id):
    role, user_id = current_user()
    if role == 'teacher' and not ClassroomService.verify_class_ownership(class_id, user_id):
        return jsonify({"error": "Acesso negado. Você não é o proprietário desta turma."}), 403
    success, result = ReportService.get_class_questions_detail(class_id)
    return jsonify(result), 200 if success else 500


# RELATÓRIOS DO PRÓPRIO ALUNO

@reports_bp.route('/me/submissions/correct/latest', methods=['GET'])
@role_required('student')
def get_my_latest_correct_submissions():
    _, student_id = current_user()
    success, result = ReportService.get_user_last_correct_submissions(
        student_id=student_id,
        question_id=request.args.get('question_id', type=int),
        scenario_id=request.args.get('scenario_id', type=int),
    )
    if success:
        return jsonify([serialize_submission(s) for s in result]), 200
    return jsonify(result), 500


@reports_bp.route('/me/questions/<int:question_id>/engagement', methods=['GET'])
@role_required('student')
def get_my_question_engagement(question_id):
    _, student_id = current_user()
    success, result = ReportService.get_user_question_engagement(student_id, question_id)
    return jsonify(result), 200 if success else 500


@reports_bp.route('/me/progress', methods=['GET'])
@role_required('student')
def get_my_progress():
    _, student_id = current_user()
    success, result = ReportService.get_progress_summary(student_id, request.args.get('scenario_id', type=int))
    return jsonify(result), 200 if success else 500


@reports_bp.route('/me/<slug>/progress-submissions', methods=['GET'])
@role_required('student')
def get_progress_submissions(slug):
    """Última consulta correta do aluno em cada questão de um cenário."""
    _, student_id = current_user()
    found, scenario = ScenarioDatabaseService.get_scenario_by_slug(slug)
    if not found:
        return jsonify({"error": scenario}), 404
    success, result = ReportService.get_progress_submissions(student_id, scenario.id)
    if success:
        return jsonify(result), 200
    return jsonify({"error": result}), 500


# RELATÓRIOS DO ALUNO VISTOS PELO PROFESSOR / ADMIN

@reports_bp.route('/students/<int:student_id>/progress', methods=['GET'])
@role_required('admin', 'teacher')
def get_student_progress(student_id):
    denied = _deny_student_access(student_id)
    if denied:
        return denied
    success, result = ReportService.get_progress_summary(student_id, request.args.get('scenario_id', type=int))
    return jsonify(result), 200 if success else 500


@reports_bp.route('/students/<int:student_id>/questions/<int:question_id>/engagement', methods=['GET'])
@role_required('admin', 'teacher')
def get_student_question_engagement(student_id, question_id):
    denied = _deny_student_access(student_id)
    if denied:
        return denied
    success, result = ReportService.get_user_question_engagement(student_id, question_id)
    return jsonify(result), 200 if success else 500
