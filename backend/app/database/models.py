from datetime import datetime, timezone

from sqlalchemy import Column, Integer, String, TIMESTAMP, text, ForeignKey, Text, Boolean
from sqlalchemy.orm import declarative_base

Base = declarative_base()


def utcnow():
    """Data/hora atual em UTC, sem fuso (mesmo formato do CURRENT_TIMESTAMP do SQLite)."""
    return datetime.now(timezone.utc).replace(tzinfo=None)


# `sqlite_autoincrement` impede que o SQLite reaproveite IDs de registros excluídos
# (sem ele, um aluno novo poderia "herdar" o ID e os dados de um aluno apagado).
_AUTOINC = {'sqlite_autoincrement': True}


class Admin(Base):
    __tablename__ = 'admins'
    __table_args__ = _AUTOINC
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    created_at = Column(TIMESTAMP, server_default=text('CURRENT_TIMESTAMP'))


class Teacher(Base):
    __tablename__ = 'teachers'
    __table_args__ = _AUTOINC
    id = Column(Integer, primary_key=True, autoincrement=True)
    registration_number = Column(String(50), unique=True, nullable=False)
    name = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    created_at = Column(TIMESTAMP, server_default=text('CURRENT_TIMESTAMP'))


class Student(Base):
    __tablename__ = 'students'
    __table_args__ = _AUTOINC
    id = Column(Integer, primary_key=True, autoincrement=True)
    registration_number = Column(String(50), unique=True, nullable=False)
    name = Column(String(100), nullable=False)
    password_hash = Column(String(255), nullable=True)
    # Hash do código de primeiro acesso (gerado pelo professor/admin). Só existe
    # enquanto o aluno não define a própria senha.
    access_code_hash = Column(String(255), nullable=True)
    created_at = Column(TIMESTAMP, server_default=text('CURRENT_TIMESTAMP'))


class Class(Base):
    __tablename__ = 'classes'
    __table_args__ = _AUTOINC
    id = Column(Integer, primary_key=True, autoincrement=True)
    teacher_id = Column(Integer, ForeignKey('teachers.id', ondelete='CASCADE'), nullable=False)
    class_name = Column(String(100), nullable=False)
    subject = Column(String(100), nullable=False)
    year_semester = Column(String(20), nullable=False)
    created_at = Column(TIMESTAMP, server_default=text('CURRENT_TIMESTAMP'))


class Enrollment(Base):
    __tablename__ = 'enrollments'
    class_id = Column(Integer, ForeignKey('classes.id', ondelete='CASCADE'), primary_key=True)
    student_id = Column(Integer, ForeignKey('students.id', ondelete='CASCADE'), primary_key=True)
    # Data da matrícula: as métricas da turma consideram apenas submissões posteriores a ela.
    created_at = Column(TIMESTAMP, nullable=True, default=utcnow)


class ScenarioDatabase(Base):
    __tablename__ = 'scenario_databases'
    __table_args__ = _AUTOINC
    id = Column(Integer, primary_key=True, autoincrement=True)
    slug = Column(String(100), unique=True, nullable=False)
    name = Column(String(100), nullable=False)
    diagram_url = Column(String(255), nullable=False)
    created_at = Column(TIMESTAMP, server_default=text('CURRENT_TIMESTAMP'))


class Question(Base):
    """
    Questão de um cenário.

    As questões normais (is_special = False) formam a trilha adaptativa. Sua `question_order`
    é mantida contígua (1..N) e ordenada por dificuldade pelo QuestionService, de modo que a
    trilha corresponda a uma árvore de busca binária ordenada por nível de dificuldade.
    As questões especiais (desafios) ficam fora da trilha e têm numeração própria (1..M).
    """
    __tablename__ = 'questions'
    __table_args__ = _AUTOINC
    id = Column(Integer, primary_key=True, autoincrement=True)
    scenario_database_id = Column(Integer, ForeignKey('scenario_databases.id', ondelete='CASCADE'), nullable=False)
    statement = Column(Text, nullable=False)
    expected_query = Column(Text, nullable=False)
    question_order = Column(Integer, nullable=False)  # Posição na trilha (1..N)
    difficulty = Column(Integer, nullable=False)       # 1 = Fácil, 2 = Médio, 3 = Difícil
    is_special = Column(Boolean, default=False, nullable=False)
    created_at = Column(TIMESTAMP, server_default=text('CURRENT_TIMESTAMP'))


class AdaptiveSession(Base):
    """
    Estado da busca binária (CAT) de um aluno em um cenário.

    highest_mastered_order (H) = maior posição da trilha considerada dominada.
    lowest_failed_order (L)    = menor posição em que o aluno pulou (limite superior).
    A próxima questão é a mediana do intervalo (H, L).
    """
    __tablename__ = 'adaptive_sessions'
    __table_args__ = _AUTOINC
    id = Column(Integer, primary_key=True, autoincrement=True)
    student_id = Column(Integer, ForeignKey('students.id', ondelete='CASCADE'), nullable=False)
    scenario_database_id = Column(Integer, ForeignKey('scenario_databases.id', ondelete='CASCADE'), nullable=False)
    current_question_id = Column(Integer, ForeignKey('questions.id', ondelete='SET NULL'), nullable=True)
    current_question_order = Column(Integer, nullable=True)
    current_question_started_at = Column(TIMESTAMP, nullable=True)
    highest_mastered_order = Column(Integer, default=0)
    lowest_failed_order = Column(Integer, nullable=True)
    is_finished = Column(Boolean, default=False)
    created_at = Column(TIMESTAMP, server_default=text('CURRENT_TIMESTAMP'))


class Submission(Base):
    __tablename__ = 'submissions'
    __table_args__ = _AUTOINC
    id = Column(Integer, primary_key=True, autoincrement=True)
    student_id = Column(Integer, ForeignKey('students.id', ondelete='CASCADE'), nullable=False)
    question_id = Column(Integer, ForeignKey('questions.id', ondelete='CASCADE'), nullable=False)
    adaptive_session_id = Column(Integer, ForeignKey('adaptive_sessions.id', ondelete='CASCADE'), nullable=True)
    time_spent_seconds = Column(Integer, nullable=False)
    submitted_query = Column(Text, nullable=True)
    is_correct = Column(Boolean, nullable=False, default=False)
    is_skipped = Column(Boolean, nullable=False, default=False)
    # True quando a submissão foi feita fora da questão atual da trilha (modo prática).
    is_practice = Column(Boolean, nullable=False, default=False)
    attempt_number = Column(Integer, default=1)
    execution_output = Column(Text, nullable=True)
    submitted_at = Column(TIMESTAMP, server_default=text('CURRENT_TIMESTAMP'), default=utcnow)
