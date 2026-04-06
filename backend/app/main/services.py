import json
import os
import time
import re
import pandas as pd # type: ignore
from supabase import create_client
from sqlalchemy.exc import SQLAlchemyError
from app.database import Session
from app.database.models import ScenarioDatabase, Question, Submission

class ScenarioDatabaseService:
    """Gerencia a recuperação dos bancos de dados de cenário."""
    
    @staticmethod
    def get_all_scenarios():
        try:
            with Session() as session:
                scenarios = session.query(ScenarioDatabase).all()
                session.expunge_all()
                return True, scenarios
        except SQLAlchemyError as e:
            return False, f"Erro ao buscar bancos de dados: {str(e)}"

    @staticmethod
    def get_scenario_by_slug(slug):
        try:
            with Session() as session:
                scenario = session.query(ScenarioDatabase).filter_by(slug=slug).first()
                if scenario:
                    session.expunge(scenario)
                    return True, scenario
                return False, "Banco de dados não encontrado."
        except SQLAlchemyError as e:
            return False, f"Erro ao buscar banco de dados: {str(e)}"

    @staticmethod
    def create_scenario(data):
        try:
            with Session() as session:
                scenario = ScenarioDatabase(
                    name=data.get('name'),
                    slug=data.get('slug'),
                    diagram_url=data.get('diagram_url')
                )
                session.add(scenario)
                session.commit()
                session.refresh(scenario)
                session.expunge(scenario)
                return True, scenario
        except SQLAlchemyError as e:
            return False, f"Erro ao criar banco de dados: {str(e)}"

    @staticmethod
    def delete_scenario(scenario_id):
        try:
            with Session() as session:
                scenario = session.query(ScenarioDatabase).filter_by(id=scenario_id).first()
                if not scenario:
                    return False, "Banco de dados não encontrado."
                
                session.delete(scenario)
                session.commit()
                return True, "Banco de dados deletado com sucesso."
        except SQLAlchemyError as e:
            return False, f"Erro ao deletar banco de dados: {str(e)}"
    
    @staticmethod
    def update_scenario(scenario_id, data):
        try:
            with Session() as session:
                scenario = session.query(ScenarioDatabase).filter_by(id=scenario_id).first()
                if not scenario:
                    return False, "Banco de dados não encontrado."
                
                if 'name' in data: scenario.name = data['name']
                if 'slug' in data: scenario.slug = data['slug']
                if 'diagram_url' in data: scenario.diagram_url = data['diagram_url']
                
                session.commit()
                session.refresh(scenario)
                session.expunge(scenario)
                return True, scenario
        except SQLAlchemyError as e:
            return False, f"Erro ao atualizar banco de dados: {str(e)}"

class QuestionService:
    """Gerencia o CRUD das questões no banco de dados TiDB."""
    
    @staticmethod
    def create_question(data):
        try:
            with Session() as session:
                question = Question(
                    scenario_database_id=data.get('scenario_database_id'),
                    statement=data.get('statement'),
                    expected_query=data.get('expected_query'),
                    difficulty=data.get('difficulty'),
                    is_special=data.get('is_special', False)
                )
                session.add(question)
                session.commit()
                session.refresh(question)
                session.expunge(question)
                return True, question
        except SQLAlchemyError as e:
            return False, f"Erro ao criar questão: {str(e)}"

    @staticmethod
    def get_all_questions():
        try:
            with Session() as session:
                questions = session.query(Question).all()
                session.expunge_all()
                return True, questions
        except SQLAlchemyError as e:
            return False, f"Erro ao buscar questões: {str(e)}"

    @staticmethod
    def get_questions_by_scenario(scenario_id):
        try:
            with Session() as session:
                questions = session.query(Question).filter_by(scenario_database_id=scenario_id).all()
                session.expunge_all()
                return True, questions
        except SQLAlchemyError as e:
            return False, f"Erro ao buscar questões do cenário: {str(e)}"

    @staticmethod
    def get_question_by_id(question_id):
        try:
            with Session() as session:
                question = session.query(Question).filter_by(id=question_id).first()
                if question:
                    session.expunge(question)
                    return True, question
                return False, "Questão não encontrada."
        except SQLAlchemyError as e:
            return False, f"Erro ao buscar questão: {str(e)}"

    @staticmethod
    def get_special_questions(scenario_id, limit=10):
        try:
            with Session() as session:
                questions = session.query(Question).filter_by(
                    scenario_database_id=scenario_id, 
                    is_special=True
                ).limit(limit).all()
                session.expunge_all()
                return True, questions
        except SQLAlchemyError as e:
            return False, f"Erro ao buscar questões especiais: {str(e)}"

    @staticmethod
    def get_not_special_questions(scenario_id):
        try:
            with Session() as session:
                questions = session.query(Question).filter_by(
                    scenario_database_id=scenario_id, 
                    is_special=False
                ).all()
                session.expunge_all()
                return True, questions
        except SQLAlchemyError as e:
            return False, f"Erro ao buscar questões não especiais: {str(e)}"

    @staticmethod
    def update_question(question_id, data):
        try:
            with Session() as session:
                question = session.query(Question).filter_by(id=question_id).first()
                if not question:
                    return False, "Questão não encontrada."
                
                if 'statement' in data: question.statement = data['statement']
                if 'expected_query' in data: question.expected_query = data['expected_query']
                if 'difficulty' in data: question.difficulty = data['difficulty']
                if 'is_special' in data: question.is_special = data['is_special']
                
                session.commit()
                session.refresh(question)
                session.expunge(question)
                return True, question
        except SQLAlchemyError as e:
            return False, f"Erro ao atualizar questão: {str(e)}"

    @staticmethod
    def delete_question(question_id):
        try:
            with Session() as session:
                question = session.query(Question).filter_by(id=question_id).first()
                if not question:
                    return False, "Questão não encontrada."
                
                session.delete(question)
                session.commit()
                return True, "Questão deletada com sucesso."
        except SQLAlchemyError as e:
            return False, f"Erro ao deletar questão: {str(e)}"


class SubmissionService:
    """Gerencia as submissões dos alunos e verifica progresso."""
    
    @staticmethod
    def save_submission(student_id, question_id, time_spent, submitted_query, is_correct, output):
        try:
            with Session() as session:
                submission = Submission(
                    student_id=int(student_id),
                    question_id=int(question_id),
                    time_spent_seconds=int(time_spent) if time_spent else 0,
                    submitted_query=str(submitted_query),
                    is_correct=bool(is_correct),
                    execution_output=json.dumps(output) if output else None
                )
                session.add(submission)
                session.commit()
                return True, "Submissão salva com sucesso."
        except Exception as e:
            return False, f"Erro ao salvar: {str(e)}"
    
    @staticmethod
    def check_special_completion(student_id, scenario_id):
        """Verifica se o aluno completou as 10 questões especiais do cenário."""
        try:
            with Session() as session:
                special_questions = session.query(Question).filter_by(
                    scenario_database_id=scenario_id, 
                    is_special=True
                ).all()
                special_ids = [q.id for q in special_questions]
                
                if not special_ids:
                    return False, "Nenhuma questão especial encontrada para este cenário."

                completed_count = session.query(Submission).filter(
                    Submission.student_id == student_id,
                    Submission.question_id.in_(special_ids),
                    Submission.is_correct == True
                ).distinct(Submission.question_id).count()

                return completed_count >= 10, completed_count
        except SQLAlchemyError as e:
            return False, f"Erro ao verificar progresso: {str(e)}"

    @staticmethod
    def skip_question(student_id, question_id):
        """Salva uma desistência como 'correta' para liberar o progresso, mas com query marcada."""
        try:
            with Session() as session:
                submission = Submission(
                    student_id=student_id,
                    question_id=question_id,
                    time_spent_seconds=120,
                    submitted_query="-- DESISTÊNCIA",
                    is_correct=True,
                    execution_output=json.dumps({"msg": "Pulou a questão"})
                )
                session.add(submission)
                session.commit()
                return True, "Questão pulada com sucesso."
        except SQLAlchemyError as e:
            return False, f"Erro ao pular: {str(e)}"


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
        """Executa a query via RCP com logica de retry e tratamento de erros."""
        sql = sql.strip().rstrip(';')
        last_exception = None

        for attempt in range(1, retries + 1):
            try:
                response = client.rpc('rpc_sql', {'p_query': sql}).execute()
            except Exception as e:
                last_exception = e
                if attempt < retries and getattr(e, 'winerror', None) == 10054:
                    print(f"Conexao restada (tentativa {attempt}/{retries}). Tentando novamente em {backoff} segundos... (Tentativa {attempt}/{retries})")
                    time.sleep(backoff)
                    backoff *= 2
                    continue
                print(f"Erro executando Query: {e}")
                return {'data': None, 'error': str(e)}
            
            if getattr(response, 'error', None):
                print('RPC error:', response.error)
                error_message = getattr(response.error, 'message', str(response.error))
                return {'data': None, 'error': f'Erro no banco de dados: {error_message}'}

            data = response.data

            if isinstance(data, str):
                try:
                    data = json.loads(data)
                except Exception as e:
                    print("Falhou em passar para JSON.")
                    return {'data': None, 'error': f'Falhou em passar para JSON: {e}'}
            
            if not isinstance(data, list):
                print("Formato inesperado.")
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
            return {'data': None, 'error': f"Falha em executar query apos {retries} tentativas: {last_exception}"}
        return {'data': None, 'error': 'Falha em executar query apos tentativas.'}
    
class SQLGrader:
    """Responsavel por analisar e comparar os resultados das queries."""

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
        """Compara os DataFrames resultantes em 3 niveis: Exato, Ordenacao, Alfanumerico."""
        base_upper = " " + base_sql.upper().replace('\n', ' ') + " "
        
        base_data = base_res.get('data')
        stu_data = student_res.get('data')

        if not base_data or not stu_data:
            return False, "Erro. Uma das queries nao retornou dados validos."
        
        if base_data['total'] != stu_data['total']:
            return False, f"O número de linhas retornadas difere. Esperado: {base_data['total']}, Recebido: {stu_data['total']}."
        
        df_base = pd.DataFrame(base_data['rows'], columns=base_data['columns'])
        df_stu = pd.DataFrame(stu_data['rows'], columns=stu_data['columns'])

        if df_base.empty and df_stu.empty:
            return True, "Parabens! As consultas sao equivalentes."
        
        df_base_norm = SQLGrader._normalize_df(df_base)
        df_stu_norm = SQLGrader._normalize_df(df_stu)

        # NÍVEL 1: Conteúdo Correto, Ordem Correta
        if df_base_norm.values.tolist() == df_stu_norm.values.tolist():
            return True, "Parabens! As consultas sao equivalentes."

        # NÍVEL 2: Conteúdo Correto, Ordem Errada
        if SQLGrader._sort_matrix(df_base_norm) == SQLGrader._sort_matrix(df_stu_norm):
            if re.search(r'\bORDER\s+BY\b', base_upper):
                return False, "Os dados estão corretos, mas a ordem está errada."
            return True, "Parabens! As consultas sao equivalentes."

        # NÍVEL 3: Busca Flexível (Aceita concatenação, colunas extras e ordenação diferente)
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
                return True, "Parabens! As consultas sao equivalentes."

        return False, "Os dados nao conferem."

    @staticmethod
    def _normalize_df(df):
        df = df.round(2)
        df = df.astype(str)
        df = df.map(lambda x: x.strip().lower() if isinstance(x, str) else x)
        return df
    
    @staticmethod
    def _sort_matrix(df):
        return sorted(df.values.tolist())
    
    @staticmethod
    def _get_alphanumeric_fingerprint(df):
        fingerprints = []
        for _, row in df.iterrows():
            row_str = "".join([str(x) for x in row.values])
            clean_str = re.sub(r'[^a-z0-9]', '', row_str.lower())
            fingerprints.append(clean_str)
        return sorted(fingerprints)
