from werkzeug.security import generate_password_hash, check_password_hash
from app.database import Session
from app.database.models import Admin, Teacher, Student

class AuthService:
    
    @staticmethod
    def create_admin(data):
        with Session() as session:
            if session.query(Admin).filter_by(email=data.get('email')).first():
                return False, {"error": "Email já cadastrado"}

            new_admin = Admin(
                name=data.get('name'),
                email=data.get('email'),
                password_hash=generate_password_hash(data.get('password'))
            )
            session.add(new_admin)
            session.commit()
            return True, {"msg": "Admin criado com sucesso!"}

    @staticmethod
    def create_teacher(data):
        with Session() as session:
            email_exists = session.query(Teacher).filter_by(email=data.get('email')).first()
            reg_exists = session.query(Teacher).filter_by(registration_number=data.get('registration_number')).first()
            
            if email_exists or reg_exists:
                return False, {"error": "Professor já cadastrado (email ou matrícula duplicada)"}

            new_teacher = Teacher(
                name=data.get('name'),
                email=data.get('email'),
                registration_number=data.get('registration_number'),
                password_hash=generate_password_hash(data.get('password'))
            )
            session.add(new_teacher)
            session.commit()
            return True, {"msg": "Professor criado com sucesso!"}

    @staticmethod
    def create_student(data):
        with Session() as session:
            if session.query(Student).filter_by(registration_number=data.get('registration_number')).first():
                return False, {"error": "Matrícula já cadastrada"}

            new_student = Student(
                name=data.get('name'),
                registration_number=data.get('registration_number')
            )
            session.add(new_student)
            session.commit()
            return True, {"msg": "Aluno registrado. Necessário definir senha no primeiro acesso."}

    @staticmethod
    def setup_student_first_access(registration, new_password):
        with Session() as session:
            student = session.query(Student).filter_by(registration_number=registration).first()
            
            if not student:
                return False, {"error": "Aluno não encontrado"}
            if student.password_hash is not None:
                return False, {"error": "O primeiro acesso já foi realizado"}

            student.password_hash = generate_password_hash(new_password)
            session.commit()
            return True, {"msg": "Senha definida com sucesso! Você já pode fazer login."}

    @staticmethod
    def authenticate_user(login_id, password, role):
        with Session() as session:
            user = None
            
            if role == 'admin':
                user = session.query(Admin).filter_by(email=login_id).first()
            elif role == 'teacher':
                user = session.query(Teacher).filter((Teacher.email == login_id) | (Teacher.registration_number == login_id)).first()
            elif role == 'student':
                user = session.query(Student).filter_by(registration_number=login_id).first()
            else:
                return False, {"error": "Role inválida"}

            if not user:
                return False, {"error": "Usuário não encontrado"}
            
            if role == 'student' and not user.password_hash:
                return False, {"error": "Realize o primeiro acesso para cadastrar sua senha"}

            if not check_password_hash(user.password_hash, password):
                return False, {"error": "Credenciais inválidas"}

            user_data = {
                "id": user.id,
                "name": user.name,
                "role": role,
                "login_id": login_id
            }
            return True, user_data