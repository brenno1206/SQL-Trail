from werkzeug.security import generate_password_hash, check_password_hash
from app.database import Session
from app.database.models import Admin, Teacher, Student

class AuthService:
    
    # --- ADMIN SERVICES ---

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
            session.refresh(new_admin)
            session.expunge(new_admin)
            return True, {"msg": "Admin criado com sucesso!", "admin": new_admin}

    @staticmethod
    def get_admin(admin_id):
        with Session() as session:
            admin = session.query(Admin).filter_by(id=admin_id).first()
            if admin:
                session.expunge(admin)
                return True, admin
            return False, {"error": "Admin não encontrado"}

    @staticmethod
    def update_admin(admin_id, data):
        with Session() as session:
            admin = session.query(Admin).filter_by(id=admin_id).first()
            if not admin:
                return False, {"error": "Admin não encontrado"}

            if 'name' in data:
                admin.name = data['name']
            
            if 'email' in data:
                existing = session.query(Admin).filter(Admin.email == data['email'], Admin.id != admin_id).first()
                if existing:
                    return False, {"error": "Email já está em uso por outro Admin"}
                admin.email = data['email']
                
            if 'password' in data:
                admin.password_hash = generate_password_hash(data['password'])

            session.commit()
            session.refresh(admin)
            session.expunge(admin)
            return True, {"msg": "Admin atualizado com sucesso!", "admin": admin}

    @staticmethod
    def delete_admin(admin_id):
        with Session() as session:
            admin = session.query(Admin).filter_by(id=admin_id).first()
            if not admin:
                return False, {"error": "Admin não encontrado"}
            
            session.delete(admin)
            session.commit()
            return True, {"msg": "Admin deletado com sucesso!"}

    
    # --- TEACHER SERVICES ---

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
            session.refresh(new_teacher)
            session.expunge(new_teacher)
            return True, {"msg": "Professor criado com sucesso!", "teacher": new_teacher}

    @staticmethod
    def get_teacher(teacher_id):
        with Session() as session:
            teacher = session.query(Teacher).filter_by(id=teacher_id).first()
            if teacher:
                session.expunge(teacher)
                return True, teacher
            return False, {"error": "Professor não encontrado"}

    @staticmethod
    def update_teacher(teacher_id, data):
        with Session() as session:
            teacher = session.query(Teacher).filter_by(id=teacher_id).first()
            if not teacher:
                return False, {"error": "Professor não encontrado"}

            if 'name' in data:
                teacher.name = data['name']
            
            if 'email' in data:
                existing = session.query(Teacher).filter(Teacher.email == data['email'], Teacher.id != teacher_id).first()
                if existing:
                    return False, {"error": "Email já está em uso por outro Professor"}
                teacher.email = data['email']

            if 'registration_number' in data:
                existing = session.query(Teacher).filter(Teacher.registration_number == data['registration_number'], Teacher.id != teacher_id).first()
                if existing:
                    return False, {"error": "Matrícula já está em uso por outro Professor"}
                teacher.registration_number = data['registration_number']

            if 'password' in data:
                teacher.password_hash = generate_password_hash(data['password'])

            session.commit()
            session.refresh(teacher)
            session.expunge(teacher)
            return True, {"msg": "Professor atualizado com sucesso!", "teacher": teacher}

    @staticmethod
    def delete_teacher(teacher_id):
        with Session() as session:
            teacher = session.query(Teacher).filter_by(id=teacher_id).first()
            if not teacher:
                return False, {"error": "Professor não encontrado"}
            
            session.delete(teacher)
            session.commit()
            return True, {"msg": "Professor deletado com sucesso!"}

    
    # --- STUDENT SERVICES ---

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
            session.refresh(new_student)
            session.expunge(new_student)
            return True, {"msg": "Aluno registrado. Necessário definir senha no primeiro acesso.", "student": new_student}

    @staticmethod
    def get_student(student_id):
        """Busca aluno pelo ID primário."""
        with Session() as session:
            student = session.query(Student).filter_by(id=student_id).first()
            if student:
                session.expunge(student)
                return True, student
            return False, {"error": "Aluno não encontrado"}
            
    @staticmethod
    def get_student_by_registration(registration_number):
        """Busca aluno pela matrícula (útil para matrículas em lote/CSV)."""
        with Session() as session:
            student = session.query(Student).filter_by(registration_number=str(registration_number)).first()
            if student:
                session.expunge(student)
                return True, student
            return False, {"error": "Aluno não encontrado"}

    @staticmethod
    def update_student(student_id, data):
        with Session() as session:
            student = session.query(Student).filter_by(id=student_id).first()
            if not student:
                return False, {"error": "Aluno não encontrado"}

            if 'name' in data:
                student.name = data['name']

            if 'registration_number' in data:
                existing = session.query(Student).filter(Student.registration_number == data['registration_number'], Student.id != student_id).first()
                if existing:
                    return False, {"error": "Matrícula já está em uso por outro Aluno"}
                student.registration_number = data['registration_number']

            if 'password' in data:
                student.password_hash = generate_password_hash(data['password'])

            session.commit()
            session.refresh(student)
            session.expunge(student)
            return True, {"msg": "Aluno atualizado com sucesso!", "student": student}

    @staticmethod
    def delete_student(student_id):
        with Session() as session:
            student = session.query(Student).filter_by(id=student_id).first()
            if not student:
                return False, {"error": "Aluno não encontrado"}
            
            session.delete(student)
            session.commit()
            return True, {"msg": "Aluno deletado com sucesso!"}


    # --- AUTHENTICATION SERVICES ---

    @staticmethod
    def setup_student_first_access(registration, new_password):
        with Session() as session:
            student = session.query(Student).filter_by(registration_number=registration).first()
            
            if not student:
                return False, {"error": "Aluno não encontrado"}
            if student.password_hash: # Alterado de "is not None" para lidar com strings vazias acidentais
                return False, {"error": "O primeiro acesso já foi realizado"}

            student.password_hash = generate_password_hash(new_password)
            session.commit()
            session.refresh(student)
            session.expunge(student)
            return True, {"msg": "Senha definida com sucesso! Você já pode fazer login.", "student": student}

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
            
            # Garante que o usuário tem uma senha cadastrada no banco antes de verificar
            if not user.password_hash:
                if role == 'student':
                    return False, {"error": "Realize o primeiro acesso para cadastrar sua senha"}
                else:
                    return False, {"error": "Conta inválida: Usuário não possui senha cadastrada."}

            if not check_password_hash(user.password_hash, password):
                return False, {"error": "Credenciais inválidas"}

            user_data = {
                "id": user.id,
                "name": user.name,
                "role": role,
                "login_id": login_id
            }
            return True, user_data