import re
import secrets

from flask_jwt_extended import create_access_token
from sqlalchemy import func
from sqlalchemy.exc import SQLAlchemyError
from werkzeug.security import generate_password_hash, check_password_hash

from app.database import db
from app.database.models import Admin, Teacher, Student
from app.utils.decorators import clean_str

MIN_PASSWORD_LENGTH = 6
_EMAIL_RE = re.compile(r'^[^@\s]+@[^@\s]+\.[^@\s]+$')
# Alfabeto sem caracteres ambíguos (0/O, 1/I/L) para os códigos de primeiro acesso.
_CODE_ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789'


def generate_access_code(length=8):
    return ''.join(secrets.choice(_CODE_ALPHABET) for _ in range(length))


def normalize_registration(value):
    """Matrícula como texto, sem o '.0' que planilhas acrescentam a números."""
    text = clean_str(value)
    if re.fullmatch(r'\d+\.0+', text):
        text = text.split('.')[0]
    return text


def _password_error(password):
    if not isinstance(password, str) or len(password) < MIN_PASSWORD_LENGTH:
        return f"A senha deve ter pelo menos {MIN_PASSWORD_LENGTH} caracteres."
    return None


class AuthService:
    """Autenticação e gerenciamento de usuários (Admin, Teacher, Student)."""

    # =========================================================================
    # ADMIN SERVICES
    # =========================================================================

    @staticmethod
    def create_admin(data):
        if not isinstance(data, dict):
            return False, {"error": "Dados inválidos fornecidos."}
        name = clean_str(data.get('name'))
        email = clean_str(data.get('email')).lower()
        password = data.get('password')

        if not name or not email or not password:
            return False, {"error": "Nome, email e senha são obrigatórios."}
        if not _EMAIL_RE.match(email):
            return False, {"error": "Email inválido."}
        if _password_error(password):
            return False, {"error": _password_error(password)}
        try:
            if db.session.query(Admin).filter(func.lower(Admin.email) == email).first():
                return False, {"error": "Email já cadastrado."}
            admin = Admin(name=name, email=email, password_hash=generate_password_hash(password))
            db.session.add(admin)
            db.session.commit()
            return True, {"msg": "Admin criado com sucesso!", "admin": admin}
        except SQLAlchemyError as e:
            db.session.rollback()
            return False, {"error": f"Erro no banco de dados ao criar admin: {str(e)}"}

    @staticmethod
    def get_admin(admin_id):
        try:
            admin = db.session.get(Admin, admin_id)
            if admin:
                return True, admin
            return False, {"error": "Admin não encontrado."}
        except SQLAlchemyError as e:
            return False, {"error": f"Erro ao acessar o banco de dados: {str(e)}"}

    @staticmethod
    def update_admin(admin_id, data):
        if not isinstance(data, dict) or not data:
            return False, {"error": "Dados de atualização são obrigatórios."}
        try:
            admin = db.session.get(Admin, admin_id)
            if not admin:
                return False, {"error": "Admin não encontrado."}
            name = clean_str(data.get('name'))
            if name:
                admin.name = name
            email = clean_str(data.get('email')).lower()
            if email:
                if not _EMAIL_RE.match(email):
                    return False, {"error": "Email inválido."}
                if db.session.query(Admin).filter(func.lower(Admin.email) == email, Admin.id != admin_id).first():
                    return False, {"error": "Email já está em uso por outro Admin."}
                admin.email = email
            if data.get('password'):
                if _password_error(data['password']):
                    return False, {"error": _password_error(data['password'])}
                admin.password_hash = generate_password_hash(data['password'])
            db.session.commit()
            return True, {"msg": "Admin atualizado com sucesso!", "admin": admin}
        except SQLAlchemyError as e:
            db.session.rollback()
            return False, {"error": f"Erro ao atualizar admin: {str(e)}"}

    @staticmethod
    def delete_admin(admin_id, requester_id=None):
        try:
            admin = db.session.get(Admin, admin_id)
            if not admin:
                return False, {"error": "Admin não encontrado.", "status": 404}
            if requester_id is not None and admin.id == requester_id:
                return False, {"error": "Você não pode excluir a sua própria conta.", "status": 400}
            if db.session.query(Admin).count() <= 1:
                return False, {"error": "Não é possível excluir o último administrador.", "status": 400}
            db.session.delete(admin)
            db.session.commit()
            return True, {"msg": "Admin deletado com sucesso!"}
        except SQLAlchemyError as e:
            db.session.rollback()
            return False, {"error": f"Erro ao deletar admin: {str(e)}", "status": 500}

    @staticmethod
    def get_all_admins():
        try:
            return True, db.session.query(Admin).order_by(Admin.name).all()
        except SQLAlchemyError as e:
            return False, {"error": f"Erro ao buscar admins: {str(e)}"}

    # =========================================================================
    # TEACHER SERVICES
    # =========================================================================

    @staticmethod
    def create_teacher(data):
        if not isinstance(data, dict):
            return False, {"error": "Dados inválidos fornecidos."}
        name = clean_str(data.get('name'))
        email = clean_str(data.get('email')).lower()
        registration_number = normalize_registration(data.get('registration_number'))
        password = data.get('password')

        if not name or not email or not registration_number or not password:
            return False, {"error": "Nome, email, matrícula e senha são obrigatórios."}
        if not _EMAIL_RE.match(email):
            return False, {"error": "Email inválido."}
        if _password_error(password):
            return False, {"error": _password_error(password)}
        try:
            exists = db.session.query(Teacher).filter(
                (func.lower(Teacher.email) == email) | (Teacher.registration_number == registration_number)).first()
            if exists:
                return False, {"error": "Professor já cadastrado (email ou matrícula duplicada)."}
            teacher = Teacher(name=name, email=email, registration_number=registration_number,
                              password_hash=generate_password_hash(password))
            db.session.add(teacher)
            db.session.commit()
            return True, {"msg": "Professor criado com sucesso!", "teacher": teacher}
        except SQLAlchemyError as e:
            db.session.rollback()
            return False, {"error": f"Erro no banco de dados ao criar professor: {str(e)}"}

    @staticmethod
    def get_teacher(teacher_id):
        try:
            teacher = db.session.get(Teacher, teacher_id)
            if teacher:
                return True, teacher
            return False, {"error": "Professor não encontrado."}
        except SQLAlchemyError:
            return False, {"error": "Erro ao acessar o banco de dados."}

    @staticmethod
    def update_teacher(teacher_id, data):
        if not isinstance(data, dict) or not data:
            return False, {"error": "Dados de atualização são obrigatórios."}
        try:
            teacher = db.session.get(Teacher, teacher_id)
            if not teacher:
                return False, {"error": "Professor não encontrado."}
            name = clean_str(data.get('name'))
            if name:
                teacher.name = name
            email = clean_str(data.get('email')).lower()
            if email:
                if not _EMAIL_RE.match(email):
                    return False, {"error": "Email inválido."}
                if db.session.query(Teacher).filter(func.lower(Teacher.email) == email, Teacher.id != teacher_id).first():
                    return False, {"error": "Email já está em uso por outro Professor."}
                teacher.email = email
            reg = normalize_registration(data.get('registration_number'))
            if reg:
                if db.session.query(Teacher).filter(Teacher.registration_number == reg,
                                                    Teacher.id != teacher_id).first():
                    return False, {"error": "Matrícula já está em uso por outro Professor."}
                teacher.registration_number = reg
            if data.get('password'):
                if _password_error(data['password']):
                    return False, {"error": _password_error(data['password'])}
                teacher.password_hash = generate_password_hash(data['password'])
            db.session.commit()
            return True, {"msg": "Professor atualizado com sucesso!", "teacher": teacher}
        except SQLAlchemyError as e:
            db.session.rollback()
            return False, {"error": f"Erro ao atualizar professor: {str(e)}"}

    @staticmethod
    def delete_teacher(teacher_id):
        """Exclui o professor; as turmas dele são excluídas em cascata."""
        try:
            teacher = db.session.get(Teacher, teacher_id)
            if not teacher:
                return False, {"error": "Professor não encontrado."}
            db.session.delete(teacher)
            db.session.commit()
            return True, {"msg": "Professor deletado com sucesso!"}
        except SQLAlchemyError as e:
            db.session.rollback()
            return False, {"error": f"Erro ao deletar professor: {str(e)}"}

    @staticmethod
    def get_all_teachers():
        try:
            return True, db.session.query(Teacher).order_by(Teacher.name).all()
        except SQLAlchemyError as e:
            return False, {"error": f"Erro ao buscar professores: {str(e)}"}

    # =========================================================================
    # STUDENT SERVICES
    # =========================================================================

    @staticmethod
    def build_student(data):
        """
        Valida e cria (sem commit) um aluno. Retorna (student, access_code).
        O aluno recebe um código de primeiro acesso, exigido para definir a senha.
        """
        name = clean_str(data.get('name'))
        registration_number = normalize_registration(data.get('registration_number'))
        if not name or not registration_number:
            raise ValueError("Nome e matrícula são obrigatórios.")
        if db.session.query(Student).filter_by(registration_number=registration_number).first():
            raise ValueError("Matrícula já cadastrada.")
        code = generate_access_code()
        student = Student(name=name, registration_number=registration_number,
                          access_code_hash=generate_password_hash(code))
        db.session.add(student)
        db.session.flush()
        return student, code

    @staticmethod
    def create_student(data):
        if not isinstance(data, dict):
            return False, {"error": "Dados inválidos fornecidos."}
        try:
            student, code = AuthService.build_student(data)
            db.session.commit()
            return True, {"msg": "Aluno registrado. Entregue o código de primeiro acesso ao aluno.",
                          "student": student, "access_code": code}
        except ValueError as e:
            db.session.rollback()
            return False, {"error": str(e)}
        except SQLAlchemyError as e:
            db.session.rollback()
            return False, {"error": f"Erro no banco de dados ao criar aluno: {str(e)}"}

    @staticmethod
    def regenerate_access_code(student_id):
        """Gera um novo código de primeiro acesso e remove a senha atual do aluno."""
        try:
            student = db.session.get(Student, student_id)
            if not student:
                return False, {"error": "Aluno não encontrado."}
            code = generate_access_code()
            student.access_code_hash = generate_password_hash(code)
            student.password_hash = None
            db.session.commit()
            return True, {"msg": "Novo código gerado. O aluno deve refazer o primeiro acesso.",
                          "student": student, "access_code": code}
        except SQLAlchemyError as e:
            db.session.rollback()
            return False, {"error": f"Erro ao gerar código: {str(e)}"}

    @staticmethod
    def get_student(student_id):
        try:
            student = db.session.get(Student, student_id)
            if student:
                return True, student
            return False, {"error": "Aluno não encontrado."}
        except SQLAlchemyError:
            return False, {"error": "Erro ao acessar o banco de dados."}

    @staticmethod
    def get_student_by_registration(registration_number):
        registration_number = normalize_registration(registration_number)
        if not registration_number:
            return False, {"error": "Matrícula é obrigatória."}
        try:
            student = db.session.query(Student).filter_by(registration_number=registration_number).first()
            if student:
                return True, student
            return False, {"error": "Aluno não encontrado."}
        except SQLAlchemyError:
            return False, {"error": "Erro ao acessar o banco de dados."}

    @staticmethod
    def update_student(student_id, data, allow_password=True):
        if not isinstance(data, dict) or not data:
            return False, {"error": "Dados de atualização são obrigatórios."}
        try:
            student = db.session.get(Student, student_id)
            if not student:
                return False, {"error": "Aluno não encontrado."}
            name = clean_str(data.get('name'))
            if name:
                student.name = name
            reg = normalize_registration(data.get('registration_number'))
            if reg:
                if db.session.query(Student).filter(Student.registration_number == reg,
                                                    Student.id != student_id).first():
                    return False, {"error": "Matrícula já está em uso por outro Aluno."}
                student.registration_number = reg
            if data.get('password'):
                if not allow_password:
                    return False, {"error": "Use a opção de gerar novo código de acesso para redefinir a senha."}
                if _password_error(data['password']):
                    return False, {"error": _password_error(data['password'])}
                student.password_hash = generate_password_hash(data['password'])
                student.access_code_hash = None
            db.session.commit()
            return True, {"msg": "Aluno atualizado com sucesso!", "student": student}
        except SQLAlchemyError as e:
            db.session.rollback()
            return False, {"error": f"Erro ao atualizar aluno: {str(e)}"}

    @staticmethod
    def delete_student(student_id):
        """Exclui o aluno; matrículas, sessões e submissões são removidas em cascata."""
        try:
            student = db.session.get(Student, student_id)
            if not student:
                return False, {"error": "Aluno não encontrado."}
            db.session.delete(student)
            db.session.commit()
            return True, {"msg": "Aluno deletado com sucesso!"}
        except SQLAlchemyError as e:
            db.session.rollback()
            return False, {"error": f"Erro ao deletar aluno: {str(e)}"}

    @staticmethod
    def get_all_students():
        try:
            return True, db.session.query(Student).order_by(Student.name).all()
        except SQLAlchemyError as e:
            return False, {"error": f"Erro ao buscar alunos: {str(e)}"}

    # =========================================================================
    # AUTHENTICATION SERVICES
    # =========================================================================

    @staticmethod
    def setup_student_first_access(registration, access_code, new_password):
        """Primeiro acesso: o aluno informa matrícula + código recebido e define a senha."""
        registration = normalize_registration(registration)
        access_code = clean_str(access_code).upper()
        if not registration or not access_code or not new_password:
            return False, {"error": "Matrícula, código de acesso e nova senha são obrigatórios."}
        if _password_error(new_password):
            return False, {"error": _password_error(new_password)}
        invalid = {"error": "Matrícula ou código de acesso inválidos (o código só vale até o primeiro acesso)."}
        try:
            student = db.session.query(Student).filter_by(registration_number=registration).first()
            if not student or not student.access_code_hash:
                return False, invalid
            if not check_password_hash(student.access_code_hash, access_code):
                return False, invalid
            student.password_hash = generate_password_hash(new_password)
            student.access_code_hash = None
            db.session.commit()
            return True, {"msg": "Senha definida com sucesso! Você já pode fazer login.", "student": student}
        except SQLAlchemyError as e:
            db.session.rollback()
            return False, {"error": f"Erro ao configurar primeiro acesso: {str(e)}"}

    @staticmethod
    def authenticate_user(login_id, password, role):
        """Valida as credenciais. Retorna (True, dados_do_usuário) ou (False, erro)."""
        login_id = clean_str(login_id)
        if not login_id or not password or not role:
            return False, {"error": "Login, senha e perfil são obrigatórios."}
        invalid = {"error": "Credenciais inválidas."}
        if role == 'student':
            # Mesma mensagem para matrícula inexistente, senha errada ou primeiro acesso pendente.
            invalid = {"error": "Credenciais inválidas. Se este é o seu primeiro acesso, marque a opção "
                                "\"Este é meu primeiro acesso\" e informe o código recebido do professor."}
        try:
            if role == 'admin':
                user = db.session.query(Admin).filter(func.lower(Admin.email) == login_id.lower()).first()
            elif role == 'teacher':
                user = db.session.query(Teacher).filter(
                    (func.lower(Teacher.email) == login_id.lower()) | (Teacher.registration_number == login_id)).first()
            elif role == 'student':
                user = db.session.query(Student).filter_by(
                    registration_number=normalize_registration(login_id)).first()
            else:
                return False, {"error": "Perfil inválido."}

            if not user:
                return False, invalid
            if not user.password_hash:
                return False, invalid
            if not check_password_hash(user.password_hash, str(password)):
                return False, invalid
            return True, {"id": user.id, "name": user.name, "role": role, "login_id": login_id}
        except SQLAlchemyError:
            return False, {"error": "Erro interno ao tentar autenticar o usuário."}

    @staticmethod
    def login(login_id, password, role):
        """Autentica o usuário e emite o token JWT de acesso."""
        success, result = AuthService.authenticate_user(login_id, password, role)
        if not success:
            return False, result
        token = create_access_token(
            identity=str(result['login_id']),
            additional_claims={"role": result['role'], "user_id": result['id']},
        )
        return True, {"access_token": token, "name": result['name'], "role": result['role'], "id": result['id']}
