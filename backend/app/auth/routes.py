# /app/auth/routes.py
from flask import request, jsonify, Blueprint
from flask_jwt_extended import create_access_token
from app.auth.services import AuthService
from app.auth.decorators import role_required

auth_bp = Blueprint('auth', __name__)

# FUNÇÃO AUXILIAR
def serialize_user(user):
    """Converte a instância do banco de dados em um dicionário seguro para JSON."""
    if not user:
        return None
    data = {"id": user.id, "name": user.name}
    if hasattr(user, 'email'):
        data['email'] = user.email
    if hasattr(user, 'registration_number'):
        data['registration_number'] = user.registration_number
    return data

# ROTAS DE ADMINISTRADOR

@auth_bp.route('/admin', methods=['POST'])
@role_required('admin')
def register_admin():
    """Rota para criar um novo administrador."""
    data = request.get_json()
    success, response = AuthService.create_admin(data)

    if not success:
        return jsonify(response), 400
    
    response['admin'] = serialize_user(response.pop('admin', None))
    return jsonify(response), 201

@auth_bp.route('/admin/<int:admin_id>', methods=['GET'])
@role_required('admin')
def get_admin(admin_id):
    """Rota para buscar um administrador pelo ID."""
    success, result = AuthService.get_admin(admin_id)
    if not success:
        return jsonify(result), 404
    return jsonify({"admin": serialize_user(result)}), 200

@auth_bp.route('/admin/<int:admin_id>', methods=['PUT'])
@role_required('admin')
def update_admin(admin_id):
    """Rota para atualizar um administrador pelo ID."""
    data = request.get_json()
    success, response = AuthService.update_admin(admin_id, data)
    if not success:
        return jsonify(response), 400
    
    response['admin'] = serialize_user(response.pop('admin', None))
    return jsonify(response), 200

@auth_bp.route('/admin/<int:admin_id>', methods=['DELETE'])
@role_required('admin')
def delete_admin(admin_id):
    """Rota para deletar um administrador pelo ID."""
    success, response = AuthService.delete_admin(admin_id)
    if not success:
        return jsonify(response), 404
    return jsonify(response), 200

@auth_bp.route('/admins', methods=['GET'])
@role_required('admin')
def get_all_admins():
    """Rota para listar todos os administradores cadastrados."""
    success, result = AuthService.get_all_admins()
    
    if success:
        return jsonify([serialize_user(admin) for admin in result]), 200
        
    return jsonify(result), 500


# ROTAS DE PROFESSOR

@auth_bp.route('/teacher', methods=['POST'])
@role_required('admin')
def register_teacher():
    """Rota para criar um novo professor."""
    data = request.get_json()
    success, response = AuthService.create_teacher(data)

    if not success:
        return jsonify(response), 400
    
    response['teacher'] = serialize_user(response.pop('teacher', None))
    return jsonify(response), 201

@auth_bp.route('/teacher/<int:teacher_id>', methods=['GET'])
@role_required('admin', 'teacher')
def get_teacher(teacher_id):
    """Rota para buscar um professor pelo ID."""
    success, result = AuthService.get_teacher(teacher_id)
    if not success:
        return jsonify(result), 404
    return jsonify({"teacher": serialize_user(result)}), 200

@auth_bp.route('/teacher/<int:teacher_id>', methods=['PUT'])
@role_required('admin')
def update_teacher(teacher_id):
    """Rota para atualizar um professor pelo ID."""
    data = request.get_json()
    success, response = AuthService.update_teacher(teacher_id, data)
    if not success:
        return jsonify(response), 400
    
    response['teacher'] = serialize_user(response.pop('teacher', None))
    return jsonify(response), 200

@auth_bp.route('/teacher/<int:teacher_id>', methods=['DELETE'])
@role_required('admin')
def delete_teacher(teacher_id):
    """Rota para deletar um professor pelo ID."""
    success, response = AuthService.delete_teacher(teacher_id)
    if not success:
        return jsonify(response), 404
    return jsonify(response), 200


# ROTAS DE ALUNO

@auth_bp.route('/student', methods=['POST'])
@role_required('admin', 'teacher')
def register_student():
    """Rota para criar um novo aluno."""
    data = request.get_json()
    success, response = AuthService.create_student(data)
    
    if not success:
        return jsonify(response), 400
    
    response['student'] = serialize_user(response.pop('student', None))
    return jsonify(response), 201

@auth_bp.route('/student/<int:student_id>', methods=['GET'])
@role_required('admin', 'teacher', 'student')
def get_student(student_id):
    """Rota para buscar um aluno pelo ID."""
    success, result = AuthService.get_student(student_id)
    if not success:
        return jsonify(result), 404
    return jsonify({"student": serialize_user(result)}), 200

@auth_bp.route('/student/<int:student_id>', methods=['PUT'])
@role_required('admin', 'teacher')
def update_student(student_id):
    """Rota para atualizar um aluno pelo ID."""
    data = request.get_json()
    success, response = AuthService.update_student(student_id, data)
    if not success:
        return jsonify(response), 400
    
    response['student'] = serialize_user(response.pop('student', None))
    return jsonify(response), 200

@auth_bp.route('/student/<int:student_id>', methods=['DELETE'])
@role_required('admin', 'teacher')
def delete_student(student_id):
    """Rota para deletar um aluno pelo ID."""
    success, response = AuthService.delete_student(student_id)
    if not success:
        return jsonify(response), 404
    return jsonify(response), 200

@auth_bp.route('/teachers', methods=['GET'])
@role_required('admin')
def get_all_teachers():
    """Rota para listar todos os professores cadastrados."""
    success, result = AuthService.get_all_teachers()
    
    if success:
        return jsonify([serialize_user(teacher) for teacher in result]), 200
        
    return jsonify(result), 500

@auth_bp.route('/students', methods=['GET'])
@role_required('admin', 'teacher')
def get_all_students():
    """Rota para listar todos os alunos cadastrados."""
    success, result = AuthService.get_all_students()
    
    if success:
        return jsonify([serialize_user(student) for student in result]), 200
        
    return jsonify(result), 500

# ROTAS DE AUTENTICAÇÃO

@auth_bp.route('/student/first-access', methods=['POST'])
def student_first_access():
    """Rota para configurar o primeiro acesso de um aluno."""
    data = request.get_json()
    registration = data.get('registration_number')
    new_password = data.get('new_password')
    
    if not registration or not new_password:
        return jsonify({"error": "Matrícula e nova senha são obrigatórios"}), 400

    success, response = AuthService.setup_student_first_access(registration, new_password)
    
    if not success:
        status_code = 404 if "não encontrado" in response.get("error", "") else 400
        return jsonify(response), status_code
    
    response['student'] = serialize_user(response.pop('student', None))    
    return jsonify(response), 200


@auth_bp.route('/login', methods=['POST'])
def login():
    """Rota para autenticar um usuário e gerar um token JWT."""
    data = request.get_json()
    login_id = data.get('login_id')
    password = data.get('password')
    role = data.get('role')

    if not all([login_id, password, role]):
        return jsonify({"error": "login_id, password e role são obrigatórios"}), 400

    success, result = AuthService.authenticate_user(login_id, password, role)

    if not success:
        status_code = 404 if "não encontrado" in result.get("error", "") else 401
        return jsonify(result), status_code

    access_token = create_access_token(
        identity=result['login_id'], 
        additional_claims={
            "role": result['role'],
            "user_id": result['id']
        }
    )
    
    return jsonify(access_token=access_token, name=result['name']), 200 