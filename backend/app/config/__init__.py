import os
from dotenv import load_dotenv
from flask_cors import CORS

load_dotenv()

class DefaultConfig:
    """Configurações padrão para a aplicação Flask."""
    DEBUG = False
    TESTING = False
    SECRET_KEY = os.getenv('FLASK_SECRET_KEY', 'chave-padrao-insegura')
    
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY')
    
    CORS_ORIGINS = ["http://localhost:3000", "http://127.0.0.1:3000"]

class DevelopmentConfig(DefaultConfig):
    """Configurações específicas para o ambiente de desenvolvimento."""
    DEBUG = True

class ProductionConfig(DefaultConfig):
    """Configurações específicas para o ambiente de produção."""
    origins_env = os.getenv('CORS_ORIGINS')
    if origins_env:
        CORS_ORIGINS = origins_env.split(',')
    else:
        CORS_ORIGINS = ["https://dominio.com"]

def init_app(app):
    """Inicializa a aplicação Flask com as configurações apropriadas."""
    config_class = os.getenv('APP_SETTINGS', 'app.config.DevelopmentConfig')
    app.config.from_object(config_class)

    CORS(app, origins=app.config.get('CORS_ORIGINS'), resources={r"/*": {"origins": "*"}}, supports_credentials=True)