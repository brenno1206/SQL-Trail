import os
import secrets

import click
from flask_sqlalchemy import SQLAlchemy
from sqlalchemy import event, inspect, text
from sqlalchemy.engine import Engine
from werkzeug.security import generate_password_hash

from app.database.models import Base, Admin, ScenarioDatabase, Question, AdaptiveSession, Submission

# Inicializa a extensão vinculando-a ao metadata dos modelos
db = SQLAlchemy(metadata=Base.metadata)


@event.listens_for(Engine, "connect")
def _enable_sqlite_foreign_keys(dbapi_connection, connection_record):
    """
    O SQLite só aplica chaves estrangeiras (e o ON DELETE CASCADE) com este PRAGMA ativo.
    Sem ele, excluir um aluno/professor/cenário deixaria registros órfãos.
    """
    module = type(dbapi_connection).__module__
    if module.startswith('sqlite3') or 'sqlite' in module:
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()


# Colunas adicionadas depois da primeira versão do banco. O SQLite não altera tabelas
# existentes com create_all(), então elas são adicionadas aqui (migração leve e idempotente).
_ADDED_COLUMNS = {
    'students': [('access_code_hash', 'VARCHAR(255)')],
    'enrollments': [('created_at', 'TIMESTAMP')],
    'adaptive_sessions': [
        ('current_question_id', 'INTEGER REFERENCES questions(id) ON DELETE SET NULL'),
        ('current_question_started_at', 'TIMESTAMP'),
    ],
    'submissions': [('is_practice', 'BOOLEAN NOT NULL DEFAULT 0')],
}


def ensure_schema():
    """Cria as tabelas ausentes e adiciona colunas novas a bancos criados por versões antigas."""
    db.create_all()
    inspector = inspect(db.engine)
    existing_tables = set(inspector.get_table_names())
    with db.engine.begin() as conn:
        for table, columns in _ADDED_COLUMNS.items():
            if table not in existing_tables:
                continue
            current = {c['name'] for c in inspector.get_columns(table)}
            for name, ddl in columns:
                if name not in current:
                    conn.execute(text(f'ALTER TABLE {table} ADD COLUMN {name} {ddl}'))


def init_app(app):
    """Inicializa a extensão Flask-SQLAlchemy e registra os comandos CLI locais."""
    if not app.config.get("SQLALCHEMY_DATABASE_URI"):
        os.makedirs(app.instance_path, exist_ok=True)
        db_path = os.path.join(app.instance_path, 'sql_trail.db')
        app.config["SQLALCHEMY_DATABASE_URI"] = f"sqlite:///{db_path}"
    app.config.setdefault("SQLALCHEMY_TRACK_MODIFICATIONS", False)

    db.init_app(app)

    with app.app_context():
        ensure_schema()

    # =========================================================================
    # COMANDOS CLI (TERMINAL)
    # =========================================================================
    @app.cli.command("create-db")
    def create_db():
        """Cria as tabelas do banco SQLite local (e aplica colunas novas)."""
        ensure_schema()
        click.echo("Banco de dados SQLite materializado com sucesso!")

    @app.cli.command("drop-db")
    @click.confirmation_option(prompt="Tem certeza que deseja apagar TUDO do seu SQLite local?")
    def drop_db():
        """Remove todas as tabelas do banco de dados SQLite local."""
        db.drop_all()
        click.echo("Banco de dados SQLite removido com sucesso.")

    @app.cli.command("seed-dev")
    @click.option('--yes', is_flag=True, help='Não pede confirmação ao apagar progresso existente.')
    def seed_dev(yes):
        """Popula o banco com administrador padrão, cenários e a trilha de questões."""
        seed_database(confirm=not yes)

    @app.cli.command("reset-db")
    @click.confirmation_option(prompt="Isso apaga TODOS os dados locais (usuários, turmas e progresso). Continuar?")
    def reset_db():
        """Recria o banco do zero (necessário para bancos antigos ganharem AUTOINCREMENT) e popula."""
        db.drop_all()
        ensure_schema()
        seed_database(confirm=False)


def _ensure_default_admin():
    """Cria um administrador padrão apenas se ainda não existir nenhum."""
    if db.session.query(Admin).count() > 0:
        click.echo("Administradores existentes preservados.")
        return
    email = os.getenv('SEED_ADMIN_EMAIL', 'admin@sqltrail.com')
    password = os.getenv('SEED_ADMIN_PASSWORD')
    generated = False
    if not password:
        password = secrets.token_urlsafe(12)
        generated = True
    db.session.add(Admin(name="Administrador Trail", email=email, password_hash=generate_password_hash(password)))
    click.echo(f"Administrador criado: {email}")
    if generated:
        click.echo(f"Senha gerada (anote, ela não será exibida novamente): {password}")


def seed_database(confirm=True):
    """
    Popula cenários e questões de forma idempotente.

    Os cenários são atualizados pelo slug. As questões dos cenários semeados são recriadas, o que
    apaga (em cascata) o progresso e as submissões desses cenários; por isso há confirmação.
    """
    from app.database.seed_data import SCENARIOS, QUESTIONS_BY_SCENARIO

    slugs = [s["slug"] for s in SCENARIOS]
    existing = db.session.query(ScenarioDatabase).filter(ScenarioDatabase.slug.in_(slugs)).all()
    existing_ids = [s.id for s in existing]
    if existing_ids:
        progress = db.session.query(Submission).join(Question).filter(
            Question.scenario_database_id.in_(existing_ids)).count()
        progress += db.session.query(AdaptiveSession).filter(
            AdaptiveSession.scenario_database_id.in_(existing_ids)).count()
        if progress and confirm and not click.confirm(
                f"Existem {progress} registros de progresso nesses cenários que serão apagados. Continuar?"):
            click.echo("Operação cancelada.")
            return

    _ensure_default_admin()

    by_slug = {s.slug: s for s in existing}
    total = 0
    for sc in SCENARIOS:
        scenario = by_slug.get(sc["slug"])
        if scenario is None:
            scenario = ScenarioDatabase(slug=sc["slug"], name=sc["name"], diagram_url=sc["diagram_url"])
            db.session.add(scenario)
            db.session.flush()
        else:
            scenario.name = sc["name"]
            scenario.diagram_url = sc["diagram_url"]
            db.session.query(AdaptiveSession).filter_by(scenario_database_id=scenario.id).delete()
            db.session.query(Question).filter_by(scenario_database_id=scenario.id).delete()

        questions = sorted(enumerate(QUESTIONS_BY_SCENARIO[sc["slug"]]), key=lambda p: (p[1]["diff"], p[0]))
        for order, (_, q) in enumerate(questions, start=1):
            db.session.add(Question(
                scenario_database_id=scenario.id,
                statement=q["statement"],
                expected_query=q["query"],
                question_order=order,
                difficulty=q["diff"],
                is_special=False,
            ))
            total += 1

    db.session.commit()
    click.echo(f"Banco de dados populado com sucesso ({total} questões em {len(SCENARIOS)} cenários).")
