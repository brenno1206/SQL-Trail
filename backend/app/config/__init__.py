import logging
import os
import secrets
from datetime import timedelta

from dotenv import load_dotenv
from flask_cors import CORS

load_dotenv()

logger = logging.getLogger(__name__)


def _split_env_list(name):
    value = os.getenv(name, '')
    return [item.strip() for item in value.split(',') if item.strip()]


class DefaultConfig:
    """Configurações padrão para a aplicação Flask."""
    DEBUG = False
    TESTING = False
    REQUIRE_SECRETS = False

    SECRET_KEY = os.getenv('FLASK_SECRET_KEY')
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY')
    # O token dura mais que o limite de inatividade do frontend (30 min); se expirar,
    # o frontend recebe 401 e faz logout automaticamente.
    JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=int(os.getenv('JWT_EXPIRES_HOURS', '4')))

    CORS_ORIGINS = _split_env_list('CORS_ORIGINS') or ["http://localhost:3000", "http://127.0.0.1:3000"]

    MAX_CONTENT_LENGTH = 5 * 1024 * 1024  # uploads de planilhas de alunos

    # Tempo mínimo (segundos) na questão atual antes de poder pulá-la (artigo: 3 minutos).
    SKIP_MIN_SECONDS = int(os.getenv('SKIP_MIN_SECONDS', '180'))
    # Limites de resultado das consultas executadas nos cenários.
    MAX_RESULT_ROWS = int(os.getenv('MAX_RESULT_ROWS', '10000'))
    DISPLAY_RESULT_ROWS = int(os.getenv('DISPLAY_RESULT_ROWS', '500'))


class DevelopmentConfig(DefaultConfig):
    """Configurações específicas para o ambiente de desenvolvimento."""
    DEBUG = True


class TestingConfig(DefaultConfig):
    """Configuração usada pelos testes automatizados."""
    TESTING = True
    SECRET_KEY = 'test-secret'
    JWT_SECRET_KEY = 'test-jwt-secret-with-at-least-32-bytes!!'
    SQLALCHEMY_DATABASE_URI = 'sqlite://'


class ProductionConfig(DefaultConfig):
    """Configurações específicas para o ambiente de produção."""
    REQUIRE_SECRETS = True
    CORS_ORIGINS = _split_env_list('CORS_ORIGINS')


def init_app(app, config_object=None):
    """Inicializa a aplicação Flask com as configurações apropriadas."""
    config_class = config_object or os.getenv('APP_SETTINGS', 'app.config.DevelopmentConfig')
    app.config.from_object(config_class)

    for key in ('SECRET_KEY', 'JWT_SECRET_KEY'):
        if not app.config.get(key):
            if app.config.get('REQUIRE_SECRETS'):
                raise RuntimeError(f"A variável de ambiente para {key} é obrigatória em produção.")
            # Em desenvolvimento gera um segredo aleatório (os tokens deixam de valer ao reiniciar).
            app.config[key] = secrets.token_hex(32)
            logger.warning("%s não definido no .env; usando um valor aleatório temporário.", key)

    origins = app.config.get('CORS_ORIGINS') or []
    if app.config.get('REQUIRE_SECRETS') and not origins:
        raise RuntimeError("Defina CORS_ORIGINS (lista separada por vírgulas) em produção.")

    # A autenticação usa o header Authorization (Bearer), não cookies: sem credenciais no CORS.
    CORS(app, resources={r"/*": {"origins": origins}}, supports_credentials=False)
