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
        Retorna métricas agregadas das questões. Cobre: porcentagem de acerto, tempo médio, 
        tentativas médias e quantidade de alunos (tentaram/acertaram).
        Pode ser filtrado por cenário, turma, semestre ou uma questão específica.
        
        Parâmetros:
            scenario_id (int, opcional): ID do banco de dados (trilha).
            class_id (int, opcional): ID da turma.
            year_semester (str, opcional): Semestre/Ano da turma (ex: "2026/1").
            question_id (int, opcional): ID de uma questão específica.
            
        Retorno:
            tuple: (True, lista de dicionários com as métricas) ou (False, dict de erro).
        """
        try:
            with Session() as session:
                query = session.query(
                    Submission.question_id,
                    func.count(Submission.id).label('total_attempts'),
                    func.sum(case((Submission.is_correct == True, 1), else_=0)).label('correct_attempts'),
                    func.avg(Submission.time_spent_seconds).label('avg_time_spent'),
                    func.count(distinct(Submission.student_id)).label('students_attempted'),
                    func.count(distinct(case((Submission.is_correct == True, Submission.student_id), else_=None))).label('students_correct')
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
        Retorna a última submissão correta de um aluno. Pode ser de todas as questões,
        de um cenário específico, ou de apenas uma questão.
        
        Parâmetros:
            student_id (int): ID do aluno.
            question_id (int, opcional): Filtrar por uma questão específica.
            scenario_id (int, opcional): Filtrar por um cenário específico.
            
        Retorno:
            tuple: (True, lista de submissões) ou (False, dict de erro).
        """
        if not student_id:
            return False, {"error": "ID do aluno é obrigatório."}

        try:
            with Session() as session:
                subquery = session.query(func.max(Submission.id).label('max_id')).filter(
                    Submission.student_id == student_id,
                    Submission.is_correct == True
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
        """
        Retorna a quantidade de tentativas e o tempo total/médio gasto por um usuário 
        em uma questão específica.
        
        Parâmetros:
            student_id (int): ID do aluno.
            question_id (int): ID da questão.
            
        Retorno:
            tuple: (True, dict com os dados) ou (False, dict de erro).
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
        """
        Retorna o total de questões existentes e quantas foram resolvidas corretamente.
        Pode ser global ou filtrado por cenário e/ou aluno.
        
        Parâmetros:
            student_id (int, opcional): ID do aluno (se None, traz o total geral sem aluno).
            scenario_id (int, opcional): ID da trilha/cenário.
            
        Retorno:
            tuple: (True, dict com totais) ou (False, dict de erro).
        """
        try:
            with Session() as session:
                q_query = session.query(func.count(Question.id))
                if scenario_id:
                    q_query = q_query.filter(Question.scenario_database_id == scenario_id)
                total_questions = q_query.scalar() or 0

                solved_questions = 0
                if student_id:
                    s_query = session.query(func.count(distinct(Submission.question_id))).filter(
                        Submission.student_id == student_id,
                        Submission.is_correct == True
                    )
                    if scenario_id:
                        s_query = s_query.join(Question).filter(Question.scenario_database_id == scenario_id)
                    solved_questions = s_query.scalar() or 0

                return True, {
                    "scenario_id": scenario_id if scenario_id else "all",
                    "student_id": student_id if student_id else "all",
                    "total_available_questions": total_questions,
                    "total_solved_questions": solved_questions,
                    "completion_percentage": round((solved_questions / total_questions * 100), 2) if total_questions > 0 else 0.0
                }
        except SQLAlchemyError as e:
            return False, {"error": f"Erro ao buscar progresso: {str(e)}"}