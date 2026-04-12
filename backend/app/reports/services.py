from sqlalchemy import func, distinct, case
from sqlalchemy.exc import SQLAlchemyError
from app.database import Session
from app.database.models import ScenarioDatabase, Question, Submission, Enrollment, Class

class ReportService:
    """
    Serviço para geração de relatórios, estatísticas de uso e progresso dos alunos.
    """

    @staticmethod
    def get_question_metrics(scenario_id=None, class_id=None, year_semester=None, question_id=None):
        """
        Retorna métricas detalhadas de acerto, tempo e tentativas por questão, com filtros opcionais.
        """
        try:
            with Session() as session:
                is_truly_correct = (Submission.is_correct == True) & (Submission.submitted_query != 'SKIP')

                query = session.query(
                    Submission.question_id,
                    func.count(Submission.id).label('total_attempts'),
                    func.sum(case((is_truly_correct, 1), else_=0)).label('correct_attempts'),
                    func.avg(Submission.time_spent_seconds).label('avg_time_spent'),
                    func.count(distinct(Submission.student_id)).label('students_attempted'),
                    func.count(distinct(case((is_truly_correct, Submission.student_id), else_=None))).label('students_correct')
                ).join(Question, Submission.question_id == Question.id)

                if class_id or year_semester:
                    query = query.join(Enrollment, Submission.student_id == Enrollment.student_id)
                    query = query.join(Class, Enrollment.class_id == Class.id)
                    if class_id:
                        query = query.filter(Class.id == class_id)
                    if year_semester:
                        query = query.filter(Class.year_semester == year_semester)

                if scenario_id:
                    query = query.filter(Question.scenario_database_id == scenario_id)
                if question_id:
                    query = query.filter(Submission.question_id == question_id)

                query = query.group_by(Submission.question_id)
                results = query.all()

                metrics = []
                for row in results:
                    total_attempts = row.total_attempts or 0
                    students_attempted = row.students_attempted or 1
                    
                    metrics.append({
                        "question_id": row.question_id,
                        "total_attempts": total_attempts,
                        "correct_attempts": int(row.correct_attempts or 0),
                        "accuracy_percentage": round((row.correct_attempts / total_attempts * 100), 2) if total_attempts > 0 else 0.0,
                        "avg_time_spent_seconds": round(row.avg_time_spent or 0, 2),
                        "avg_attempts_per_student": round(total_attempts / students_attempted, 2),
                        "students_attempted": row.students_attempted,
                        "students_correct": row.students_correct
                    })

                return True, metrics
        except SQLAlchemyError as e:
            return False, {"error": f"Erro ao gerar métricas de questões: {str(e)}"}

    @staticmethod
    def get_user_last_correct_submissions(student_id, question_id=None, scenario_id=None):
        """ 
        Retorna as últimas submissões corretas de um aluno, com detalhes como tempo gasto e query submetida.
        Filtros opcionais: question_id e scenario_id.
        """
        if not student_id:
            return False, {"error": "ID do aluno é obrigatório."}

        try:
            with Session() as session:
                subquery = session.query(func.max(Submission.id).label('max_id')).filter(
                    Submission.student_id == student_id,
                    Submission.is_correct == True,
                    Submission.submitted_query != 'SKIP'
                ).group_by(Submission.question_id).subquery()

                query = session.query(Submission).join(subquery, Submission.id == subquery.c.max_id)

                if scenario_id:
                    query = query.join(Question, Submission.question_id == Question.id)\
                                 .filter(Question.scenario_database_id == scenario_id)
                
                if question_id:
                    query = query.filter(Submission.question_id == question_id)

                submissions = query.all()
                session.expunge_all()
                return True, submissions
        except SQLAlchemyError as e:
            return False, {"error": f"Erro ao buscar últimas submissões: {str(e)}"}

    @staticmethod
    def get_user_question_engagement(student_id, question_id):
        """"
        Retorna o total de tentativas e tempo gasto por um aluno em uma questão específica.
        """
        if not student_id or not question_id:
            return False, {"error": "IDs de aluno e questão são obrigatórios."}

        try:
            with Session() as session:
                result = session.query(
                    func.count(Submission.id).label('total_attempts'),
                    func.sum(Submission.time_spent_seconds).label('total_time'),
                    func.avg(Submission.time_spent_seconds).label('avg_time')
                ).filter(
                    Submission.student_id == student_id,
                    Submission.question_id == question_id
                ).first()

                return True, {
                    "question_id": question_id,
                    "student_id": student_id,
                    "total_attempts": result.total_attempts or 0,
                    "total_time_spent_seconds": result.total_time or 0,
                    "avg_time_spent_seconds": round(result.avg_time or 0, 2)
                }
        except SQLAlchemyError as e:
            return False, {"error": f"Erro ao buscar engajamento: {str(e)}"}

    @staticmethod
    def get_progress_summary(student_id=None, scenario_id=None):
        """Retorna o resumo do progresso de um aluno, com filtros opcionais."""
        try:
            with Session() as session:
                q_query = session.query(func.count(Question.id))
                if scenario_id:
                    q_query = q_query.filter(Question.scenario_database_id == scenario_id)
                total_questions = q_query.scalar() or 0

                solved_questions = 0
                total_time_seconds = 0

                if student_id:
                    s_query = session.query(func.count(distinct(Submission.question_id))).filter(
                        Submission.student_id == student_id,
                        Submission.is_correct == True,
                        Submission.submitted_query != 'SKIP'
                    )
                    
                    time_query = session.query(func.sum(Submission.time_spent_seconds)).filter(
                        Submission.student_id == student_id
                    )

                    if scenario_id:
                        s_query = s_query.join(Question).filter(Question.scenario_database_id == scenario_id)
                        time_query = time_query.join(Question).filter(Question.scenario_database_id == scenario_id)

                    solved_questions = s_query.scalar() or 0
                    total_time_seconds = time_query.scalar() or 0

                return True, {
                    "scenario_id": scenario_id if scenario_id else "all",
                    "student_id": student_id if student_id else "all",
                    "total_available_questions": total_questions,
                    "total_solved_questions": solved_questions,
                    "total_time_seconds": int(total_time_seconds),
                    "completion_percentage": round((solved_questions / total_questions * 100), 2) if total_questions > 0 else 0.0
                }
        except SQLAlchemyError as e:
            return False, {"error": f"Erro ao buscar progresso: {str(e)}"}

    @staticmethod
    def get_class_questions_detail(class_id):
        """Retorna o detalhamento por questão de uma turma específica."""
        if not class_id:
            return False, {"error": "ID da turma é obrigatório."}

        try:
            with Session() as session:
                submissions = session.query(
                    Submission.id,
                    Submission.question_id,
                    Submission.student_id,
                    Submission.is_correct,
                    Submission.time_spent_seconds,
                    Submission.submitted_query,
                    Submission.submitted_at
                ).join(
                    Enrollment, Submission.student_id == Enrollment.student_id
                ).filter(
                    Enrollment.class_id == class_id
                ).order_by(
                    Submission.question_id, 
                    Submission.student_id, 
                    Submission.id.asc()
                ).all()

                questions_report = {}

                for sub in submissions:
                    q_id = sub.question_id
                    s_id = sub.student_id

                    if q_id not in questions_report:
                        questions_report[q_id] = {
                            "question_id": q_id,
                            "total_class_attempts": 0,
                            "students_data": {} 
                        }

                    q_data = questions_report[q_id]
                    q_data["total_class_attempts"] += 1

                    if s_id not in q_data["students_data"]:
                        q_data["students_data"][s_id] = {
                            "student_id": s_id,
                            "total_attempts": 0,
                            "is_correct": False,
                            "correct_time_spent_seconds": None,
                            "correct_timestamp": None
                        }

                    student_data = q_data["students_data"][s_id]
                    student_data["total_attempts"] += 1

                    is_real_success = sub.is_correct and sub.submitted_query != 'SKIP'

                    if is_real_success and not student_data["is_correct"]:
                        student_data["is_correct"] = True
                        student_data["correct_time_spent_seconds"] = sub.time_spent_seconds
                        if sub.submitted_at:
                            student_data["correct_timestamp"] = sub.submitted_at.isoformat()
            
                final_report = []
                for q_id, q_data in questions_report.items():
                    students_list = list(q_data["students_data"].values())
                    correct_students = [s for s in students_list if s["is_correct"]]
                    incorrect_students = [s for s in students_list if not s["is_correct"]]
                    
                    correct_times = [s["correct_time_spent_seconds"] for s in correct_students if s["correct_time_spent_seconds"] is not None]
                    avg_correct_time = sum(correct_times) / len(correct_times) if correct_times else 0
                    
                    attempts_until_correct = [s["total_attempts"] for s in correct_students]
                    avg_attempts_to_correct = sum(attempts_until_correct) / len(attempts_until_correct) if attempts_until_correct else 0

                    final_report.append({
                        "question_id": q_id,
                        "metrics": {
                            "total_class_attempts": q_data["total_class_attempts"],
                            "students_attempted_count": len(students_list),
                            "students_correct_count": len(correct_students),
                            "accuracy_rate_percentage": round((len(correct_students) / len(students_list)) * 100, 2) if students_list else 0,
                            "avg_time_to_correct_seconds": round(avg_correct_time, 2),
                            "avg_attempts_to_correct": round(avg_attempts_to_correct, 2)
                        },
                        "students": {
                            "correct_submissions": correct_students,
                            "still_trying": incorrect_students
                        }
                    })

                return True, final_report

        except SQLAlchemyError as e:
            return False, {"error": f"Erro ao gerar relatório detalhado da turma: {str(e)}"}
    
    @staticmethod
    def get_progress_submissions(student_id, scenario_id):
        """Retorna as submissões de um aluno em um cenário específico, mostrando o progresso detalhado por questão."""
        try:
            with Session() as session:
                submissions = session.query(Submission).join(Question).filter(
                    Submission.student_id == student_id,
                    Question.scenario_database_id == scenario_id,
                    Submission.is_correct == True,
                    Submission.submitted_query != 'SKIP'
                ).order_by(Submission.submitted_at.desc()).all()
                
                result = []
                seen_qs = set()
                
                for sub in submissions:
                    if sub.question_id not in seen_qs:
                        seen_qs.add(sub.question_id)
                        result.append({
                            "question_id": sub.question_id,
                            "student_sql": sub.submitted_query
                        })
                
                return True, result
        except SQLAlchemyError as e:
            return False, f"Erro ao buscar submissões de progresso: {str(e)}"

    @staticmethod
    def get_scenario_by_slug(slug):
        """Retorna o cenário correspondente a um slug específico."""
        try:
            with Session() as session:
                scenario = session.query(ScenarioDatabase).filter_by(slug=slug).first()
                if scenario:
                    session.expunge(scenario)
                    return True, scenario
                return False, "Banco de dados não encontrado."
        except SQLAlchemyError as e:
            return False, f"Erro ao buscar banco de dados: {str(e)}"