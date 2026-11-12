import io

from app.database import db
from app.database.models import Student, Enrollment, AdaptiveSession, Submission, Admin
from tests.conftest import auth


def test_first_access_requires_code(client, data):
    h = auth(data['t1'], 'teacher')
    r = client.post(f"/classrooms/{data['class'].id}/enroll", json={'matricula': '2023101', 'nome': 'Novo'}, headers=h)
    assert r.status_code == 200, r.json
    code = r.json['created'][0]['access_code']
    r = client.post('/auth/student/first-access', json={'registration_number': '2023101', 'access_code': 'ERRADO',
                                                       'new_password': 'segredo1'})
    assert r.status_code == 400
    r = client.post('/auth/student/first-access', json={'registration_number': '2023101', 'access_code': code,
                                                       'new_password': 'segredo1'})
    assert r.status_code == 200
    r = client.post('/auth/login', json={'login_id': '2023101', 'password': 'segredo1', 'role': 'student'})
    assert r.status_code == 200 and r.json['access_token']
    r = client.post('/auth/login', json={'login_id': 'naoexiste', 'password': 'x', 'role': 'student'})
    assert r.status_code == 401 and r.json['error'].startswith('Credenciais inválidas.')


def test_teacher_scope(client, data):
    h2 = auth(data['t2'], 'teacher')
    s1 = data['s1']
    assert client.put(f'/auth/student/{s1.id}', json={'name': 'X'}, headers=h2).status_code == 403
    assert client.delete(f'/auth/student/{s1.id}', headers=auth(data['t1'], 'teacher')).status_code == 403
    assert client.get(f"/reports/classes/{data['class'].id}/questions/details", headers=h2).status_code == 403
    assert client.get(f'/reports/students/{s1.id}/progress', headers=h2).status_code == 403
    assert client.get(f"/classrooms/{data['class'].id}", headers=h2).status_code == 403
    assert client.get('/auth/students', headers=h2).json == []
    assert len(client.get('/auth/students', headers=auth(data['t1'], 'teacher')).json) == 1
    assert client.get(f"/classrooms/{data['class'].id}", headers=auth(data['s2'], 'student')).status_code == 403
    assert client.get(f"/auth/student/{data['s2'].id}", headers=auth(s1, 'student')).status_code == 403


def test_delete_cascades(client, data):
    s1 = data['s1']
    db.session.add(AdaptiveSession(student_id=s1.id, scenario_database_id=data['scenario'].id))
    db.session.commit()
    r = client.delete(f'/auth/student/{s1.id}', headers=auth(data['admin'], 'admin'))
    assert r.status_code == 200
    assert db.session.query(Enrollment).count() == 0
    assert db.session.query(AdaptiveSession).count() == 0
    # IDs não são reaproveitados
    new = Student(name='Outro', registration_number='Z9')
    db.session.add(new)
    db.session.commit()
    assert new.id > s1.id


def test_admin_cannot_delete_self_or_last(client, data):
    a = data['admin']
    r = client.delete(f'/auth/admin/{a.id}', headers=auth(a, 'admin'))
    assert r.status_code == 400


def test_bulk_import_csv_comma_and_xlsx(client, data):
    h = auth(data['t1'], 'teacher')
    csv = 'matricula,nome\n00123,Ana\n2023102,Bruno\n'.encode()
    r = client.post(f"/classrooms/{data['class'].id}/enroll/bulk", data={'file': (io.BytesIO(csv), 'ALUNOS.CSV')},
                    headers=h, content_type='multipart/form-data')
    assert r.status_code == 200, r.json
    assert {c['registration_number'] for c in r.json['created']} == {'00123', '2023102'}
    import pandas as pd
    buf = io.BytesIO()
    pd.DataFrame({'matricula': [2023200, 2023201], 'nome': ['C', 'D']}).to_excel(buf, index=False)
    buf.seek(0)
    r = client.post(f"/classrooms/{data['class'].id}/enroll/bulk", data={'file': (buf, 'a.xlsx')},
                    headers=h, content_type='multipart/form-data')
    assert r.status_code == 200, r.json
    assert {c['registration_number'] for c in r.json['created']} == {'2023200', '2023201'}


def test_expired_token_returns_json_error(client):
    r = client.get('/scenarios', headers={'Authorization': 'Bearer abc'})
    assert r.status_code == 401 and 'error' in r.json


def test_teacher_cannot_take_over_foreign_student(client, data):
    from app.database.models import Class
    t2 = data['t2']
    c2 = Class(teacher_id=t2.id, class_name='T2', subject='BD', year_semester='2026/1')
    db.session.add(c2)
    db.session.commit()
    h2 = auth(t2, 'teacher')
    # nome divergente: recusado
    r = client.post(f'/classrooms/{c2.id}/enroll', json={'matricula': 'A1', 'nome': 'Outro Nome'}, headers=h2)
    assert r.status_code == 400
    # mesmo nome: matricula, mas o aluno é compartilhado e não pode ser alterado pelo professor
    r = client.post(f'/classrooms/{c2.id}/enroll', json={'matricula': 'A1', 'nome': 'Aluno 1'}, headers=h2)
    assert r.status_code == 200
    sid = data['s1'].id
    assert client.post(f'/auth/student/{sid}/access-code', headers=h2).status_code == 403
    assert client.put(f'/auth/student/{sid}', json={'registration_number': 'X'}, headers=h2).status_code == 403
    assert client.post(f'/auth/student/{sid}/access-code', headers=auth(data['admin'], 'admin')).status_code == 200


def test_quoted_function_names_blocked():
    from app.services.sql_grader import SQLGrader
    assert not SQLGrader.is_safe_query('SELECT "pg_sleep"(3)')[0]
    assert not SQLGrader.is_safe_query("SELECT pg_catalog.\"set_config\"('a','b',false)")[0]
    assert SQLGrader.is_safe_query('SELECT 1 AS "delete"')[0]
