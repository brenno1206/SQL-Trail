from werkzeug.security import generate_password_hash, check_password_hash
from sqlalchemy.exc import SQLAlchemyError
from app.database import Session
from app.database.models import Admin, Teacher, Student

class AuthService:
    """Serviços relacionados à autenticação e gerenciamento de usuários (Admin, Teacher, Student)."""
    # ADMIN SERVICES

    @staticmethod
    def create_admin(data):
        """Cria um novo admin com os dados fornecidos."""
        if not data or not isinstance(data, dict):
            return False, {"error": "Dados inválidos fornecidos."}

        name = data.get('name', '').strip()
        email = data.get('email', '').strip()
        password = data.get('password', '')

        if not name or not email or not password:
            return False, {"error": "Nome, email e senha são obrigatórios."}
    
        try:
            with Session() as session:
                if session.query(Admin).filter_by(email=email).first():
                    return False, {"error": "Email já cadastrado."}

                new_admin = Admin(
                    name=name,
                    email=email,
                    password_hash=generate_password_hash(password)
                )
                session.add(new_admin)
                session.commit()
                session.refresh(new_admin)
                session.expunge(new_admin)
                return True, {"msg": "Admin criado com sucesso!", "admin": new_admin}
        except SQLAlchemyError as e:
            return False, {"error": f"Erro no banco de dados ao criar admin: {str(e)}"}
        except Exception as e:
            return False, {"error": f"Erro inesperado: {str(e)}"}

    @staticmethod
    def get_admin(admin_id):
        """Busca admin pelo ID primário."""
        if not admin_id:
            return False, {"error": "ID do Admin é obrigatório."}

        try:
            with Session() as session:
                admin = session.query(Admin).filter_by(id=admin_id).first()
                if admin:
                    session.expunge(admin)
                    return True, admin
                return False, {"error": "Admin não encontrado."}
        except SQLAlchemyError as e:
            return False, {"error": f"Erro ao acessar o banco de dados : {str(e)}"}

    @staticmethod
    def update_admin(admin_id, data):
        """Atualiza os dados de um admin existente. Permite atualizar nome, email e senha."""
        if not admin_id or not data or not isinstance(data, dict):
            return False, {"error": "ID e dados de atualização são obrigatórios."}

        try:
            with Session() as session:
                admin = session.query(Admin).filter_by(id=admin_id).first()
                if not admin:
                    return False, {"error": "Admin não encontrado."}

                if 'name' in data and data['name'].strip():
                    admin.name = data['name'].strip()
                
                if 'email' in data and data['email'].strip():
                    email = data['email'].strip()
                    existing = session.query(Admin).filter(Admin.email == email, Admin.id != admin_id).first()
                    if existing:
                        return False, {"error": "Email já está em uso por outro Admin."}
                    admin.email = email
                    
                if 'password' in data and data['password']:
                    admin.password_hash = generate_password_hash(data['password'])

                session.commit()
                session.refresh(admin)
                session.expunge(admin)
                return True, {"msg": "Admin atualizado com sucesso!", "admin": admin}
        except SQLAlchemyError as e:
            session.rollback()
            return False, {"error": f"Erro ao atualizar admin: {str(e)}"}

    @staticmethod
    def delete_admin(admin_id):
        """Deleta um admin do sistema com base no ID fornecido."""
        if not admin_id:
            return False, {"error": "ID do Admin é obrigatório."}

        try:
            with Session() as session:
                admin = session.query(Admin).filter_by(id=admin_id).first()
                if not admin:
                    return False, {"error": "Admin não encontrado."}
                
                session.delete(admin)
                session.commit()
                return True, {"msg": "Admin deletado com sucesso!"}
        except SQLAlchemyError as e:
            session.rollback()
            return False, {"error": f"Erro ao deletar admin: {str(e)}"}

    @staticmethod
    def get_all_admins():
        """Retorna todos os admins cadastrados no sistema."""
        try:
            with Session() as session:
                admins = session.query(Admin).all()
                session.expunge_all()
                return True, admins
        except SQLAlchemyError as e:
            return False, {"error": f"Erro ao buscar admins: {str(e)}"}
    
    # TEACHER SERVICES

    @staticmethod
    def create_teacher(data):
        """Cria um novo professor com os dados fornecidos."""
        if not data or not isinstance(data, dict):
            return False, {"error": "Dados inválidos fornecidos."}

        name = data.get('name', '').strip()
        email = data.get('email', '').strip()
        registration_number = data.get('registration_number', '').strip()
        password = data.get('password', '')

        if not name or not email or not registration_number or not password:
            return False, {"error": "Nome, email, matrícula e senha são obrigatórios."}

        try:
            with Session() as session:
                email_exists = session.query(Teacher).filter_by(email=email).first()
                reg_exists = session.query(Teacher).filter_by(registration_number=registration_number).first()
                
                if email_exists or reg_exists:
                    return False, {"error": "Professor já cadastrado (email ou matrícula duplicada)."}

                new_teacher = Teacher(
                    name=name,
                    email=email,
                    registration_number=registration_number,
                    password_hash=generate_password_hash(password)
                )
                session.add(new_teacher)
                session.commit()
                session.refresh(new_teacher)
                session.expunge(new_teacher)
                return True, {"msg": "Professor criado com sucesso!", "teacher": new_teacher}
        except SQLAlchemyError as e:
            return False, {"error": f"Erro no banco de dados ao criar professor: {str(e)}"}

    @staticmethod
    def get_teacher(teacher_id):
        """Busca professor pelo ID primário."""
        if not teacher_id:
            return False, {"error": "ID do Professor é obrigatório."}

        try:
            with Session() as session:
                teacher = session.query(Teacher).filter_by(id=teacher_id).first()
                if teacher:
                    session.expunge(teacher)
                    return True, teacher
                return False, {"error": "Professor não encontrado."}
        except SQLAlchemyError as e:
            return False, {"error": "Erro ao acessar o banco de dados."}

    @staticmethod
    def update_teacher(teacher_id, data):
        """Atualiza os dados de um professor existente."""
        if not teacher_id or not data or not isinstance(data, dict):
            return False, {"error": "ID e dados de atualização são obrigatórios."}

        try:
            with Session() as session:
                teacher = session.query(Teacher).filter_by(id=teacher_id).first()
                if not teacher:
                    return False, {"error": "Professor não encontrado."}

                if 'name' in data and data['name'].strip():
                    teacher.name = data['name'].strip()
                
                if 'email' in data and data['email'].strip():
                    email = data['email'].strip()
                    existing = session.query(Teacher).filter(Teacher.email == email, Teacher.id != teacher_id).first()
                    if existing:
                        return False, {"error": "Email já está em uso por outro Professor."}
                    teacher.email = email

                if 'registration_number' in data and data['registration_number'].strip():
                    reg_num = data['registration_number'].strip()
                    existing = session.query(Teacher).filter(Teacher.registration_number == reg_num, Teacher.id != teacher_id).first()
                    if existing:
                        return False, {"error": "Matrícula já está em uso por outro Professor."}
                    teacher.registration_number = reg_num

                if 'password' in data and data['password']:
                    teacher.password_hash = generate_password_hash(data['password'])

                session.commit()
                session.refresh(teacher)
                session.expunge(teacher)
                return True, {"msg": "Professor atualizado com sucesso!", "teacher": teacher}
        except SQLAlchemyError as e:
            session.rollback()
            return False, {"error": f"Erro ao atualizar professor: {str(e)}"}

    @staticmethod
    def delete_teacher(teacher_id):
        """Deleta um professor do sistema com base no ID fornecido."""
        if not teacher_id:
            return False, {"error": "ID do Professor é obrigatório."}

        try:
            with Session() as session:
                teacher = session.query(Teacher).filter_by(id=teacher_id).first()
                if not teacher:
                    return False, {"error": "Professor não encontrado."}
                
                session.delete(teacher)
                session.commit()
                return True, {"msg": "Professor deletado com sucesso!"}
        except SQLAlchemyError as e:
            session.rollback()
            return False, {"error": f"Erro ao deletar professor: {str(e)}"}

    @staticmethod
    def get_all_teachers():
        """Retorna todos os professores cadastrados no sistema."""
        try:
            with Session() as session:
                teachers = session.query(Teacher).all()
                session.expunge_all()
                return True, teachers
        except SQLAlchemyError as e:
            return False, {"error": f"Erro ao buscar professores: {str(e)}"}
    
    # STUDENT SERVICES

    @staticmethod
    def create_student(data):
        """Cria um novo aluno com os dados fornecidos."""
        if not data or not isinstance(data, dict):
            return False, {"error": "Dados inválidos fornecidos."}

        name = data.get('name', '').strip()
        registration_number = data.get('registration_number', '').strip()

        if not name or not registration_number:
            return False, {"error": "Nome e matrícula são obrigatórios."}

        try:
            with Session() as session:
                if session.query(Student).filter_by(registration_number=registration_number).first():
                    return False, {"error": "Matrícula já cadastrada."}

                new_student = Student(
                    name=name,
                    registration_number=registration_number
                )
                session.add(new_student)
                session.commit()
                session.refresh(new_student)
                session.expunge(new_student)
                return True, {"msg": "Aluno registrado. Necessário definir senha no primeiro acesso.", "student": new_student}
        except SQLAlchemyError as e:
            return False, {"error": f"Erro no banco de dados ao criar aluno: {str(e)}"}

    @staticmethod
    def get_student(student_id):
        """Busca aluno pelo ID primário."""
        if not student_id:
            return False, {"error": "ID do Aluno é obrigatório."}

        try:
            with Session() as session:
                student = session.query(Student).filter_by(id=student_id).first()
                if student:
                    session.expunge(student)
                    return True, student
                return False, {"error": "Aluno não encontrado."}
        except SQLAlchemyError as e:
            return False, {"error": "Erro ao acessar o banco de dados."}
            
    @staticmethod
    def get_student_by_registration(registration_number):
        """Busca aluno pela matrícula."""
        if not registration_number:
            return False, {"error": "Matrícula é obrigatória."}

        try:
            with Session() as session:
                student = session.query(Student).filter_by(registration_number=str(registration_number).strip()).first()
                if student:
                    session.expunge(student)
                    return True, student
                return False, {"error": "Aluno não encontrado."}
        except SQLAlchemyError as e:
            return False, {"error": "Erro ao acessar o banco de dados."}

    @staticmethod
    def update_student(student_id, data):
        """Atualiza os dados de um aluno existente."""
        if not student_id or not data or not isinstance(data, dict):
            return False, {"error": "ID e dados de atualização são obrigatórios."}

        try:
            with Session() as session:
                student = session.query(Student).filter_by(id=student_id).first()
                if not student:
                    return False, {"error": "Aluno não encontrado."}

                if 'name' in data and data['name'].strip():
                    student.name = data['name'].strip()

                if 'registration_number' in data and data['registration_number'].strip():
                    reg_num = data['registration_number'].strip()
                    existing = session.query(Student).filter(Student.registration_number == reg_num, Student.id != student_id).first()
                    if existing:
                        return False, {"error": "Matrícula já está em uso por outro Aluno."}
                    student.registration_number = reg_num

                if 'password' in data and data['password']:
                    student.password_hash = generate_password_hash(data['password'])

                session.commit()
                session.refresh(student)
                session.expunge(student)
                return True, {"msg": "Aluno atualizado com sucesso!", "student": student}
        except SQLAlchemyError as e:
            session.rollback()
            return False, {"error": f"Erro ao atualizar aluno: {str(e)}"}

    @staticmethod
    def delete_student(student_id):
        """Deleta um aluno do sistema com base no ID fornecido."""
        if not student_id:
            return False, {"error": "ID do Aluno é obrigatório."}

        try:
            with Session() as session:
                student = session.query(Student).filter_by(id=student_id).first()
                if not student:
                    return False, {"error": "Aluno não encontrado."}
                
                session.delete(student)
                session.commit()
                return True, {"msg": "Aluno deletado com sucesso!"}
        except SQLAlchemyError as e:
            session.rollback()
            return False, {"error": f"Erro ao deletar aluno: {str(e)}"}

    @staticmethod
    def get_all_students():
        """Retorna todos os alunos cadastrados no sistema."""
        try:
            with Session() as session:
                students = session.query(Student).all()
                session.expunge_all()
                return True, students
        except SQLAlchemyError as e:
            return False, {"error": f"Erro ao buscar alunos: {str(e)}"}

    # AUTHENTICATION SERVICES 

    @staticmethod
    def setup_student_first_access(registration, new_password):
        """Configura o primeiro acesso de um aluno, permitindo que ele defina sua senha pela primeira vez usando sua matrícula."""
        if not registration or not new_password:
            return False, {"error": "Matrícula e nova senha são obrigatórias."}

        try:
            with Session() as session:
                student = session.query(Student).filter_by(registration_number=str(registration).strip()).first()
                
                if not student:
                    return False, {"error": "Aluno não encontrado."}
                if student.password_hash: 
                    return False, {"error": "O primeiro acesso já foi realizado."}

                student.password_hash = generate_password_hash(new_password)
                session.commit()
                session.refresh(student)
                session.expunge(student)
                return True, {"msg": "Senha definida com sucesso! Você já pode fazer login.", "student": student}
        except SQLAlchemyError as e:
            session.rollback()
            return False, {"error": f"Erro ao configurar primeiro acesso: {str(e)}"}

    @staticmethod
    def authenticate_user(login_id, password, role):
        """Autentica um usuário (Admin, Teacher ou Student) com base no login (email ou matrícula), senha e role fornecidos."""
        if not login_id or not password or not role:
            return False, {"error": "Login, senha e role são obrigatórios."}

        login_id = str(login_id).strip()
        
        try:
            with Session() as session:
                user = None
                
                if role == 'admin':
                    user = session.query(Admin).filter_by(email=login_id).first()
                elif role == 'teacher':
                    user = session.query(Teacher).filter((Teacher.email == login_id) | (Teacher.registration_number == login_id)).first()
                elif role == 'student':
                    user = session.query(Student).filter_by(registration_number=login_id).first()
                else:
                    return False, {"error": "Role inválida."}

                if not user:
                    return False, {"error": "Usuário não encontrado."}
                
                if not user.password_hash:
                    if role == 'student':
                        return False, {"error": "Realize o primeiro acesso para cadastrar sua senha."}
                    else:
                        return False, {"error": "Conta inválida: Usuário não possui senha cadastrada."}

                if not check_password_hash(user.password_hash, password):
                    return False, {"error": "Credenciais inválidas."}

                user_data = {
                    "id": user.id,
                    "name": user.name,
                    "role": role,
                    "login_id": login_id
                }
                return True, user_data
        except SQLAlchemyError as e:
            return False, {"error": "Erro interno ao tentar autenticar o usuário."}