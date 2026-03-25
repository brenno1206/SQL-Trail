from sqlalchemy import Column, Integer, String, TIMESTAMP, text, ForeignKey, Text, Boolean, CheckConstraint
from sqlalchemy.orm import declarative_base

Base = declarative_base()

class Admin(Base):
    __tablename__ = 'admins'
    id = Column(Integer, primary_key=True, autoincrement=True)
    name = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    created_at = Column(TIMESTAMP, server_default=text('CURRENT_TIMESTAMP'))

class Teacher(Base):
    __tablename__ = 'teachers'
    id = Column(Integer, primary_key=True, autoincrement=True)
    registration_number = Column(String(50), unique=True, nullable=False)
    name = Column(String(100), nullable=False)
    email = Column(String(100), unique=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    created_at = Column(TIMESTAMP, server_default=text('CURRENT_TIMESTAMP'))

class Student(Base):
    __tablename__ = 'students'
    id = Column(Integer, primary_key=True, autoincrement=True)
    registration_number = Column(String(50), unique=True, nullable=False)
    name = Column(String(100), nullable=False)
    password_hash = Column(String(255), nullable=True)
    created_at = Column(TIMESTAMP, server_default=text('CURRENT_TIMESTAMP'))

class Class(Base):
    __tablename__ = 'classes'
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

class ScenarioDatabase(Base):
    __tablename__ = 'scenario_databases'
    id = Column(Integer, primary_key=True, autoincrement=True)
    slug = Column(String(100), unique=True, nullable=False)
    name = Column(String(100), nullable=False)
    diagram_url = Column(String(255), nullable=False)
    created_at = Column(TIMESTAMP, server_default=text('CURRENT_TIMESTAMP'))

class Question(Base):
    __tablename__ = 'questions'
    id = Column(Integer, primary_key=True, autoincrement=True)
    scenario_database_id = Column(Integer, ForeignKey('scenario_databases.id', ondelete='CASCADE'), nullable=False)
    statement = Column(Text, nullable=False)
    expected_query = Column(Text, nullable=False)
    difficulty = Column(Integer, nullable=False)
    is_special = Column(Boolean, default=False)
    created_at = Column(TIMESTAMP, server_default=text('CURRENT_TIMESTAMP'))
    
    __table_args__ = (
        CheckConstraint('difficulty >= 1 AND difficulty <= 100', name='check_difficulty_range'),
    )

class Submission(Base):
    __tablename__ = 'submissions'
    id = Column(Integer, primary_key=True, autoincrement=True)
    student_id = Column(Integer, ForeignKey('students.id', ondelete='CASCADE'), nullable=False)
    question_id = Column(Integer, ForeignKey('questions.id', ondelete='CASCADE'), nullable=False)
    time_spent_seconds = Column(Integer, nullable=False)
    submitted_query = Column(Text, nullable=False)
    is_correct = Column(Boolean, nullable=False, default=False)
    execution_output = Column(Text, nullable=True)
    submitted_at = Column(TIMESTAMP, server_default=text('CURRENT_TIMESTAMP'))