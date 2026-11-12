import json
import math
import re

from flask import current_app
from sqlalchemy import func
from sqlalchemy.exc import SQLAlchemyError

from app.database import db
from app.database.models import ScenarioDatabase, Question, Submission, AdaptiveSession, utcnow
from app.services.sql_grader import SQLGrader, analyze_sql  # noqa: F401  (reexportado)
from app.services.supabase_service import SupabaseService  # noqa: F401  (reexportado)

_SLUG_RE = re.compile(r'^[a-z0-9]+(?:-[a-z0-9]+)*$')


class ServiceError(Exception):
    """Erro de regra de negócio com código HTTP associado."""

    def __init__(self, message, status=400):
        super().__init__(message)
        self.message = message
        self.status = status


# =========================================================================
# SCENARIO DATABASE SERVICE
# =========================================================================

class ScenarioDatabaseService:
    """Gerencia os bancos de dados de cenário."""

    @staticmethod
    def question_counts():
        rows = db.session.query(Question.scenario_database_id, func.count(Question.id)).filter(
            Question.is_special.is_(False)).group_by(Question.scenario_database_id).all()
        return {sid: count for sid, count in rows}

    @staticmethod
    def get_all_scenarios():
        try:
            return True, db.session.query(ScenarioDatabase).order_by(ScenarioDatabase.name).all()
        except SQLAlchemyError as e:
            return False, f"Erro ao buscar bancos de dados: {str(e)}"

    @staticmethod
    def get_scenario_by_id(scenario_id):
        return db.session.get(ScenarioDatabase, scenario_id)

    @staticmethod
    def get_scenario_by_slug(slug):
        try:
            scenario = db.session.query(ScenarioDatabase).filter_by(slug=slug).first()
            if scenario:
                return True, scenario
            return False, "Banco de dados não encontrado."
        except SQLAlchemyError as e:
            return False, f"Erro ao buscar banco de dados: {str(e)}"

    @staticmethod
    def create_scenario(data):
        name = (data.get('name') or '').strip() if isinstance(data.get('name'), str) else ''
        slug = (data.get('slug') or '').strip().lower() if isinstance(data.get('slug'), str) else ''
        if not name or not slug:
            return False, "Nome e slug são obrigatórios."
        if not _SLUG_RE.match(slug) or slug.isdigit():
            return False, "Slug inválido: use apenas letras minúsculas, números e hífens (ex.: biblioteca-db)."
        diagram_url = data.get('diagram_url') if isinstance(data.get('diagram_url'), str) else ''
        diagram_url = diagram_url.strip() or f"/{slug}.png"
        try:
            if db.session.query(ScenarioDatabase).filter_by(slug=slug).first():
                return False, "Já existe um banco de dados com esse slug."
            scenario = ScenarioDatabase(name=name, slug=slug, diagram_url=diagram_url)
            db.session.add(scenario)
            db.session.commit()
            return True, scenario
        except SQLAlchemyError as e:
            db.session.rollback()
            return False, f"Erro ao criar banco de dados: {str(e)}"

    @staticmethod
    def delete_scenario(scenario_id):
        """Remove o cenário; questões, sessões e submissões são removidas em cascata."""
        try:
            scenario = db.session.get(ScenarioDatabase, scenario_id)
            if not scenario:
                return False, "Banco de dados não encontrado."
            db.session.delete(scenario)
            db.session.commit()
            SupabaseService.invalidate_expected_cache()
            return True, "Banco de dados e questões vinculadas excluídos com sucesso."
        except SQLAlchemyError as e:
            db.session.rollback()
            return False, f"Erro ao deletar banco de dados: {str(e)}"

    @staticmethod
    def update_scenario(scenario_id, data):
        try:
            scenario = db.session.get(ScenarioDatabase, scenario_id)
            if not scenario:
                return False, "Banco de dados não encontrado."
            if 'slug' in data and data['slug'] != scenario.slug:
                return False, ("O slug não pode ser alterado: ele identifica as credenciais do "
                               "Supabase e a imagem do diagrama.")
            if isinstance(data.get('name'), str) and data['name'].strip():
                scenario.name = data['name'].strip()
            if isinstance(data.get('diagram_url'), str) and data['diagram_url'].strip():
                scenario.diagram_url = data['diagram_url'].strip()
            db.session.commit()
            return True, scenario
        except SQLAlchemyError as e:
            db.session.rollback()
            return False, f"Erro ao atualizar banco de dados: {str(e)}"


# =========================================================================
# QUESTION SERVICE
# =========================================================================

class QuestionService:
    """CRUD das questões e manutenção da ordem da trilha."""

    @staticmethod
    def trail_questions(scenario_id):
        """Questões da trilha adaptativa (não especiais), na ordem da trilha."""
        return db.session.query(Question).filter_by(scenario_database_id=scenario_id, is_special=False) \
            .order_by(Question.question_order, Question.id).all()

    @staticmethod
    def trail_snapshot(scenario_id):
        return {q.id: q.question_order for q in QuestionService.trail_questions(scenario_id)}

    @staticmethod
    def renumber(scenario_id, snapshot=None):
        """
        Mantém a trilha contígua (1..N) e ordenada por dificuldade, e reposiciona o estado (H, L,
        questão atual) das sessões adaptativas para que continue apontando para as mesmas questões.
        `snapshot` = {question_id: posição antiga} capturado antes da alteração.
        """
        trail = db.session.query(Question).filter_by(scenario_database_id=scenario_id, is_special=False) \
            .order_by(Question.difficulty, Question.question_order, Question.id).all()
        for position, q in enumerate(trail, start=1):
            q.question_order = position
        specials = db.session.query(Question).filter_by(scenario_database_id=scenario_id, is_special=True) \
            .order_by(Question.question_order, Question.id).all()
        for position, q in enumerate(specials, start=1):
            q.question_order = position
        db.session.flush()

        if snapshot is None:
            return
        total = len(trail)
        trail_ids = {q.id for q in trail}
        sessions = db.session.query(AdaptiveSession).filter_by(scenario_database_id=scenario_id).all()
        for s in sessions:
            old_h = s.highest_mastered_order or 0
            old_l = s.lowest_failed_order if s.lowest_failed_order is not None else len(snapshot) + 1
            kept = [q for q in trail if q.id in snapshot]
            new_h = max((q.question_order for q in kept if snapshot[q.id] <= old_h), default=0)
            # Uma questão nova inserida abaixo do nível dominado ainda não foi vista pelo aluno:
            # o nível dominado volta para logo antes dela, para que a trilha a apresente.
            new_positions = [q.question_order for q in trail if q.id not in snapshot]
            if new_positions and min(new_positions) <= new_h:
                new_h = min(new_positions) - 1
            new_l = min((q.question_order for q in kept if snapshot[q.id] >= old_l), default=total + 1)
            if new_l <= new_h:
                new_l = total + 1
            s.highest_mastered_order = new_h
            s.lowest_failed_order = new_l
            if s.is_finished:
                continue
            if s.current_question_id in trail_ids:
                s.current_question_order = next(q.question_order for q in trail if q.id == s.current_question_id)
            else:
                SubmissionService.assign_next_question(s, trail)
        db.session.flush()

    @staticmethod
    def _validate_payload(data, partial=False):
        cleaned = {}
        if not partial or 'statement' in data:
            statement = data.get('statement')
            if not isinstance(statement, str) or not statement.strip():
                raise ServiceError("O enunciado é obrigatório.")
            cleaned['statement'] = statement.strip()
        if not partial or 'expected_query' in data:
            expected = data.get('expected_query')
            if not isinstance(expected, str) or not expected.strip():
                raise ServiceError("A query esperada (gabarito) é obrigatória.")
            safe, msg, _ = SQLGrader.is_safe_query(expected)
            if not safe:
                raise ServiceError(f"Gabarito inválido: {msg}")
            cleaned['expected_query'] = expected.strip()
        if not partial or 'difficulty' in data:
            try:
                difficulty = int(data.get('difficulty'))
            except (TypeError, ValueError):
                raise ServiceError("A dificuldade é obrigatória (1 = Fácil, 2 = Médio, 3 = Difícil).")
            if difficulty not in (1, 2, 3):
                raise ServiceError("A dificuldade deve ser 1 (Fácil), 2 (Médio) ou 3 (Difícil).")
            cleaned['difficulty'] = difficulty
        if 'question_order' in data and data.get('question_order') not in (None, ''):
            try:
                order = int(data.get('question_order'))
            except (TypeError, ValueError):
                raise ServiceError("A posição da questão deve ser um número inteiro.")
            if order < 1:
                raise ServiceError("A posição da questão deve ser maior ou igual a 1.")
            cleaned['question_order'] = order
        if 'is_special' in data:
            cleaned['is_special'] = bool(data.get('is_special'))
        return cleaned

    @staticmethod
    def create_question(data):
        try:
            fields = QuestionService._validate_payload(data)
            scenario_id = data.get('scenario_database_id')
            scenario = db.session.get(ScenarioDatabase, scenario_id) if isinstance(scenario_id, int) else None
            if not scenario:
                raise ServiceError("Banco de dados (cenário) não encontrado.", 404)
            snapshot = QuestionService.trail_snapshot(scenario.id)
            # Sem posição informada, a questão entra no fim do seu nível de dificuldade.
            # Com posição informada, entra antes da questão que ocupava essa posição (empate
            # resolvido pela ordenação por dificuldade em renumber()).
            order = fields.pop('question_order', None)
            question = Question(
                scenario_database_id=scenario.id,
                question_order=(order - 0.5) if order else 10 ** 6,
                is_special=fields.pop('is_special', False),
                **fields,
            )
            db.session.add(question)
            db.session.flush()
            QuestionService.renumber(scenario.id, snapshot)
            db.session.commit()
            return True, question
        except ServiceError as e:
            db.session.rollback()
            return False, e.message
        except SQLAlchemyError as e:
            db.session.rollback()
            return False, f"Erro ao criar questão: {str(e)}"

    @staticmethod
    def get_all_questions():
        try:
            return True, db.session.query(Question).order_by(
                Question.scenario_database_id, Question.is_special, Question.question_order).all()
        except SQLAlchemyError as e:
            return False, f"Erro ao buscar questões: {str(e)}"

    @staticmethod
    def get_questions_by_scenario(scenario_id):
        try:
            questions = db.session.query(Question).filter_by(scenario_database_id=scenario_id) \
                .order_by(Question.is_special, Question.question_order).all()
            return True, questions
        except SQLAlchemyError as e:
            return False, f"Erro ao buscar questões do cenário: {str(e)}"

    @staticmethod
    def get_question_by_id(question_id):
        try:
            question = db.session.get(Question, question_id)
            if question:
                return True, question
            return False, "Questão não encontrada."
        except SQLAlchemyError as e:
            return False, f"Erro ao buscar questão: {str(e)}"

    @staticmethod
    def update_question(question_id, data):
        """Atualiza a questão preservando o histórico de submissões."""
        try:
            question = db.session.get(Question, question_id)
            if not question:
                raise ServiceError("Questão não encontrada.", 404)
            fields = QuestionService._validate_payload(data, partial=True)
            snapshot = QuestionService.trail_snapshot(question.scenario_database_id)
            order = fields.pop('question_order', None)
            for key, value in fields.items():
                setattr(question, key, value)
            if order is not None and order != question.question_order:
                # Move para antes da questão que estava na posição desejada (ou depois, se descendo).
                question.question_order = order - 0.5 if order < question.question_order else order + 0.5
            QuestionService.renumber(question.scenario_database_id, snapshot)
            db.session.commit()
            SupabaseService.invalidate_expected_cache(question.id)
            return True, question
        except ServiceError as e:
            db.session.rollback()
            return False, e.message
        except SQLAlchemyError as e:
            db.session.rollback()
            return False, f"Erro ao atualizar questão: {str(e)}"

    @staticmethod
    def delete_question(question_id):
        """Exclui a questão (submissões em cascata) e fecha a lacuna na trilha."""
        try:
            question = db.session.get(Question, question_id)
            if not question:
                return False, "Questão não encontrada."
            scenario_id = question.scenario_database_id
            snapshot = QuestionService.trail_snapshot(scenario_id)
            db.session.delete(question)
            db.session.flush()
            QuestionService.renumber(scenario_id, snapshot)
            db.session.commit()
            SupabaseService.invalidate_expected_cache(question_id)
            return True, "Questão e submissões excluídas com sucesso."
        except SQLAlchemyError as e:
            db.session.rollback()
            return False, f"Erro ao deletar questão: {str(e)}"


# =========================================================================
# SUBMISSION SERVICE (CAT - Computerized Adaptive Testing)
# =========================================================================

class SubmissionService:
    """
    Sessões de avaliação adaptativa (CAT) baseadas em busca binária sobre a trilha ordenada por
    dificuldade. Regras (conforme o artigo):
      - Início: questão mediana da trilha.
      - Acerto: avança para uma questão de nível superior.
      - Pulo (liberado após SKIP_MIN_SECONDS na questão): volta para uma questão de nível inferior.
      - Erro: a tentativa é registrada e o aluno pode tentar novamente a mesma questão.
    """

    MAX_ATTEMPT_SECONDS = 4 * 3600

    # ------------------------------------------------------------------
    # Estado e navegação
    # ------------------------------------------------------------------

    @staticmethod
    def next_position(h, l):
        return (h + l) // 2 if l - h > 1 else h + 1

    @staticmethod
    def assign_next_question(session, trail):
        """Define a próxima questão a partir de (H, L); finaliza a sessão se a trilha acabou."""
        total = len(trail)
        h = session.highest_mastered_order or 0
        l = session.lowest_failed_order if session.lowest_failed_order is not None else total + 1
        if l <= h:
            l = total + 1
        session.lowest_failed_order = l
        position = SubmissionService.next_position(h, l)
        if position > total or total == 0:
            session.is_finished = True
            session.current_question_id = None
            session.current_question_order = None
            session.current_question_started_at = None
            return None
        question = trail[position - 1]
        session.is_finished = False
        session.current_question_id = question.id
        session.current_question_order = position
        session.current_question_started_at = utcnow()
        return question

    @staticmethod
    def _skip_config():
        return int(current_app.config.get('SKIP_MIN_SECONDS', 180))

    @staticmethod
    def build_state(session, student_id, trail=None):
        """Payload do estado da trilha enviado ao aluno (sem gabaritos)."""
        from app.utils.serializers import serialize_question
        if trail is None:
            trail = QuestionService.trail_questions(session.scenario_database_id)
        total = len(trail)
        current = next((q for q in trail if q.id == session.current_question_id), None)

        solved_ids = {qid for (qid,) in db.session.query(Submission.question_id).join(Question).filter(
            Submission.student_id == student_id,
            Question.scenario_database_id == session.scenario_database_id,
            Submission.is_correct.is_(True),
            Submission.is_skipped.is_(False),
        ).distinct()}
        skipped_ids = {qid for (qid,) in db.session.query(Submission.question_id).filter(
            Submission.student_id == student_id,
            Submission.adaptive_session_id == session.id,
            Submission.is_skipped.is_(True),
        ).distinct()}

        h = session.highest_mastered_order or 0
        l = session.lowest_failed_order if session.lowest_failed_order is not None else total + 1
        # Só é possível pular se existir uma questão de nível inferior ainda não dominada;
        # a questão H+1 é a "fundamental" do nível atual.
        can_skip = bool(current) and current.question_order > h + 1
        skip_available_in = None
        if can_skip:
            started = session.current_question_started_at or utcnow()
            elapsed = (utcnow() - started).total_seconds()
            skip_available_in = max(0, math.ceil(SubmissionService._skip_config() - elapsed))

        return {
            "session_id": session.id,
            "is_finished": bool(session.is_finished),
            "trail_size": total,
            "mastered_until": h,
            "current_question": serialize_question(current),
            "solved_question_ids": sorted(solved_ids),
            "skipped_orders": sorted(q.question_order for q in trail if q.id in skipped_ids and q.id not in solved_ids),
            "can_skip": can_skip,
            "skip_available_in": skip_available_in,
            "skip_min_seconds": SubmissionService._skip_config(),
        }

    @staticmethod
    def _latest_session(student_id, scenario_id):
        return db.session.query(AdaptiveSession).filter_by(
            student_id=student_id, scenario_database_id=scenario_id).order_by(AdaptiveSession.id.desc()).first()

    @staticmethod
    def get_or_start_adaptive_session(student_id, scenario_id, force_new=False):
        """
        Retorna a sessão adaptativa do aluno no cenário (criando-a se necessário).
        Uma trilha concluída permanece concluída; se novas questões forem adicionadas depois,
        ela é reaberta a partir do ponto em que o aluno parou.
        """
        try:
            trail = QuestionService.trail_questions(scenario_id)
            if not trail:
                return False, {"error": "Cenário não possui questões cadastradas."}
            total = len(trail)
            session = None if force_new else SubmissionService._latest_session(student_id, scenario_id)

            if session is None:
                session = AdaptiveSession(
                    student_id=student_id,
                    scenario_database_id=scenario_id,
                    highest_mastered_order=0,
                    lowest_failed_order=total + 1,
                )
                db.session.add(session)
                db.session.flush()
                SubmissionService.assign_next_question(session, trail)
            elif session.is_finished:
                if (session.highest_mastered_order or 0) < total:
                    session.lowest_failed_order = total + 1
                    SubmissionService.assign_next_question(session, trail)
            else:
                current = next((q for q in trail if q.id == session.current_question_id), None)
                if current is None:
                    SubmissionService.assign_next_question(session, trail)
                else:
                    session.current_question_order = current.question_order
                    if session.current_question_started_at is None:
                        session.current_question_started_at = utcnow()

            db.session.commit()
            return True, SubmissionService.build_state(session, student_id, trail)
        except SQLAlchemyError as e:
            db.session.rollback()
            return False, {"error": f"Erro ao inicializar sessão adaptativa: {str(e)}"}

    @staticmethod
    def reset_session(student_id, scenario_id):
        """Recomeça a trilha do zero (o histórico de submissões é preservado)."""
        try:
            active = db.session.query(AdaptiveSession).filter_by(
                student_id=student_id, scenario_database_id=scenario_id, is_finished=False).all()
            for s in active:
                s.is_finished = True
                s.current_question_id = None
                s.current_question_order = None
            db.session.flush()
            return SubmissionService.get_or_start_adaptive_session(student_id, scenario_id, force_new=True)
        except SQLAlchemyError as e:
            db.session.rollback()
            return False, {"error": f"Erro ao reiniciar a trilha: {str(e)}"}

    # ------------------------------------------------------------------
    # Submissões
    # ------------------------------------------------------------------

    @staticmethod
    def practice_allowed(session, question, state):
        """Questões revisáveis fora da trilha: dominadas, resolvidas, puladas ou especiais."""
        if question.is_special:
            return True
        if question.id in state["solved_question_ids"]:
            return True
        if question.question_order <= (session.highest_mastered_order or 0):
            return True
        return question.question_order in state["skipped_orders"]

    @staticmethod
    def _attempt_seconds(session, question, student_id, is_cat, client_seconds):
        now = utcnow()
        if is_cat:
            last = db.session.query(func.max(Submission.submitted_at)).filter(
                Submission.student_id == student_id,
                Submission.question_id == question.id,
                Submission.adaptive_session_id == session.id,
            ).scalar()
            start = session.current_question_started_at or now
            if last and last > start:
                start = last
            seconds = (now - start).total_seconds()
        else:
            try:
                seconds = float(client_seconds or 0)
            except (TypeError, ValueError):
                seconds = 0
        return int(max(0, min(seconds, SubmissionService.MAX_ATTEMPT_SECONDS)))

    @staticmethod
    def submit_adaptive_answer(student_id, question, submitted_query, is_correct, output,
                               is_skipped=False, client_seconds=None):
        """
        Registra uma tentativa (ou pulo) e atualiza a busca binária quando a questão é a atual da
        trilha. Retorna (sucesso, payload | ServiceError).
        """
        try:
            ok, state = SubmissionService.get_or_start_adaptive_session(student_id, question.scenario_database_id)
            if not ok:
                return False, ServiceError(state.get("error"), 400)
            session = db.session.get(AdaptiveSession, state["session_id"])
            is_cat = (not session.is_finished) and session.current_question_id == question.id

            if not is_cat and not SubmissionService.practice_allowed(session, question, state):
                return False, ServiceError("Esta questão ainda não foi liberada na sua trilha.", 403)
            if is_skipped and not is_cat:
                return False, ServiceError("Só é possível pular a questão atual da trilha.", 400)

            trail = QuestionService.trail_questions(question.scenario_database_id)
            total = len(trail)
            h = session.highest_mastered_order or 0
            l = session.lowest_failed_order if session.lowest_failed_order is not None else total + 1
            position = question.question_order

            if is_skipped:
                if position <= h + 1:
                    return False, ServiceError(
                        "Esta é a questão fundamental para o seu nível atual e não pode ser pulada. "
                        "Revise os conceitos e tente resolvê-la.", 400)
                started = session.current_question_started_at or utcnow()
                remaining = SubmissionService._skip_config() - (utcnow() - started).total_seconds()
                if remaining > 0:
                    return False, ServiceError(
                        f"O pulo é liberado após {SubmissionService._skip_config() // 60} minutos de "
                        f"tentativa. Aguarde mais {int(remaining) + 1} segundos.", 400)

            seconds = SubmissionService._attempt_seconds(session, question, student_id, is_cat, client_seconds)
            attempt_number = db.session.query(Submission).filter_by(
                student_id=student_id, question_id=question.id, adaptive_session_id=session.id).count() + 1

            advanced = False
            if is_cat and (is_skipped or is_correct):
                if is_correct:
                    new_h, new_l = max(h, position), l
                    if new_l <= new_h:
                        new_l = total + 1
                else:  # pulo: limita a busca às questões de nível inferior
                    new_h, new_l = h, min(l, position)
                # Atualização condicional: só aplica se a questão atual ainda for esta
                # (evita aplicar duas vezes em cliques duplos ou abas simultâneas).
                updated = db.session.query(AdaptiveSession).filter(
                    AdaptiveSession.id == session.id,
                    AdaptiveSession.current_question_id == question.id,
                ).update({
                    AdaptiveSession.highest_mastered_order: new_h,
                    AdaptiveSession.lowest_failed_order: new_l,
                }, synchronize_session=False)
                if updated:
                    db.session.refresh(session)
                    SubmissionService.assign_next_question(session, trail)
                    advanced = True
                else:
                    is_cat = False
                    db.session.refresh(session)

            db.session.add(Submission(
                student_id=student_id,
                question_id=question.id,
                adaptive_session_id=session.id,
                time_spent_seconds=seconds,
                submitted_query=str(submitted_query) if submitted_query else None,
                is_correct=bool(is_correct) and not is_skipped,
                is_skipped=bool(is_skipped),
                is_practice=not is_cat,
                attempt_number=attempt_number,
                execution_output=json.dumps(output, ensure_ascii=False) if output else None,
            ))
            db.session.commit()

            new_state = SubmissionService.build_state(session, student_id, trail)
            if not is_cat:
                message = "Modo prática: resposta registrada. Seu progresso na trilha não foi alterado."
            elif session.is_finished:
                message = "Você concluiu toda a trilha de aprendizado!"
            elif advanced and is_skipped:
                message = "Questão pulada. Carregando uma questão de nível inferior."
            elif advanced:
                message = "Progresso salvo. Próxima questão carregada."
            else:
                message = "Tentativa registrada. Revise sua consulta e tente novamente."
            new_state.update({
                "next_question": new_state["current_question"],
                "advanced": advanced,
                "is_practice": not is_cat,
                "cat_message": message,
            })
            return True, new_state
        except SQLAlchemyError as e:
            db.session.rollback()
            return False, ServiceError(f"Erro ao processar submissão: {str(e)}", 500)


__all__ = ['ScenarioDatabaseService', 'QuestionService', 'SubmissionService', 'SupabaseService',
           'SQLGrader', 'ServiceError']
