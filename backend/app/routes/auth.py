from flask import jsonify, Blueprint

from app.services.auth_service import AuthService
from app.services.classroom_service import ClassroomService
from app.utils.decorators import role_required, current_user, json_body
from app.utils.serializers import serialize_user

auth_bp = Blueprint('auth', __name__)


def _with_user(response, key):
    response[key] = serialize_user(response.pop(key, None))
    return response


def _teacher_can_view(student_id):
    """Professores só veem alunos matriculados em suas turmas."""
    role, user_id = current_user()
    return role == 'admin' or (role == 'teacher' and ClassroomService.teacher_has_student(user_id, student_id))


def _teacher_can_manage(student_id):
    """Alterações exigem que o aluno esteja apenas em turmas do professor (ou ser admin)."""
    role, user_id = current_user()
    return role == 'admin' or (role == 'teacher' and ClassroomService.teacher_manages_student(user_id, student_id))


_SHARED_STUDENT_ERROR = ("Acesso negado. Só é possível alterar alunos matriculados exclusivamente nas suas "
                         "turmas; para alunos compartilhados com outros professores, procure o administrador.")


# =========================================================================
# ADMINISTRADORES
# =========================================================================

@auth_bp.route('/admin', methods=['POST'])
@role_required('admin')
def register_admin():
    success, response = AuthService.create_admin(json_body())
    if not success:
        return jsonify(response), 400
    return jsonify(_with_user(response, 'admin')), 201


@auth_bp.route('/admin/<int:admin_id>', methods=['GET'])
@role_required('admin')
def get_admin(admin_id):
    success, result = AuthService.get_admin(admin_id)
    if not success:
        return jsonify(result), 404
    return jsonify({"admin": serialize_user(result)}), 200


@auth_bp.route('/admin/<int:admin_id>', methods=['PUT'])
@role_required('admin')
def update_admin(admin_id):
    success, response = AuthService.update_admin(admin_id, json_body())
    if not success:
        return jsonify(response), 404 if 'não encontrado' in response.get('error', '') else 400
    return jsonify(_with_user(response, 'admin')), 200


@auth_bp.route('/admin/<int:admin_id>', methods=['DELETE'])
@role_required('admin')
def delete_admin(admin_id):
    _, requester_id = current_user()
    success, response = AuthService.delete_admin(admin_id, requester_id)
    if not success:
        status = response.pop('status', 400)
        return jsonify(response), status
    return jsonify(response), 200


@auth_bp.route('/admins', methods=['GET'])
@role_required('admin')
def get_all_admins():
    success, result = AuthService.get_all_admins()
    if success:
        return jsonify([serialize_user(admin) for admin in result]), 200
    return jsonify(result), 500


# =========================================================================
# PROFESSORES
# =========================================================================

@auth_bp.route('/teacher', methods=['POST'])
@role_required('admin')
def register_teacher():
    success, response = AuthService.create_teacher(json_body())
    if not success:
        return jsonify(response), 400
    return jsonify(_with_user(response, 'teacher')), 201


@auth_bp.route('/teacher/<int:teacher_id>', methods=['GET'])
@role_required('admin', 'teacher')
def get_teacher(teacher_id):
    role, user_id = current_user()
    if role == 'teacher' and user_id != teacher_id:
        return jsonify({"error": "Acesso negado."}), 403
    success, result = AuthService.get_teacher(teacher_id)
    if not success:
        return jsonify(result), 404
    return jsonify({"teacher": serialize_user(result)}), 200


@auth_bp.route('/teacher/<int:teacher_id>', methods=['PUT'])
@role_required('admin')
def update_teacher(teacher_id):
    success, response = AuthService.update_teacher(teacher_id, json_body())
    if not success:
        return jsonify(response), 404 if 'não encontrado' in response.get('error', '') else 400
    return jsonify(_with_user(response, 'teacher')), 200


@auth_bp.route('/teacher/<int:teacher_id>', methods=['DELETE'])
@role_required('admin')
def delete_teacher(teacher_id):
    success, response = AuthService.delete_teacher(teacher_id)
    if not success:
        return jsonify(response), 404 if 'não encontrado' in response.get('error', '') else 500
    return jsonify(response), 200


@auth_bp.route('/teachers', methods=['GET'])
@role_required('admin')
def get_all_teachers():
    success, result = AuthService.get_all_teachers()
    if success:
        return jsonify([serialize_user(t) for t in result]), 200
    return jsonify(result), 500


# =========================================================================
# ALUNOS
# =========================================================================

@auth_bp.route('/student', methods=['POST'])
@role_required('admin')
def register_student():
    """Cadastro avulso de aluno (professores cadastram alunos ao matriculá-los nas turmas)."""
    success, response = AuthService.create_student(json_body())
    if not success:
        return jsonify(response), 400
    return jsonify(_with_user(response, 'student')), 201


@auth_bp.route('/student/<int:student_id>', methods=['GET'])
@role_required('admin', 'teacher', 'student')
def get_student(student_id):
    role, user_id = current_user()
    if role == 'student' and user_id != student_id:
        return jsonify({"error": "Acesso negado."}), 403
    if role == 'teacher' and not _teacher_can_view(student_id):
        return jsonify({"error": "Acesso negado. O aluno não pertence às suas turmas."}), 403
    success, result = AuthService.get_student(student_id)
    if not success:
        return jsonify(result), 404
    return jsonify({"student": serialize_user(result)}), 200


@auth_bp.route('/student/<int:student_id>', methods=['PUT'])
@role_required('admin', 'teacher')
def update_student(student_id):
    role, _ = current_user()
    if not _teacher_can_manage(student_id):
        return jsonify({"error": _SHARED_STUDENT_ERROR}), 403
    success, response = AuthService.update_student(student_id, json_body(), allow_password=(role == 'admin'))
    if not success:
        return jsonify(response), 404 if 'não encontrado' in response.get('error', '') else 400
    return jsonify(_with_user(response, 'student')), 200


@auth_bp.route('/student/<int:student_id>/access-code', methods=['POST'])
@role_required('admin', 'teacher')
def regenerate_student_access_code(student_id):
    """Gera um novo código de primeiro acesso (redefine a senha do aluno)."""
    if not _teacher_can_manage(student_id):
        return jsonify({"error": _SHARED_STUDENT_ERROR}), 403
    success, response = AuthService.regenerate_access_code(student_id)
    if not success:
        return jsonify(response), 404 if 'não encontrado' in response.get('error', '') else 500
    return jsonify(_with_user(response, 'student')), 200


@auth_bp.route('/student/<int:student_id>', methods=['DELETE'])
@role_required('admin')
def delete_student(student_id):
    success, response = AuthService.delete_student(student_id)
    if not success:
        return jsonify(response), 404 if 'não encontrado' in response.get('error', '') else 500
    return jsonify(response), 200


@auth_bp.route('/students', methods=['GET'])
@role_required('admin', 'teacher')
def get_all_students():
    """Admin: todos os alunos. Professor: apenas os alunos das suas turmas."""
    role, user_id = current_user()
    if role == 'teacher':
        success, result = ClassroomService.get_students_of_teacher(user_id)
    else:
        success, result = AuthService.get_all_students()
    if success:
        return jsonify([serialize_user(s) for s in result]), 200
    return jsonify(result), 500


# =========================================================================
# AUTENTICAÇÃO
# =========================================================================

@auth_bp.route('/student/first-access', methods=['POST'])
def student_first_access():
    data = json_body()
    success, response = AuthService.setup_student_first_access(
        data.get('registration_number'), data.get('access_code'), data.get('new_password'))
    if not success:
        return jsonify(response), 400
    return jsonify(_with_user(response, 'student')), 200


@auth_bp.route('/login', methods=['POST'])
def login():
    data = json_body()
    login_id, password, role = data.get('login_id'), data.get('password'), data.get('role')
    if not all([login_id, password, role]):
        return jsonify({"error": "login_id, password e role são obrigatórios"}), 400

    success, result = AuthService.login(login_id, password, role)
    if not success:
        return jsonify(result), 401
    return jsonify(result), 200
