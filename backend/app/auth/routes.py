# /app/auth/routes.py
from flask import request, jsonify, Blueprint
from flask_jwt_extended import create_access_token
from app.auth.services import AuthService
from app.auth.decorators import role_required

auth_bp = Blueprint('auth', __name__)

@auth_bp.route('/register/admin', methods=['POST'])
@role_required('admin')
def register_admin():
    data = request.get_json()
    success, response = AuthService.create_admin(data)

    if not success:
        return jsonify(response), 400
    return jsonify(response), 201


@auth_bp.route('/register/teacher', methods=['POST'])
@role_required('admin')
def register_teacher():
    data = request.get_json()
    success, response = AuthService.create_teacher(data)

    if not success:
        return jsonify(response), 400
    return jsonify(response), 201


@auth_bp.route('/register/student', methods=['POST'])
@role_required('admin', 'teacher')
def register_student():
    data = request.get_json()
    success, response = AuthService.create_student(data)
    
    if not success:
        return jsonify(response), 400
    return jsonify(response), 201


@auth_bp.route('/student/first-access', methods=['POST'])
def student_first_access():
    data = request.get_json()
    registration = data.get('registration_number')
    new_password = data.get('new_password')
    
    if not registration or not new_password:
        return jsonify({"error": "Matrícula e nova senha são obrigatórios"}), 400

    success, response = AuthService.setup_student_first_access(registration, new_password)
    
    if not success:
        status_code = 404 if "não encontrado" in response.get("error", "") else 400
        return jsonify(response), status_code
        
    return jsonify(response), 200


@auth_bp.route('/login', methods=['POST'])
def login():
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