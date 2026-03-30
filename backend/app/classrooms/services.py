from sqlalchemy.exc import SQLAlchemyError, IntegrityError
from app.database import Session
from app.database.models import Class, Enrollment, Student
from app.auth.services import AuthService

class ClassroomService:
    
    @staticmethod
    def get_all_classes():
        """
        Retorna todas as turmas cadastradas no sistema.
        """
        try:
            with Session() as session:
                classes = session.query(Class).all()
                session.expunge_all()
                return True, classes
        except SQLAlchemyError as e:
            return False, {"error": f"Erro ao buscar turmas: {str(e)}"}
    
    @staticmethod
    def get_class_by_id(class_id):
        """
        Busca uma turma específica pelo seu ID.
        """
        if not class_id:
            return False, {"error": "ID da turma é obrigatório."}

        try:
            with Session() as session:
                classroom = session.query(Class).filter_by(id=class_id).first()
                if classroom:
                    session.expunge(classroom)
                    return True, classroom
                return False, {"error": "Turma não encontrada."}
        except SQLAlchemyError as e:
            return False, {"error": f"Erro ao buscar a turma: {str(e)}"}
    
    @staticmethod
    def get_classes_by_teacher(teacher_id):
        """
        Retorna todas as turmas associadas a um professor específico.
        """
        if not teacher_id:
            return False, {"error": "ID do professor é obrigatório."}

        try:
            with Session() as session:
                classes = session.query(Class).filter_by(teacher_id=teacher_id).all()
                session.expunge_all()
                return True, classes
        except SQLAlchemyError as e:
            return False, {"error": f"Erro ao buscar turmas do professor: {str(e)}"}

    @staticmethod
    def create_class(data):
        """
        Cria uma nova turma no banco de dados.
        """
        if not data or not isinstance(data, dict):
            return False, {"error": "Dados inválidos."}

        try:
            with Session() as session:
                new_class = Class(
                    teacher_id=data.get('teacher_id'),
                    class_name=data.get('class_name', '').strip(),
                    subject=data.get('subject', '').strip(),
                    year_semester=data.get('year_semester', '').strip()
                )
                session.add(new_class)
                session.commit()
                session.refresh(new_class)
                session.expunge(new_class)
                return True, new_class
        except SQLAlchemyError as e:
            return False, {"error": f"Erro ao criar turma: {str(e)}"}
    
    @staticmethod
    def update_class(class_id, data):
        """
        Atualiza os dados de uma turma existente.
        """
        if not class_id or not data or not isinstance(data, dict):
            return False, {"error": "ID da turma e dados são obrigatórios."}

        try:
            with Session() as session:
                classroom = session.query(Class).filter_by(id=class_id).first()
                if not classroom:
                    return False, {"error": "Turma não encontrada."}

                if 'class_name' in data and data['class_name'].strip():
                    classroom.class_name = data['class_name'].strip()
                if 'subject' in data and data['subject'].strip():
                    classroom.subject = data['subject'].strip()
                if 'year_semester' in data and data['year_semester'].strip():
                    classroom.year_semester = data['year_semester'].strip()
                
                session.commit()
                session.refresh(classroom)
                session.expunge(classroom)
                return True, classroom
        except SQLAlchemyError as e:
            session.rollback()
            return False, {"error": f"Erro ao atualizar turma: {str(e)}"}

    @staticmethod
    def delete_class(class_id):
        """
        Deleta uma turma pelo seu ID.
        """
        if not class_id:
            return False, {"error": "ID da turma é obrigatório."}

        try:
            with Session() as session:
                classroom = session.query(Class).filter_by(id=class_id).first()
                if not classroom:
                    return False, {"error": "Turma não encontrada."}
                
                session.delete(classroom)
                session.commit()
                return True, {"msg": "Turma deletada com sucesso."}
        except SQLAlchemyError as e:
            session.rollback()
            return False, {"error": f"Erro ao deletar turma: {str(e)}"}
    
    @staticmethod
    def enroll_student(class_id, student_id):
        """
        Matricula um aluno em uma turma pelo seu ID interno.
        """
        if not class_id or not student_id:
            return False, {"error": "IDs da turma e do aluno são obrigatórios."}

        try:
            with Session() as session:
                existing_enrollment = session.query(Enrollment).filter_by(
                    class_id=class_id, student_id=student_id
                ).first()
                
                if existing_enrollment:
                    session.expunge(existing_enrollment)
                    return True, existing_enrollment
                    
                enrollment = Enrollment(class_id=class_id, student_id=student_id)
                session.add(enrollment)
                session.commit()
                session.refresh(enrollment)
                session.expunge(enrollment)
                return True, enrollment
        except IntegrityError:
            session.rollback()
            return False, {"error": "Erro de integridade (possivelmente IDs inválidos)."}
        except SQLAlchemyError as e:
            session.rollback()
            return False, {"error": f"Erro ao matricular aluno: {str(e)}"}
    
    @staticmethod
    def unenroll_student(class_id, student_id):
        """
        Remove a matrícula de um aluno de uma turma.
        """
        if not class_id or not student_id:
            return False, {"error": "IDs da turma e do aluno são obrigatórios."}

        try:
            with Session() as session:
                enrollment = session.query(Enrollment).filter_by(class_id=class_id, student_id=student_id).first()
                if not enrollment:
                    return False, {"error": "Matrícula não encontrada."}
                
                session.delete(enrollment)
                session.commit()
                return True, {"msg": "Matrícula cancelada com sucesso."}
        except SQLAlchemyError as e:
            session.rollback()
            return False, {"error": f"Erro ao cancelar matrícula: {str(e)}"}
        
    @staticmethod
    def get_students_in_class(class_id):
        """
        Retorna a lista de todos os alunos matriculados em uma turma.
        """
        if not class_id:
            return False, {"error": "ID da turma é obrigatório."}

        try:
            with Session() as session:
                students = session.query(Student).join(Enrollment).filter(Enrollment.class_id == class_id).all()
                session.expunge_all()
                return True, students
        except SQLAlchemyError as e:
            return False, {"error": f"Erro ao buscar alunos da turma: {str(e)}"}
    
    @staticmethod
    def get_classes_for_student(student_id):
        """
        Retorna todas as turmas nas quais um aluno está matriculado.
        """
        if not student_id:
            return False, {"error": "ID do aluno é obrigatório."}

        try:
            with Session() as session:
                classes = session.query(Class).join(Enrollment).filter(Enrollment.student_id == student_id).all()
                session.expunge_all()
                return True, classes
        except SQLAlchemyError as e:
            return False, {"error": f"Erro ao buscar turmas do aluno: {str(e)}"}

    @staticmethod
    def verify_class_ownership(class_id, teacher_id):
        """
        Verifica se um professor é o proprietário de uma determinada turma.
        """
        try:
            with Session() as session:
                classroom = session.query(Class).filter_by(id=class_id, teacher_id=teacher_id).first()
                return classroom is not None
        except SQLAlchemyError:
            return False

    @staticmethod
    def is_student_enrolled(class_id, student_id):
        """
        Verifica de forma rápida se o aluno possui vínculo ativo com a turma.
        """
        try:
            with Session() as session:
                enrollment = session.query(Enrollment).filter_by(class_id=class_id, student_id=student_id).first()
                return enrollment is not None
        except SQLAlchemyError:
            return False
    
    @staticmethod
    def _get_or_create_student_id(registration_number, name):
        """
        Helper interno: Usa o AuthService para buscar ou criar o aluno.
        """
        success, result = AuthService.get_student_by_registration(registration_number)
        
        if success:
            return result.id
        
        create_success, create_result = AuthService.create_student({
            "registration_number": str(registration_number),
            "name": name
        })
        
        if create_success:
            return create_result["student"].id
            
        raise Exception(create_result.get("error", "Erro desconhecido ao criar aluno."))

    @staticmethod
    def enroll_student_by_registration(class_id, registration_number, name):
        """
        Matricula um único aluno buscando ou criando pelo número de matrícula e nome.
        """
        try:
            student_id = ClassroomService._get_or_create_student_id(registration_number, name)
            
            with Session() as session:
                existing = session.query(Enrollment).filter_by(class_id=class_id, student_id=student_id).first()
                if not existing:
                    enrollment = Enrollment(class_id=class_id, student_id=student_id)
                    session.add(enrollment)
                    session.commit()
            return True, {"msg": "Aluno matriculado com sucesso."}
        except SQLAlchemyError as e:
            return False, {"error": f"Erro de banco ao matricular: {str(e)}"}
        except Exception as e:
            return False, {"error": str(e)}

    @staticmethod
    def bulk_enroll_from_dataframe(class_id, df):
        """
        Recebe um DataFrame do Pandas e matricula em lote todos os alunos da lista.
        """
        df.columns = [col.strip().lower() for col in df.columns]
        
        if 'matricula' not in df.columns or 'nome' not in df.columns:
            return False, "O arquivo deve conter as colunas 'matricula' e 'nome'."

        try:
            student_ids_to_enroll = []
            
            for index, row in df.iterrows():
                mat = str(row['matricula']).strip()
                nome = str(row['nome']).strip()
                
                if not mat or not nome or mat == 'nan':
                    continue
                    
                student_id = ClassroomService._get_or_create_student_id(mat, nome)
                student_ids_to_enroll.append(student_id)
            
            with Session() as session:
                for student_id in student_ids_to_enroll:
                    existing = session.query(Enrollment).filter_by(class_id=class_id, student_id=student_id).first()
                    if not existing:
                        enrollment = Enrollment(class_id=class_id, student_id=student_id)
                        session.add(enrollment)
                
                session.commit()
            return True, "Alunos matriculados com sucesso."
            
        except SQLAlchemyError as e:
            return False, f"Erro de banco de dados ao processar lote: {str(e)}"
        except Exception as e:
            return False, f"Erro ao processar lote: {str(e)}"