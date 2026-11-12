import pytest

from app.database import db
from app.database.models import AdaptiveSession, Question, Submission
from app.services.supabase_service import SupabaseService
from app.services.submission_service import QuestionService
from tests.conftest import auth


@pytest.fixture
def fake_db(monkeypatch):
    """O gabarito retorna 1 linha [1]; a consulta do aluno acerta se contiver 'certo'."""
    def fake_execute(cls, client, sql, retries=3, backoff=0.5):
        if 'erro_sintaxe' in sql:
            return {'data': None, 'error': 'syntax error'}
        value = 1 if ('certo' in sql or sql.strip().startswith('SELECT ') and 'aluno' not in sql) else 2
        return {'data': {'columns': ['a'], 'rows': [[value]], 'total': 1}, 'error': None}
    monkeypatch.setattr(SupabaseService, 'execute_query', classmethod(fake_execute))


def start(client, s1):
    r = client.get('/adaptive/rh/start-or-next', headers=auth(s1, 'student'))
    assert r.status_code == 200, r.json
    return r.json


def submit(client, s1, qid, sql):
    return client.post('/validate', json={'question_id': qid, 'student_sql': sql}, headers=auth(s1, 'student'))


def test_starts_at_median_and_hides_answers(client, data, fake_db):
    state = start(client, data['s1'])
    assert state['current_question']['question_order'] == 3
    assert 'expected_query' not in state['current_question']
    r = client.get('/questions/rh', headers=auth(data['s1'], 'student'))
    assert all('expected_query' not in q for q in r.json)
    assert client.get('/questions').status_code == 401
    assert client.get('/questions', headers=auth(data['s1'], 'student')).status_code == 403


def test_wrong_answer_keeps_question_and_correct_advances(client, data, fake_db):
    state = start(client, data['s1'])
    qid = state['current_question']['id']
    r = submit(client, data['s1'], qid, "SELECT 'aluno'")
    assert r.json['valid'] is False
    assert r.json['adaptive_state']['current_question']['id'] == qid
    assert r.json['adaptive_state']['advanced'] is False
    # erro de execução também não move a trilha e devolve o estado
    r = submit(client, data['s1'], qid, "SELECT erro_sintaxe aluno")
    assert r.json['adaptive_state']['current_question']['id'] == qid
    r = submit(client, data['s1'], qid, "SELECT 'certo' aluno")
    assert r.json['valid'] is True
    st = r.json['adaptive_state']
    assert st['advanced'] and st['mastered_until'] == 3 and st['current_question']['question_order'] == 4


def test_skip_requires_time_and_goes_down(client, app, data, fake_db):
    state = start(client, data['s1'])
    qid = state['current_question']['id']
    r = client.post('/validate/skip', json={'question_id': qid}, headers=auth(data['s1'], 'student'))
    assert r.status_code == 400 and 'Aguarde' in r.json['error']
    app.config['SKIP_MIN_SECONDS'] = 0
    r = client.post('/validate/skip', json={'question_id': qid}, headers=auth(data['s1'], 'student'))
    assert r.status_code == 200, r.json
    st = r.json['adaptive_state']
    # H=0, L=3 -> mediana (0+3)//2 = 1, que é a questão fundamental (não pode ser pulada)
    q1 = st['current_question']
    assert q1['question_order'] == 1 and st['skipped_orders'] == [3] and st['can_skip'] is False
    r = client.post('/validate/skip', json={'question_id': q1['id']}, headers=auth(data['s1'], 'student'))
    assert r.status_code == 400 and 'fundamental' in r.json['error']


def test_cannot_touch_other_student_or_locked_question(client, data, fake_db):
    start(client, data['s1'])
    q5 = db.session.query(Question).filter_by(question_order=5).one()
    r = submit(client, data['s1'], q5.id, "SELECT 'certo'")
    assert r.status_code == 403  # questão bloqueada na trilha
    # o aluno 2 não altera a sessão do aluno 1, mesmo enviando o session_id dela
    s1_session = db.session.query(AdaptiveSession).filter_by(student_id=data['s1'].id).one()
    r = client.post('/validate', json={'question_id': s1_session.current_question_id, 'session_id': s1_session.id,
                                       'student_sql': "SELECT 'certo'"}, headers=auth(data['s2'], 'student'))
    db.session.refresh(s1_session)
    assert s1_session.highest_mastered_order == 0


def test_finish_keeps_finished_and_reopens_with_new_question(client, data, fake_db):
    for _ in range(10):
        state = start(client, data['s1'])
        if state['is_finished']:
            break
        submit(client, data['s1'], state['current_question']['id'], "SELECT 'certo'")
    assert start(client, data['s1'])['is_finished'] is True
    ok, _ = QuestionService.create_question({'scenario_database_id': data['scenario'].id, 'statement': 'Nova',
                                             'expected_query': 'SELECT 9', 'difficulty': 3})
    assert ok
    state = start(client, data['s1'])
    assert state['is_finished'] is False and state['current_question']['statement'] == 'Nova'


def test_delete_question_closes_gap_and_keeps_session_valid(client, data, fake_db):
    state = start(client, data['s1'])
    current_id = state['current_question']['id']
    q2 = db.session.query(Question).filter_by(question_order=2).one()
    ok, _ = QuestionService.delete_question(q2.id)
    assert ok
    orders = [q.question_order for q in QuestionService.trail_questions(data['scenario'].id)]
    assert orders == [1, 2, 3, 4]
    state = start(client, data['s1'])
    assert state['current_question']['id'] == current_id
    assert state['current_question']['question_order'] == 2


def test_create_question_requires_difficulty_and_orders_by_it(client, data):
    h = auth(data['t1'], 'teacher')
    r = client.post('/questions', json={'scenario_database_id': data['scenario'].id, 'statement': 'X',
                                        'expected_query': 'SELECT 1'}, headers=h)
    assert r.status_code == 400 and 'dificuldade' in r.json['error']
    r = client.post('/questions', json={'scenario_database_id': data['scenario'].id, 'statement': 'Fácil',
                                        'expected_query': 'SELECT 1', 'difficulty': 1}, headers=h)
    assert r.status_code == 201
    assert r.json['question_order'] == 3  # depois das 2 fáceis, antes das médias


def test_update_question_keeps_submissions(client, data, fake_db):
    state = start(client, data['s1'])
    qid = state['current_question']['id']
    submit(client, data['s1'], qid, "SELECT 'aluno'")
    ok, _ = QuestionService.update_question(qid, {'statement': 'Novo enunciado'})
    assert ok
    assert db.session.query(Submission).filter_by(question_id=qid).count() == 1


def test_new_easy_question_below_mastered_is_presented(client, data, fake_db):
    for _ in range(10):
        state = start(client, data['s1'])
        if state['is_finished']:
            break
        submit(client, data['s1'], state['current_question']['id'], "SELECT 'certo'")
    ok, q = QuestionService.create_question({'scenario_database_id': data['scenario'].id, 'statement': 'Fácil nova',
                                             'expected_query': 'SELECT 1', 'difficulty': 1})
    assert ok
    state = start(client, data['s1'])
    assert state['is_finished'] is False
    assert state['mastered_until'] < q.question_order
