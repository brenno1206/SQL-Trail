import io

import pandas as pd
from sqlalchemy.exc import SQLAlchemyError

from app.database import db
from app.database.models import Class, Enrollment, Student, Teacher
from app.services.auth_service import AuthService, normalize_registration
from app.utils.decorators import clean_str


class ClassroomService:
    """Operações de turmas: CRUD, matrículas e verificações de vínculo."""

    # ------------------------------------------------------------------
    # Consultas
    # ------------------------------------------------------------------

    @staticmethod
    def get_all_classes():
        try:
            return True, db.session.query(Class).order_by(Class.year_semester.desc(), Class.class_name).all()
        except SQLAlchemyError as e:
            return False, {"error": f"Erro ao buscar turmas: {str(e)}"}

    @staticmethod
    def get_class_by_id(class_id):
        try:
            classroom = db.session.get(Class, class_id)
            if classroom:
                return True, classroom
            return False, {"error": "Turma não encontrada."}
        except SQLAlchemyError as e:
            return False, {"error": f"Erro ao buscar a turma: {str(e)}"}

    @staticmethod
    def get_classes_by_teacher(teacher_id):
        try:
            return True, db.session.query(Class).filter_by(teacher_id=teacher_id) \
                .order_by(Class.year_semester.desc(), Class.class_name).all()
        except SQLAlchemyError as e:
            return False, {"error": f"Erro ao buscar turmas do professor: {str(e)}"}

    @staticmethod
    def get_classes_for_student(student_id):
        try:
            return True, db.session.query(Class).join(Enrollment).filter(Enrollment.student_id == student_id).all()
        except SQLAlchemyError as e:
            return False, {"error": f"Erro ao buscar turmas do aluno: {str(e)}"}

    @staticmethod
    def get_students_in_class(class_id):
        try:
            students = db.session.query(Student).join(Enrollment).filter(
                Enrollment.class_id == class_id).order_by(Student.name).all()
            return True, students
        except SQLAlchemyError as e:
            return False, {"error": f"Erro ao buscar alunos da turma: {str(e)}"}

    @staticmethod
    def get_students_of_teacher(teacher_id):
        """Alunos matriculados em qualquer turma do professor (sem repetição)."""
        try:
            students = db.session.query(Student).join(Enrollment).join(Class).filter(
                Class.teacher_id == teacher_id).distinct().order_by(Student.name).all()
            return True, students
        except SQLAlchemyError as e:
            return False, {"error": f"Erro ao buscar alunos: {str(e)}"}

    # ------------------------------------------------------------------
    # Verificações de vínculo (autorização)
    # ------------------------------------------------------------------

    @staticmethod
    def verify_class_ownership(class_id, teacher_id):
        try:
            return db.session.query(Class).filter_by(id=class_id, teacher_id=teacher_id).first() is not None
        except SQLAlchemyError:
            return False

    @staticmethod
    def is_student_enrolled(class_id, student_id):
        try:
            return db.session.query(Enrollment).filter_by(class_id=class_id, student_id=student_id).first() is not None
        except SQLAlchemyError:
            return False

    @staticmethod
    def teacher_manages_student(teacher_id, student_id):
        """
        True se o aluno está matriculado SOMENTE em turmas do professor. Ações sensíveis (editar
        cadastro, gerar novo código de acesso) exigem esse vínculo exclusivo; alunos compartilhados
        com outros professores só podem ser alterados pelo administrador.
        """
        try:
            owners = {tid for (tid,) in db.session.query(Class.teacher_id).join(Enrollment).filter(
                Enrollment.student_id == student_id).distinct()}
            return owners == {teacher_id}
        except SQLAlchemyError:
            return False

    @staticmethod
    def teacher_has_student(teacher_id, student_id):
        """True se o aluno está matriculado em alguma turma do professor."""
        try:
            return db.session.query(Enrollment).join(Class).filter(
                Class.teacher_id == teacher_id, Enrollment.student_id == student_id).first() is not None
        except SQLAlchemyError:
            return False

    # ------------------------------------------------------------------
    # CRUD de turmas
    # ------------------------------------------------------------------

    @staticmethod
    def _class_fields(data, partial=False):
        fields = {}
        for key, label in (('class_name', 'Nome da turma'), ('subject', 'Disciplina'), ('year_semester', 'Ano/Semestre')):
            value = clean_str(data.get(key))
            if value:
                fields[key] = value
            elif not partial:
                raise ValueError(f"{label} é obrigatório.")
        return fields

    @staticmethod
    def create_class(data):
        if not isinstance(data, dict):
            return False, {"error": "Dados inválidos."}
        try:
            fields = ClassroomService._class_fields(data)
            try:
                teacher_id = int(data.get('teacher_id'))
            except (TypeError, ValueError):
                return False, {"error": "Professor responsável inválido."}
            if not db.session.get(Teacher, teacher_id):
                return False, {"error": "Professor responsável não encontrado."}
            new_class = Class(teacher_id=teacher_id, **fields)
            db.session.add(new_class)
            db.session.commit()
            return True, new_class
        except ValueError as e:
            return False, {"error": str(e)}
        except SQLAlchemyError as e:
            db.session.rollback()
            return False, {"error": f"Erro ao criar turma: {str(e)}"}

    @staticmethod
    def update_class(class_id, data):
        if not isinstance(data, dict) or not data:
            return False, {"error": "Dados da turma são obrigatórios."}
        try:
            classroom = db.session.get(Class, class_id)
            if not classroom:
                return False, {"error": "Turma não encontrada."}
            for key, value in ClassroomService._class_fields(data, partial=True).items():
                setattr(classroom, key, value)
            db.session.commit()
            return True, classroom
        except SQLAlchemyError as e:
            db.session.rollback()
            return False, {"error": f"Erro ao atualizar turma: {str(e)}"}

    @staticmethod
    def delete_class(class_id):
        try:
            classroom = db.session.get(Class, class_id)
            if not classroom:
                return False, {"error": "Turma não encontrada."}
            db.session.delete(classroom)
            db.session.commit()
            return True, {"msg": "Turma deletada com sucesso."}
        except SQLAlchemyError as e:
            db.session.rollback()
            return False, {"error": f"Erro ao deletar turma: {str(e)}"}

    # ------------------------------------------------------------------
    # Matrículas
    # ------------------------------------------------------------------

    @staticmethod
    def unenroll_student(class_id, student_id):
        try:
            enrollment = db.session.query(Enrollment).filter_by(class_id=class_id, student_id=student_id).first()
            if not enrollment:
                return False, {"error": "Matrícula não encontrada."}
            db.session.delete(enrollment)
            db.session.commit()
            return True, {"msg": "Matrícula cancelada com sucesso."}
        except SQLAlchemyError as e:
            db.session.rollback()
            return False, {"error": f"Erro ao cancelar matrícula: {str(e)}"}

    @staticmethod
    def _enroll_one(class_id, registration_number, name, report, strict_name=False):
        """Busca ou cria o aluno e o matricula na turma (sem commit). Atualiza o relatório."""
        registration_number = normalize_registration(registration_number)
        name = clean_str(name)
        if not registration_number or not name:
            raise ValueError("Os campos 'matricula' e 'nome' são obrigatórios.")

        student = db.session.query(Student).filter_by(registration_number=registration_number).first()
        if student is None:
            student, code = AuthService.build_student({"registration_number": registration_number, "name": name})
            report["created"].append({"registration_number": registration_number, "name": name, "access_code": code})
        elif student.name.strip().lower() != name.lower():
            if strict_name:
                # Impede que um professor matricule (e passe a gerenciar) um aluno qualquer
                # apenas conhecendo a matrícula.
                raise ValueError(
                    f"A matrícula {registration_number} já está cadastrada com outro nome. "
                    "Confira os dados ou peça ao administrador para matricular este aluno.")
            report["warnings"].append(
                f"Matrícula {registration_number} já pertence a '{student.name}' (nome informado: '{name}'). "
                "O cadastro existente foi mantido.")

        if not db.session.query(Enrollment).filter_by(class_id=class_id, student_id=student.id).first():
            db.session.add(Enrollment(class_id=class_id, student_id=student.id))
            report["enrolled"] += 1
        else:
            report["already_enrolled"] += 1
        return student

    @staticmethod
    def _new_report():
        return {"created": [], "warnings": [], "enrolled": 0, "already_enrolled": 0}

    @staticmethod
    def enroll_student_by_registration(class_id, registration_number, name, strict_name=False):
        report = ClassroomService._new_report()
        try:
            ClassroomService._enroll_one(class_id, registration_number, name, report, strict_name)
            db.session.commit()
            msg = "Aluno matriculado com sucesso." if report["enrolled"] else "O aluno já estava matriculado nesta turma."
            return True, {"msg": msg, **report}
        except ValueError as e:
            db.session.rollback()
            return False, {"error": str(e), "status": 400}
        except SQLAlchemyError as e:
            db.session.rollback()
            return False, {"error": f"Erro de banco ao matricular: {str(e)}", "status": 500}

    @staticmethod
    def read_student_sheet(filename, content):
        """Lê CSV (separador detectado automaticamente) ou XLSX como texto, preservando zeros à esquerda."""
        name = (filename or '').lower()
        if name.endswith('.csv'):
            for encoding in ('utf-8-sig', 'latin-1'):
                try:
                    return pd.read_csv(io.BytesIO(content), sep=None, engine='python', dtype=str,
                                       encoding=encoding, keep_default_na=False)
                except UnicodeDecodeError:
                    continue
            raise ValueError("Não foi possível ler o CSV (codificação não suportada).")
        if name.endswith('.xlsx'):
            return pd.read_excel(io.BytesIO(content), dtype=str, engine='openpyxl', keep_default_na=False)
        if name.endswith('.xls'):
            raise ValueError("Formato .xls (Excel 97-2003) não suportado. Salve a planilha como .xlsx ou .csv.")
        raise ValueError("Formato inválido. Envie um arquivo .csv ou .xlsx.")

    @staticmethod
    def bulk_enroll_from_dataframe(class_id, df, strict_name=False):
        """Matricula em lote, de forma atômica: ou todos são processados, ou nenhum."""
        df.columns = [str(col).strip().lower() for col in df.columns]
        if 'matricula' not in df.columns or 'nome' not in df.columns:
            return False, {"error": "O arquivo deve conter as colunas 'matricula' e 'nome'.", "status": 400}

        report = ClassroomService._new_report()
        try:
            for line, row in enumerate(df.itertuples(index=False), start=2):
                record = dict(zip(df.columns, row))
                mat = normalize_registration(record.get('matricula'))
                nome = clean_str(record.get('nome'))
                if not mat and not nome:
                    continue
                if not mat or not nome or mat.lower() == 'nan':
                    report["warnings"].append(f"Linha {line} ignorada: matrícula ou nome em branco.")
                    continue
                ClassroomService._enroll_one(class_id, mat, nome, report, strict_name)
            db.session.commit()
            msg = (f"{report['enrolled']} aluno(s) matriculado(s); {len(report['created'])} novo(s) cadastro(s); "
                   f"{report['already_enrolled']} já estavam na turma.")
            return True, {"message": msg, **report}
        except ValueError as e:
            db.session.rollback()
            return False, {"error": f"Erro ao processar lote: {str(e)}", "status": 400}
        except SQLAlchemyError as e:
            db.session.rollback()
            return False, {"error": f"Erro de banco de dados ao processar lote: {str(e)}", "status": 500}
