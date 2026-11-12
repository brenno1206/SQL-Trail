from sqlalchemy import func, distinct, case, exists, and_, or_
from sqlalchemy.exc import SQLAlchemyError

from app.database import db
from app.database.models import ScenarioDatabase, Question, Submission, Enrollment, Class, Student, AdaptiveSession


def _pct(part, whole):
    return round(part / whole * 100, 2) if whole else 0.0


class ReportService:
    """
    Relatórios de desempenho.

    Definições usadas em todo o sistema:
      - Tentativa: submissão de consulta (pulos não contam como tentativa).
      - Taxa de acerto: alunos que acertaram / alunos que tentaram a questão.
      - Taxa de acerto por tentativa: tentativas corretas / tentativas.
    """

    @staticmethod
    def get_question_metrics(scenario_id=None, class_id=None, year_semester=None, question_id=None, teacher_id=None):
        """Estatísticas por questão, com filtros opcionais por cenário, turma, semestre e questão."""
        try:
            attempt = Submission.is_skipped.is_(False)
            correct = and_(Submission.is_correct.is_(True), attempt)
            query = db.session.query(
                Submission.question_id,
                func.sum(case((attempt, 1), else_=0)).label('total_attempts'),
                func.sum(case((correct, 1), else_=0)).label('correct_attempts'),
                func.sum(case((Submission.is_skipped.is_(True), 1), else_=0)).label('skips'),
                func.avg(case((attempt, Submission.time_spent_seconds), else_=None)).label('avg_time_spent'),
                func.count(distinct(Submission.student_id)).label('students_attempted'),
                func.count(distinct(case((correct, Submission.student_id), else_=None))).label('students_correct'),
            ).join(Question, Submission.question_id == Question.id)

            if class_id or year_semester or teacher_id:
                # EXISTS evita contar a mesma submissão várias vezes quando o aluno está em várias turmas;
                # só contam submissões feitas depois da matrícula na turma.
                conditions = [
                    Enrollment.student_id == Submission.student_id,
                    Enrollment.class_id == Class.id,
                    or_(Enrollment.created_at.is_(None), Submission.submitted_at >= Enrollment.created_at),
                ]
                if class_id:
                    conditions.append(Class.id == class_id)
                if year_semester:
                    conditions.append(Class.year_semester == year_semester)
                if teacher_id:
                    conditions.append(Class.teacher_id == teacher_id)
                query = query.filter(exists().where(and_(*conditions)))
            if scenario_id:
                query = query.filter(Question.scenario_database_id == scenario_id)
            if question_id:
                query = query.filter(Submission.question_id == question_id)

            metrics = []
            for row in query.group_by(Submission.question_id).all():
                total_attempts = int(row.total_attempts or 0)
                correct_attempts = int(row.correct_attempts or 0)
                students_attempted = int(row.students_attempted or 0)
                students_correct = int(row.students_correct or 0)
                metrics.append({
                    "question_id": row.question_id,
                    "total_attempts": total_attempts,
                    "correct_attempts": correct_attempts,
                    "skips": int(row.skips or 0),
                    "accuracy_percentage": _pct(students_correct, students_attempted),
                    "attempt_accuracy_percentage": _pct(correct_attempts, total_attempts),
                    "avg_time_spent_seconds": round(float(row.avg_time_spent or 0), 2),
                    "avg_attempts_per_student": round(total_attempts / students_attempted, 2) if students_attempted else 0.0,
                    "students_attempted": students_attempted,
                    "students_correct": students_correct,
                })
            return True, metrics
        except SQLAlchemyError as e:
            db.session.rollback()
            return False, {"error": f"Erro ao gerar métricas de questões: {str(e)}"}

    @staticmethod
    def get_user_last_correct_submissions(student_id, question_id=None, scenario_id=None):
        """Última submissão correta do aluno em cada questão."""
        try:
            subquery = db.session.query(func.max(Submission.id).label('max_id')).filter(
                Submission.student_id == student_id,
                Submission.is_correct.is_(True),
                Submission.is_skipped.is_(False),
            ).group_by(Submission.question_id).subquery()
            query = db.session.query(Submission).join(subquery, Submission.id == subquery.c.max_id)
            if scenario_id:
                query = query.join(Question, Submission.question_id == Question.id) \
                    .filter(Question.scenario_database_id == scenario_id)
            if question_id:
                query = query.filter(Submission.question_id == question_id)
            return True, query.all()
        except SQLAlchemyError as e:
            db.session.rollback()
            return False, {"error": f"Erro ao buscar últimas submissões: {str(e)}"}

    @staticmethod
    def get_user_question_engagement(student_id, question_id):
        try:
            result = db.session.query(
                func.sum(case((Submission.is_skipped.is_(False), 1), else_=0)).label('total_attempts'),
                func.sum(case((Submission.is_skipped.is_(True), 1), else_=0)).label('skips'),
                func.sum(Submission.time_spent_seconds).label('total_time'),
            ).filter(Submission.student_id == student_id, Submission.question_id == question_id).first()
            attempts = int(result.total_attempts or 0)
            total_time = int(result.total_time or 0)
            return True, {
                "question_id": question_id,
                "student_id": student_id,
                "total_attempts": attempts,
                "skips": int(result.skips or 0),
                "total_time_spent_seconds": total_time,
                "avg_time_spent_seconds": round(total_time / attempts, 2) if attempts else 0.0,
            }
        except SQLAlchemyError as e:
            db.session.rollback()
            return False, {"error": f"Erro ao buscar engajamento: {str(e)}"}

    @staticmethod
    def get_progress_summary(student_id, scenario_id=None):
        """
        Progresso do aluno. Como a trilha é adaptativa, o progresso na trilha considera o nível
        dominado (H) da sessão adaptativa; as questões efetivamente resolvidas são informadas à parte.
        """
        try:
            scenario_ids = [scenario_id] if scenario_id else [
                sid for (sid,) in db.session.query(ScenarioDatabase.id).all()]

            trail_total = mastered = 0
            for sid in scenario_ids:
                n = db.session.query(func.count(Question.id)).filter(
                    Question.scenario_database_id == sid, Question.is_special.is_(False)).scalar() or 0
                trail_total += n
                session = db.session.query(AdaptiveSession).filter_by(
                    student_id=student_id, scenario_database_id=sid).order_by(AdaptiveSession.id.desc()).first()
                if session:
                    mastered += min(session.highest_mastered_order or 0, n)

            solved_q = db.session.query(func.count(distinct(Submission.question_id))).join(Question).filter(
                Submission.student_id == student_id,
                Submission.is_correct.is_(True),
                Submission.is_skipped.is_(False),
            )
            time_q = db.session.query(func.sum(Submission.time_spent_seconds)).join(Question).filter(
                Submission.student_id == student_id)
            total_q = db.session.query(func.count(Question.id))
            if scenario_id:
                solved_q = solved_q.filter(Question.scenario_database_id == scenario_id)
                time_q = time_q.filter(Question.scenario_database_id == scenario_id)
                total_q = total_q.filter(Question.scenario_database_id == scenario_id)
            solved = solved_q.scalar() or 0
            total_questions = total_q.scalar() or 0

            return True, {
                "scenario_id": scenario_id if scenario_id else "all",
                "student_id": student_id,
                "trail_size": trail_total,
                "mastered_until": mastered,
                "completion_percentage": _pct(mastered, trail_total),
                "total_available_questions": total_questions,
                "total_solved_questions": solved,
                "solved_percentage": _pct(solved, total_questions),
                "total_time_seconds": int(time_q.scalar() or 0),
            }
        except SQLAlchemyError as e:
            db.session.rollback()
            return False, {"error": f"Erro ao buscar progresso: {str(e)}"}

    @staticmethod
    def get_class_questions_detail(class_id):
        """
        Detalhamento por questão de uma turma: quem acertou, quem ainda está tentando,
        tentativas até o primeiro acerto e tempo até acertar. Considera apenas submissões
        feitas depois da matrícula do aluno na turma.
        """
        try:
            rows = db.session.query(
                Submission.id, Submission.question_id, Submission.student_id, Submission.is_correct,
                Submission.is_skipped, Submission.time_spent_seconds, Submission.submitted_at, Student.name,
            ).join(Enrollment, Submission.student_id == Enrollment.student_id) \
             .join(Student, Student.id == Submission.student_id) \
             .filter(Enrollment.class_id == class_id) \
             .filter(or_(Enrollment.created_at.is_(None), Submission.submitted_at >= Enrollment.created_at)) \
             .order_by(Submission.question_id, Submission.student_id, Submission.id.asc()).all()

            report = {}
            for sub in rows:
                q = report.setdefault(sub.question_id, {"question_id": sub.question_id, "total_class_attempts": 0,
                                                         "students_data": {}})
                st = q["students_data"].setdefault(sub.student_id, {
                    "student_id": sub.student_id,
                    "student_name": sub.name,
                    "total_attempts": 0,
                    "attempts_until_correct": None,
                    "skips": 0,
                    "time_until_correct_seconds": 0,
                    "is_correct": False,
                    "correct_time_spent_seconds": None,
                    "correct_timestamp": None,
                })
                if sub.is_skipped:
                    st["skips"] += 1
                    continue
                q["total_class_attempts"] += 1
                st["total_attempts"] += 1
                if not st["is_correct"]:
                    st["time_until_correct_seconds"] += sub.time_spent_seconds or 0
                    if sub.is_correct:
                        st["is_correct"] = True
                        st["attempts_until_correct"] = st["total_attempts"]
                        st["correct_time_spent_seconds"] = st["time_until_correct_seconds"]
                        st["correct_timestamp"] = sub.submitted_at.isoformat() if sub.submitted_at else None

            final_report = []
            for q in report.values():
                students = list(q["students_data"].values())
                correct = [s for s in students if s["is_correct"]]
                pending = [s for s in students if not s["is_correct"]]
                times = [s["correct_time_spent_seconds"] for s in correct]
                attempts = [s["attempts_until_correct"] for s in correct]
                final_report.append({
                    "question_id": q["question_id"],
                    "metrics": {
                        "total_class_attempts": q["total_class_attempts"],
                        "students_attempted_count": len(students),
                        "students_correct_count": len(correct),
                        "accuracy_rate_percentage": _pct(len(correct), len(students)),
                        "avg_time_to_correct_seconds": round(sum(times) / len(times), 2) if times else 0,
                        "avg_attempts_to_correct": round(sum(attempts) / len(attempts), 2) if attempts else 0,
                    },
                    "students": {"correct_submissions": correct, "still_trying": pending},
                })
            return True, final_report
        except SQLAlchemyError as e:
            db.session.rollback()
            return False, {"error": f"Erro ao gerar relatório detalhado da turma: {str(e)}"}

    @staticmethod
    def get_progress_submissions(student_id, scenario_id):
        """Última consulta correta do aluno em cada questão de um cenário."""
        try:
            submissions = db.session.query(Submission).join(Question).filter(
                Submission.student_id == student_id,
                Question.scenario_database_id == scenario_id,
                Submission.is_correct.is_(True),
                Submission.is_skipped.is_(False),
            ).order_by(Submission.id.desc()).all()
            result, seen = [], set()
            for sub in submissions:
                if sub.question_id not in seen:
                    seen.add(sub.question_id)
                    result.append({"question_id": sub.question_id, "student_sql": sub.submitted_query})
            return True, result
        except SQLAlchemyError as e:
            db.session.rollback()
            return False, f"Erro ao buscar submissões de progresso: {str(e)}"
