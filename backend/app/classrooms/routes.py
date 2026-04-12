from flask import request, jsonify, Blueprint
from flask_jwt_extended import get_jwt
from .services import ClassroomService
from app.auth.decorators import role_required 
import pandas as pd # type: ignore
import io

classrooms_bp = Blueprint('classrooms', __name__)

# FUNÇÃO AUXILIAR

def serialize_user(user):
    """
    Converte a instância do banco (Student/Teacher) em dicionário.
    """
    if not user:
        return None
    data = {"id": user.id, "name": user.name}
    if hasattr(user, 'email'):
        data['email'] = user.email
    if hasattr(user, 'registration_number'):
        data['registration_number'] = user.registration_number
    return data

def serialize_class(classroom):
    """
    Converte a instância do banco (Class) em dicionário.
    """
    if not classroom:
        return None
    return {
        "id": classroom.id,
        "teacher_id": classroom.teacher_id,
        "class_name": classroom.class_name,
        "subject": classroom.subject,
        "year_semester": classroom.year_semester
    }


# ROTAS DE BUSCA E LISTAGEM DE TURMAS

@classrooms_bp.route('/', methods=['GET'])
@role_required('admin')
def get_all_classes():
    """
    Rota para listar todas as turmas (Apenas admin).
    """
    success, classes_or_error = ClassroomService.get_all_classes()
    if success:
        return jsonify([serialize_class(c) for c in classes_or_error]), 200
    return jsonify(classes_or_error), 500

@classrooms_bp.route('/<int:class_id>', methods=['GET'])
@role_required('admin', 'teacher', 'student')
def get_class(class_id):
    """
    Rota para buscar os detalhes de uma turma específica pelo ID.
    """
    success, result = ClassroomService.get_class_by_id(class_id)
    if success:
        return jsonify(serialize_class(result)), 200
    return jsonify(result), 404

@classrooms_bp.route('/my-classes/teacher', methods=['GET'])
@role_required('teacher')
def get_my_classes_as_teacher():
    """
    Rota para listar todas as turmas cujo dono é o professor logado.
    """
    claims = get_jwt()
    teacher_id = claims.get('user_id') 
    
    success, result = ClassroomService.get_classes_by_teacher(teacher_id)
    if success:
        return jsonify([serialize_class(c) for c in result]), 200
    return jsonify(result), 500

@classrooms_bp.route('/my-classes/student', methods=['GET'])
@role_required('student')
def get_my_classes_as_student():
    """
    Rota para listar todas as turmas nas quais o aluno logado está matriculado.
    """
    claims = get_jwt()
    student_id = claims.get('user_id') 
    
    success, result = ClassroomService.get_classes_for_student(student_id)
    if success:
        return jsonify([serialize_class(c) for c in result]), 200
    return jsonify(result), 500


# ROTAS DE CRIAÇÃO, ATUALIZAÇÃO E EXCLUSÃO DE TURMAS

@classrooms_bp.route('/', methods=['POST'])
@role_required('teacher', 'admin')
def create_class():
    """
    Rota para criar uma nova turma.
    Se o usuário logado for professor, a turma será atribuída a ele.
    Se for admin, o ID do professor ('teacher_id') deve ser enviado no JSON.
    """
    claims = get_jwt()
    current_user_id = claims.get('user_id') 
    user_role = claims.get('role')
    
    data = request.get_json() or {}
    
    if user_role == 'teacher':
        data['teacher_id'] = current_user_id
    elif user_role == 'admin':
        if 'teacher_id' not in data:
            return jsonify({"error": "Como admin, você precisa informar o 'teacher_id' do professor dono da turma"}), 400

    required_fields = ['class_name', 'subject', 'year_semester', 'teacher_id']
    if not all(field in data for field in required_fields):
        return jsonify({"error": "Faltam dados obrigatórios"}), 400
        
    success, result = ClassroomService.create_class(data)
    if success:
        return jsonify(serialize_class(result)), 201
    
    return jsonify(result), 400

@classrooms_bp.route('/<int:class_id>', methods=['PUT'])
@role_required('teacher', 'admin') 
def update_class(class_id):
    """
    Rota para atualizar os dados de uma turma. Apenas o dono ou admin pode fazê-lo.
    """
    claims = get_jwt()
    current_user_id = claims.get('user_id')
    
    if claims.get('role') == 'teacher':
        if not ClassroomService.verify_class_ownership(class_id, current_user_id):
            return jsonify({"error": "Acesso negado. Você não é o proprietário desta turma."}), 403

    data = request.get_json() or {}
    success, result = ClassroomService.update_class(class_id, data)
    
    if success:
        return jsonify(serialize_class(result)), 200
    return jsonify(result), 400

@classrooms_bp.route('/<int:class_id>', methods=['DELETE'])
@role_required('teacher', 'admin')
def delete_class(class_id):
    """
    Rota para deletar uma turma existente. Apenas o dono ou admin pode fazê-lo.
    """
    claims = get_jwt()
    current_user_id = claims.get('user_id')
    
    if claims.get('role') == 'teacher':
        if not ClassroomService.verify_class_ownership(class_id, current_user_id):
            return jsonify({"error": "Acesso negado. Você não é o proprietário desta turma."}), 403

    success, result = ClassroomService.delete_class(class_id)
    if success:
        return jsonify(result), 200
    return jsonify(result), 400


# ROTAS DE MATRÍCULA E GERENCIAMENTO DE ALUNOS

@classrooms_bp.route('/<int:class_id>/enroll', methods=['POST'])
@role_required('teacher', 'admin')
def enroll_single_student(class_id):
    """
    Rota para matricular um único aluno na turma. Busca ou cria o aluno.
    """
    claims = get_jwt()
    current_user_id = claims.get('user_id')
    
    if claims.get('role') == 'teacher':
        if not ClassroomService.verify_class_ownership(class_id, current_user_id):
            return jsonify({"error": "Acesso negado. Você não é o proprietário desta turma."}), 403

    data = request.get_json() or {}
    registration_number = data.get('matricula')
    name = data.get('nome')

    if not registration_number or not name:
        return jsonify({"error": "Os campos 'matricula' e 'nome' são obrigatórios"}), 400

    success, result = ClassroomService.enroll_student_by_registration(class_id, registration_number, name)
    
    if success:
        return jsonify(result), 200
    return jsonify(result), 500

@classrooms_bp.route('/<int:class_id>/enroll/bulk', methods=['POST'])
@role_required('teacher', 'admin')
def enroll_students_bulk(class_id):
    """
    Rota para ler um arquivo CSV/XLSX, criar e matricular múltiplos alunos.
    """
    claims = get_jwt()
    current_user_id = claims.get('user_id')
    
    if claims.get('role') == 'teacher':
        if not ClassroomService.verify_class_ownership(class_id, current_user_id):
            return jsonify({"error": "Acesso negado. Você não é o proprietário desta turma."}), 403

    if 'file' not in request.files:
        return jsonify({"error": "Nenhum arquivo enviado. Use o campo 'file' no form-data."}), 400
        
    file = request.files['file']
    
    try:
        file_content = file.read()
        if not file_content:
            return jsonify({"error": "O arquivo está vazio."}), 400

        if file.filename.endswith('.csv'):
            df = pd.read_csv(io.BytesIO(file_content), sep=';', engine='python', encoding='utf-8')
        elif file.filename.endswith(('.xls', '.xlsx')):
            try:
                file.stream.seek(0)
                file_content = file.read()
                df = pd.read_excel(io.BytesIO(file_content), engine='calamine')
            except Exception as e:
                file.stream.seek(0)
                df = pd.read_excel(io.BytesIO(file.read()), engine='openpyxl')
        else:
            return jsonify({"error": "Formato inválido."}), 400

        success, message = ClassroomService.bulk_enroll_from_dataframe(class_id, df)
        
        if success:
            return jsonify({"message": message}), 200
        return jsonify({"error": message}), 400

    except Exception as e:
        return jsonify({"error": f"Erro ao ler o arquivo: {str(e)}"}), 500

@classrooms_bp.route('/<int:class_id>/unenroll/<int:student_id>', methods=['DELETE'])
@role_required('teacher', 'admin') 
def unenroll_student(class_id, student_id):
    """
    Rota para desmatricular um aluno de uma turma. Apenas professor proprietário ou admin.
    """
    claims = get_jwt()
    current_user_id = claims.get('user_id')
    
    if claims.get('role') == 'teacher':
        if not ClassroomService.verify_class_ownership(class_id, current_user_id):
            return jsonify({"error": "Acesso negado. Você não é o proprietário desta turma."}), 403

    success, result = ClassroomService.unenroll_student(class_id, student_id)
    if success:
        return jsonify(result), 200
    return jsonify(result), 404

@classrooms_bp.route('/<int:class_id>/students', methods=['GET'])
@role_required('teacher', 'admin')
def get_students_in_class(class_id):
    """
    Rota para listar todos os alunos de uma turma específica.
    """
    claims = get_jwt()
    current_user_id = claims.get('user_id')
    
    if claims.get('role') == 'teacher':
        if not ClassroomService.verify_class_ownership(class_id, current_user_id):
            return jsonify({"error": "Acesso negado. Você não é o proprietário desta turma."}), 403

    success, result = ClassroomService.get_students_in_class(class_id)
    if success:
        return jsonify([serialize_user(s) for s in result]), 200
    return jsonify(result), 400