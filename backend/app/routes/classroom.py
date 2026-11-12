from flask import request, jsonify, Blueprint

from app.services.classroom_service import ClassroomService
from app.utils.decorators import role_required, current_user, json_body
from app.utils.serializers import serialize_user, serialize_class

classrooms_bp = Blueprint('classrooms', __name__)


def _deny_if_not_owner(class_id):
    """Professores só acessam as próprias turmas. Retorna uma resposta de erro ou None."""
    role, user_id = current_user()
    if role == 'teacher' and not ClassroomService.verify_class_ownership(class_id, user_id):
        return jsonify({"error": "Acesso negado. Você não é o proprietário desta turma."}), 403
    return None


# ROTAS DE BUSCA E LISTAGEM DE TURMAS

@classrooms_bp.route('/', methods=['GET'])
@role_required('admin')
def get_all_classes():
    success, result = ClassroomService.get_all_classes()
    if success:
        return jsonify([serialize_class(c) for c in result]), 200
    return jsonify(result), 500


@classrooms_bp.route('/<int:class_id>', methods=['GET'])
@role_required('admin', 'teacher', 'student')
def get_class(class_id):
    role, user_id = current_user()
    if role == 'student' and not ClassroomService.is_student_enrolled(class_id, user_id):
        return jsonify({"error": "Acesso negado. Você não está matriculado nesta turma."}), 403
    denied = _deny_if_not_owner(class_id)
    if denied:
        return denied
    success, result = ClassroomService.get_class_by_id(class_id)
    if success:
        return jsonify(serialize_class(result)), 200
    return jsonify(result), 404


@classrooms_bp.route('/my-classes/teacher', methods=['GET'])
@role_required('teacher')
def get_my_classes_as_teacher():
    _, teacher_id = current_user()
    success, result = ClassroomService.get_classes_by_teacher(teacher_id)
    if success:
        return jsonify([serialize_class(c) for c in result]), 200
    return jsonify(result), 500


@classrooms_bp.route('/my-classes/student', methods=['GET'])
@role_required('student')
def get_my_classes_as_student():
    _, student_id = current_user()
    success, result = ClassroomService.get_classes_for_student(student_id)
    if success:
        return jsonify([serialize_class(c) for c in result]), 200
    return jsonify(result), 500


# ROTAS DE CRIAÇÃO, ATUALIZAÇÃO E EXCLUSÃO DE TURMAS

@classrooms_bp.route('/', methods=['POST'])
@role_required('teacher', 'admin')
def create_class():
    """
    Cria uma turma. Professores criam turmas para si; o admin informa 'teacher_id'.
    """
    role, user_id = current_user()
    data = json_body()
    if role == 'teacher':
        data['teacher_id'] = user_id
    elif not data.get('teacher_id'):
        return jsonify({"error": "Como admin, você precisa informar o 'teacher_id' do professor dono da turma"}), 400

    success, result = ClassroomService.create_class(data)
    if success:
        return jsonify(serialize_class(result)), 201
    return jsonify(result), 400


@classrooms_bp.route('/<int:class_id>', methods=['PUT'])
@role_required('teacher', 'admin')
def update_class(class_id):
    denied = _deny_if_not_owner(class_id)
    if denied:
        return denied
    success, result = ClassroomService.update_class(class_id, json_body())
    if success:
        return jsonify(serialize_class(result)), 200
    return jsonify(result), 404 if 'não encontrada' in result.get('error', '') else 400


@classrooms_bp.route('/<int:class_id>', methods=['DELETE'])
@role_required('teacher', 'admin')
def delete_class(class_id):
    denied = _deny_if_not_owner(class_id)
    if denied:
        return denied
    success, result = ClassroomService.delete_class(class_id)
    if success:
        return jsonify(result), 200
    return jsonify(result), 404 if 'não encontrada' in result.get('error', '') else 500


# ROTAS DE MATRÍCULA E GERENCIAMENTO DE ALUNOS

def _ensure_class(class_id):
    success, result = ClassroomService.get_class_by_id(class_id)
    if not success:
        return jsonify(result), 404
    return None


@classrooms_bp.route('/<int:class_id>/enroll', methods=['POST'])
@role_required('teacher', 'admin')
def enroll_single_student(class_id):
    """Matricula um aluno (cadastrando-o, com código de primeiro acesso, se ainda não existir)."""
    denied = _deny_if_not_owner(class_id) or _ensure_class(class_id)
    if denied:
        return denied
    data = json_body()
    role, _ = current_user()
    success, result = ClassroomService.enroll_student_by_registration(
        class_id, data.get('matricula'), data.get('nome'), strict_name=(role == 'teacher'))
    if success:
        return jsonify(result), 200
    status = result.pop('status', 400)
    return jsonify(result), status


@classrooms_bp.route('/<int:class_id>/enroll/bulk', methods=['POST'])
@role_required('teacher', 'admin')
def enroll_students_bulk(class_id):
    """Lê um CSV/XLSX com as colunas 'matricula' e 'nome' e matricula todos os alunos."""
    denied = _deny_if_not_owner(class_id) or _ensure_class(class_id)
    if denied:
        return denied
    file = request.files.get('file')
    if file is None or not file.filename:
        return jsonify({"error": "Nenhum arquivo enviado. Use o campo 'file' no form-data."}), 400
    content = file.read()
    if not content:
        return jsonify({"error": "O arquivo está vazio."}), 400
    try:
        df = ClassroomService.read_student_sheet(file.filename, content)
    except ValueError as e:
        return jsonify({"error": str(e)}), 400
    except Exception as e:
        return jsonify({"error": f"Erro ao ler o arquivo: {str(e)}"}), 400

    role, _ = current_user()
    success, result = ClassroomService.bulk_enroll_from_dataframe(class_id, df, strict_name=(role == 'teacher'))
    if success:
        return jsonify(result), 200
    status = result.pop('status', 400)
    return jsonify(result), status


@classrooms_bp.route('/<int:class_id>/unenroll/<int:student_id>', methods=['DELETE'])
@role_required('teacher', 'admin')
def unenroll_student(class_id, student_id):
    denied = _deny_if_not_owner(class_id)
    if denied:
        return denied
    success, result = ClassroomService.unenroll_student(class_id, student_id)
    if success:
        return jsonify(result), 200
    return jsonify(result), 404 if 'não encontrada' in result.get('error', '') else 500


@classrooms_bp.route('/<int:class_id>/students', methods=['GET'])
@role_required('teacher', 'admin')
def get_students_in_class(class_id):
    denied = _deny_if_not_owner(class_id) or _ensure_class(class_id)
    if denied:
        return denied
    success, result = ClassroomService.get_students_in_class(class_id)
    if success:
        return jsonify([serialize_user(s) for s in result]), 200
    return jsonify(result), 500
