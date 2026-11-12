import pytest
from flask_jwt_extended import create_access_token

from app import create_app
from app.database import db
from app.database.models import Admin, Teacher, Student, Class, Enrollment, ScenarioDatabase, Question
from app.services.supabase_service import SupabaseService


class FakeClient:
    """Cliente falso: o resultado é decidido pelo monkeypatch de execute_query nos testes."""


@pytest.fixture
def app(monkeypatch):
    app = create_app('app.config.TestingConfig')
    app.config['SKIP_MIN_SECONDS'] = 180
    monkeypatch.setattr(SupabaseService, 'get_client', classmethod(lambda cls, slug: FakeClient()))
    SupabaseService.invalidate_expected_cache()
    with app.app_context():
        yield app
        db.session.remove()
        db.drop_all()


@pytest.fixture
def client(app):
    return app.test_client()


@pytest.fixture
def data(app):
    """Cenário com 5 questões na trilha, admin, 2 professores, 2 alunos e 1 turma."""
    admin = Admin(name='Admin', email='admin@x.com', password_hash='x')
    t1 = Teacher(name='Prof 1', email='p1@x.com', registration_number='T1', password_hash='x')
    t2 = Teacher(name='Prof 2', email='p2@x.com', registration_number='T2', password_hash='x')
    s1 = Student(name='Aluno 1', registration_number='A1', password_hash='x')
    s2 = Student(name='Aluno 2', registration_number='A2', password_hash='x')
    sc = ScenarioDatabase(slug='rh', name='RH', diagram_url='/rh.png')
    db.session.add_all([admin, t1, t2, s1, s2, sc])
    db.session.flush()
    for i in range(1, 6):
        db.session.add(Question(scenario_database_id=sc.id, statement=f'Q{i}', expected_query=f'SELECT {i}',
                                question_order=i, difficulty=1 if i <= 2 else 2, is_special=False))
    c1 = Class(teacher_id=t1.id, class_name='Turma', subject='BD', year_semester='2026/1')
    db.session.add(c1)
    db.session.flush()
    db.session.add(Enrollment(class_id=c1.id, student_id=s1.id))
    db.session.commit()
    return {'admin': admin, 't1': t1, 't2': t2, 's1': s1, 's2': s2, 'scenario': sc, 'class': c1}


def token(user, role):
    return create_access_token(identity=str(user.id), additional_claims={'role': role, 'user_id': user.id})


def auth(user, role):
    return {'Authorization': f'Bearer {token(user, role)}'}
