import json
import os
import time
import re
import pandas as pd # type: ignore
from supabase import create_client
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy import func
from app.database import db
from app.database.models import ScenarioDatabase, Question, Submission, AdaptiveSession

# =========================================================================
# SCENARIO DATABASE SERVICE
# =========================================================================

class ScenarioDatabaseService:
    """Gerencia a recuperação dos bancos de dados de cenário."""
    
    @staticmethod
    def get_all_scenarios():
        """Retorna a lista de todos os bancos de dados de cenário disponíveis."""
        try:
            scenarios = db.session.query(ScenarioDatabase).all()
            db.session.expunge_all()
            return True, scenarios
        except SQLAlchemyError as e:
            return False, f"Erro ao buscar bancos de dados: {str(e)}"

    @staticmethod
    def get_scenario_by_slug(slug):
        """Retorna os detalhes de um cenário específico identificado pelo slug."""
        try:
            scenario = db.session.query(ScenarioDatabase).filter_by(slug=slug).first()
            if scenario:
                db.session.expunge(scenario)
                return True, scenario
            return False, "Banco de dados não encontrado."
        except SQLAlchemyError as e:
            return False, f"Erro ao buscar banco de dados: {str(e)}"

    @staticmethod
    def create_scenario(data):
        """Cria um novo banco de dados de cenário com os detalhes fornecidos."""
        try:
            scenario = ScenarioDatabase(
                name=data.get('name'),
                slug=data.get('slug'),
                diagram_url=data.get('diagram_url')
            )
            db.session.add(scenario)
            db.session.commit()
            db.session.refresh(scenario)
            db.session.expunge(scenario)
            return True, scenario
        except SQLAlchemyError as e:
            db.session.rollback()
            return False, f"Erro ao criar banco de dados: {str(e)}"

    @staticmethod
    def delete_scenario(scenario_id):
        """Deleta um banco de dados de cenário específico identificado pelo ID."""
        try:
            scenario = db.session.query(ScenarioDatabase).filter_by(id=scenario_id).first()
            if not scenario:
                return False, "Banco de dados não encontrado."
            
            db.session.delete(scenario)
            db.session.commit()
            return True, "Banco de dados deletado com sucesso."
        except SQLAlchemyError as e:
            db.session.rollback()
            return False, f"Erro ao deletar banco de dados: {str(e)}"
    
    @staticmethod
    def update_scenario(scenario_id, data):
        """Atualiza os detalhes de um banco de dados de cenário."""
        try:
            scenario = db.session.query(ScenarioDatabase).filter_by(id=scenario_id).first()
            if not scenario:
                return False, "Banco de dados não encontrado."
            
            if 'name' in data: scenario.name = data['name']
            if 'slug' in data: scenario.slug = data['slug']
            if 'diagram_url' in data: scenario.diagram_url = data['diagram_url']
            
            db.session.commit()
            db.session.refresh(scenario)
            db.session.expunge(scenario)
            return True, scenario
        except SQLAlchemyError as e:
            db.session.rollback()
            return False, f"Erro ao atualizar banco de dados: {str(e)}"

# =========================================================================
# QUESTION SERVICE
# =========================================================================

class QuestionService:
    """Gerencia o CRUD das questões no banco de dados e a associação com os cenários."""

    @staticmethod
    def create_question(data):
        """Cria uma nova questão associada a um cenário específico."""
        try:
            question = Question(
                scenario_database_id=data.get('scenario_database_id'),
                statement=data.get('statement'),
                expected_query=data.get('expected_query'),
                question_order=data.get('question_order'),
                difficulty=data.get('difficulty'),
                is_special=data.get('is_special', False)
            )
            db.session.add(question)
            db.session.commit()
            db.session.refresh(question)
            db.session.expunge(question)
            return True, question
        except SQLAlchemyError as e:
            db.session.rollback()
            return False, f"Erro ao criar questão: {str(e)}"

    @staticmethod
    def get_all_questions():
        """Retorna a lista de todas as questões disponíveis."""
        try:
            questions = db.session.query(Question).all()
            db.session.expunge_all()
            return True, questions
        except SQLAlchemyError as e:
            return False, f"Erro ao buscar questões: {str(e)}"

    @staticmethod
    def get_questions_by_scenario(scenario_id):
        """Retorna a lista de questões associadas a um cenário específico."""
        try:
            questions = db.session.query(Question).filter_by(scenario_database_id=scenario_id).order_by(Question.question_order.asc()).all()
            db.session.expunge_all()
            return True, questions
        except SQLAlchemyError as e:
            return False, f"Erro ao buscar questões do cenário: {str(e)}"

    @staticmethod
    def get_question_by_id(question_id):
        """Retorna os detalhes de uma questão específica identificada pelo ID."""
        try:
            question = db.session.query(Question).filter_by(id=question_id).first()
            if question:
                db.session.expunge(question)
                return True, question
            return False, "Questão não encontrada."
        except SQLAlchemyError as e:
            return False, f"Erro ao buscar questão: {str(e)}"

    @staticmethod
    def update_question(question_id, data):
        """Atualiza os detalhes de uma questão e remove submissões órfãs para garantir integridade."""
        try:
            question = db.session.query(Question).filter_by(id=question_id).first()
            if not question:
                return False, "Questão não encontrada."
            
            if 'statement' in data: question.statement = data['statement']
            if 'expected_query' in data: question.expected_query = data['expected_query']
            if 'question_order' in data: question.question_order = data['question_order']
            if 'difficulty' in data: question.difficulty = data['difficulty']
            if 'is_special' in data: question.is_special = data['is_special']
            
            # Limpa submissões para não corromper histórico do CAT se a ordem mudar drasticamente
            db.session.query(Submission).filter_by(question_id=question_id).delete()
            db.session.commit()
            db.session.refresh(question)
            db.session.expunge(question)
            
            return True, question
        except SQLAlchemyError as e:
            db.session.rollback()
            return False, f"Erro ao atualizar questão: {str(e)}"
    
    @staticmethod
    def delete_question(question_id):
        """Deleta uma questão específica e suas submissões em cascata."""
        try:
            question = db.session.query(Question).filter_by(id=question_id).first()
            if not question:
                return False, "Questão não encontrada."
            
            db.session.query(Submission).filter_by(question_id=question_id).delete()
            db.session.delete(question)
            db.session.commit()
            return True, "Questão e submissões deletadas com sucesso."
        except SQLAlchemyError as e:
            db.session.rollback()
            return False, f"Erro ao deletar questão: {str(e)}"

# =========================================================================
# SUBMISSION SERVICE (CAT - Computerized Adaptive Testing)
# =========================================================================

class SubmissionService:
    """Gerencia as sessões de avaliação adaptativa (CAT) e submissões dos alunos."""
    
    @staticmethod
    def get_or_start_adaptive_session(student_id, scenario_id):
        """Recupera a sessão ativa do aluno ou inicializa uma nova busca binária."""
        try:
            # 1. Verifica se já existe uma sessão em andamento
            active_session = db.session.query(AdaptiveSession).filter_by(
                student_id=student_id, 
                scenario_database_id=scenario_id, 
                is_finished=False
            ).first()

            if active_session:
                current_question = db.session.query(Question).filter_by(
                    scenario_database_id=scenario_id, 
                    question_order=active_session.current_question_order
                ).first()
                return True, {"session_id": active_session.id, "question": current_question}

            # 2. Se não existir, prepara uma nova sessão CAT
            max_order = db.session.query(func.max(Question.question_order)).filter_by(
                scenario_database_id=scenario_id
            ).scalar() or 0

            if max_order == 0:
                return False, {"error": "Cenário não possui questões cadastradas."}

            initial_lowest_failed = max_order + 1
            start_order = initial_lowest_failed // 2 # Inicia no meio da árvore pedagógica

            new_session = AdaptiveSession(
                student_id=student_id,
                scenario_database_id=scenario_id,
                highest_mastered_order=0,
                lowest_failed_order=initial_lowest_failed,
                current_question_order=start_order
            )
            db.session.add(new_session)
            db.session.commit()
            db.session.refresh(new_session)

            first_question = db.session.query(Question).filter_by(
                scenario_database_id=scenario_id, 
                question_order=start_order
            ).first()

            return True, {"session_id": new_session.id, "question": first_question}
            
        except SQLAlchemyError as e:
            db.session.rollback()
            return False, {"error": f"Erro ao inicializar sessão adaptativa: {str(e)}"}

    @staticmethod
    def submit_adaptive_answer(student_id, session_id, question_id, time_spent, submitted_query, is_correct, output, is_skipped=False):
        """Registra a resposta, recalcula a proficiência do aluno e decide a próxima questão baseada na busca binária."""
        try:
            # 1. Busca sessão e questão
            session = db.session.query(AdaptiveSession).filter_by(id=session_id, is_finished=False).first()
            if not session:
                return False, {"error": "Sessão adaptativa não encontrada ou já finalizada."}

            question = db.session.query(Question).filter_by(id=question_id).first()
            if not question:
                return False, {"error": "Questão não encontrada."}

            current_order = question.question_order

            # Verifica número da tentativa para esta questão na sessão atual
            attempt_number = db.session.query(Submission).filter_by(
                student_id=student_id, question_id=question_id, adaptive_session_id=session_id
            ).count() + 1

            # 2. Salva a Submissão
            submission = Submission(
                student_id=student_id,
                question_id=question_id,
                adaptive_session_id=session_id,
                time_spent_seconds=int(time_spent) if time_spent else 0,
                submitted_query=str(submitted_query) if submitted_query else None,
                is_correct=bool(is_correct),
                is_skipped=bool(is_skipped),
                attempt_number=attempt_number,
                execution_output=json.dumps(output) if output else None
            )
            db.session.add(submission)

            # 3. Recalcula os limites da Busca Binária
            if is_correct and not is_skipped:
                session.highest_mastered_order = max(session.highest_mastered_order, current_order)
            else:
                session.lowest_failed_order = min(session.lowest_failed_order, current_order)

            # 4. Encontra o novo ponto médio
            H = session.highest_mastered_order
            L = session.lowest_failed_order
            next_order = (H + L) // 2

            # 5. Critério de Parada (Convergência)
            if (L - H <= 1) or (next_order == current_order):
                session.is_finished = True
                session.current_question_order = None
                db.session.commit()
                return True, {
                    "finished": True, 
                    "mastered_until": H,
                    "msg": "Avaliação adaptativa concluída! Nível de proficiência calculado."
                }

            # 6. Atualiza estado e busca próxima questão
            session.current_question_order = next_order
            db.session.commit()

            next_question = db.session.query(Question).filter_by(
                scenario_database_id=session.scenario_database_id,
                question_order=next_order
            ).first()

            return True, {
                "finished": False, 
                "next_question": next_question,
                "msg": "Progresso atualizado. Enviando próxima questão."
            }

        except SQLAlchemyError as e:
            db.session.rollback()
            return False, {"error": f"Erro ao processar submissão: {str(e)}"}

# =========================================================================
# SUPABASE SERVICE & SQL GRADER (NÃO UTILIZAM SQLALCHEMY)
# =========================================================================

class SupabaseService:
    """Gerencia conexoes e execução de queries RPC no Supabase."""

    @staticmethod
    def get_client(slug):
        suffix = slug.upper().replace('-', '_')
        url = os.getenv(f"SUPABASE_URL_{suffix}")
        key = os.getenv(f"SUPABASE_KEY_{suffix}")
        if not url or not key:
            return None
        return create_client(url, key)
    
    @staticmethod
    def execute_query(client, sql: str, max_rows: int = 20, retries: int = 3, backoff: float = 1.0):
        sql = sql.strip().rstrip(';')
        last_exception = None

        for attempt in range(1, retries + 1):
            try:
                response = client.rpc('rpc_sql', {'p_query': sql}).execute()
            except Exception as e:
                last_exception = e
                if attempt < retries and getattr(e, 'winerror', None) == 10054:
                    print(f"Conexão resetada. Tentando novamente em {backoff} segundos... (Tentativa {attempt}/{retries})")
                    time.sleep(backoff)
                    backoff *= 2
                    continue
                return {'data': None, 'error': str(e)}
            
            if getattr(response, 'error', None):
                error_message = getattr(response.error, 'message', str(response.error))
                return {'data': None, 'error': f'Erro no banco de dados: {error_message}'}

            data = response.data

            if isinstance(data, str):
                try:
                    data = json.loads(data)
                except Exception as e:
                    return {'data': None, 'error': f'Falhou em passar para JSON: {e}'}
            
            if not isinstance(data, list):
                return {'data': None, 'error': data.get('error') if isinstance(data, dict) else "Formato inesperado"}
             
            total = len(data)
            display = data if max_rows == 0 else data[:max_rows]
            columns = list(display[0].keys()) if display else []
            rows = [tuple(item.values()) for item in display]
            return {
                'data': {
                    'columns': columns,
                    'rows': rows,
                    'total': total
                },
                'error': None
            }
        
        if last_exception:
            return {'data': None, 'error': f"Falha em executar query após {retries} tentativas: {last_exception}"}
        return {'data': None, 'error': 'Falha em executar query após tentativas.'}
    
class SQLGrader:
    """Responsável por analisar e comparar os resultados das queries."""

    @staticmethod
    def is_safe_query(query: str) -> bool:
        query_upper = query.upper()
        
        if not (query.strip().lower().startswith('select') or query.strip().lower().startswith('with')):
            return False, "Sua consulta deve iniciar com SELECT ou WITH."
            
        if ';' in query.strip().rstrip(';'):
            return False, "Apenas uma instrução SQL é permitida por vez."

        dangerous_keywords = [
            r'\bDROP\b', r'\bDELETE\b', r'\bUPDATE\b', r'\bINSERT\b', 
            r'\bALTER\b', r'\bTRUNCATE\b', r'\bGRANT\b', r'\bREVOKE\b', r'\bEXEC\b'
        ]
        for keyword in dangerous_keywords:
            if re.search(keyword, query_upper):
                clean_keyword = keyword.replace(r'\b', '')
                return False, f"Uso de comando não permitido: {clean_keyword}"

        return True, "Valid."
    
    @staticmethod
    def compare(base_sql, student_sql, base_res, student_res):
        base_upper = " " + base_sql.upper().replace('\n', ' ') + " "
        
        base_data = base_res.get('data')
        stu_data = student_res.get('data')

        if not base_data or not stu_data:
            return False, "Erro. Uma das queries não retornou dados válidos."
        
        if base_data['total'] != stu_data['total']:
            return False, f"O número de linhas retornadas difere. Esperado: {base_data['total']}, Recebido: {stu_data['total']}."
        
        df_base = pd.DataFrame(base_data['rows'], columns=base_data['columns'])
        df_stu = pd.DataFrame(stu_data['rows'], columns=stu_data['columns'])

        if df_base.empty and df_stu.empty:
            return True, "Parabéns! As consultas são equivalentes."
        
        df_base_norm = SQLGrader._normalize_df(df_base)
        df_stu_norm = SQLGrader._normalize_df(df_stu)

        if df_base_norm.values.tolist() == df_stu_norm.values.tolist():
            return True, "Parabéns! As consultas são equivalentes."

        if SQLGrader._sort_matrix(df_base_norm) == SQLGrader._sort_matrix(df_stu_norm):
            if re.search(r'\bORDER\s+BY\b', base_upper):
                return False, "Os dados estão corretos, mas a ordem está errada."
            return True, "Parabéns! As consultas são equivalentes."

        if len(df_base_norm) == len(df_stu_norm):
            stu_pool = []
            for s_row in df_stu_norm.values.tolist():
                s_string = re.sub(r'[^a-z0-9]', '', "".join(map(str, s_row)))
                stu_pool.append(s_string)
            
            all_base_rows_found = True
            
            for b_row in df_base_norm.values.tolist():
                b_vals = [re.sub(r'[^a-z0-9]', '', str(v)) for v in b_row]
                
                row_matched = False
                for i, s_super_string in enumerate(stu_pool):
                    if all(b_val in s_super_string for b_val in b_vals):
                        row_matched = True
                        stu_pool.pop(i)
                        break
                
                if not row_matched:
                    all_base_rows_found = False
                    break
            
            if all_base_rows_found:
                return True, "Parabéns! As consultas são equivalentes."

        return False, "Os dados não conferem."

    @staticmethod
    def _normalize_df(df):
        df = df.round(2)
        df = df.astype(str)
        df = df.map(lambda x: x.strip().lower() if isinstance(x, str) else x)
        return df
    
    @staticmethod
    def _sort_matrix(df):
        return sorted(df.values.tolist())