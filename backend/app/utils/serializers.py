"""Conversão das entidades do banco em dicionários seguros para JSON."""


def _iso(value):
    return value.isoformat() if value is not None and hasattr(value, 'isoformat') else value


def serialize_user(user):
    """Converte Admin/Teacher/Student em dicionário (nunca inclui hashes)."""
    if not user:
        return None
    data = {"id": user.id, "name": user.name}
    if hasattr(user, 'email'):
        data['email'] = user.email
    if hasattr(user, 'registration_number'):
        data['registration_number'] = user.registration_number
    if hasattr(user, 'access_code_hash'):
        data['first_access_pending'] = user.password_hash is None
    return data


def serialize_class(classroom):
    if not classroom:
        return None
    return {
        "id": classroom.id,
        "teacher_id": classroom.teacher_id,
        "class_name": classroom.class_name,
        "subject": classroom.subject,
        "year_semester": classroom.year_semester,
    }


def serialize_scenario(scenario, has_credentials=None, question_count=None):
    if not scenario:
        return None
    data = {
        "id": scenario.id,
        "slug": scenario.slug,
        "name": scenario.name,
        "diagram_url": scenario.diagram_url,
    }
    if has_credentials is not None:
        data["has_credentials"] = has_credentials
    if question_count is not None:
        data["question_count"] = question_count
    return data


def serialize_question(question, include_answer=False):
    """
    Converte uma Question em dicionário. O gabarito (expected_query) só é incluído
    quando include_answer=True, ou seja, para professores e administradores.
    """
    if not question:
        return None
    data = {
        "id": question.id,
        "scenario_database_id": question.scenario_database_id,
        "statement": question.statement,
        "question_order": question.question_order,
        "difficulty": question.difficulty,
        "is_special": bool(question.is_special),
    }
    if include_answer:
        data["expected_query"] = question.expected_query
    return data


def serialize_submission(submission):
    if not submission:
        return None
    return {
        "id": submission.id,
        "student_id": submission.student_id,
        "question_id": submission.question_id,
        "adaptive_session_id": submission.adaptive_session_id,
        "time_spent_seconds": submission.time_spent_seconds,
        "submitted_query": submission.submitted_query,
        "is_correct": submission.is_correct,
        "is_skipped": submission.is_skipped,
        "is_practice": submission.is_practice,
        "attempt_number": submission.attempt_number,
        "submitted_at": _iso(submission.submitted_at),
    }
