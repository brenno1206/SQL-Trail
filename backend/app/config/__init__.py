import os
from dotenv import load_dotenv
from flask_cors import CORS

load_dotenv()

class DefaultConfig:
    DEBUG = False
    TESTING = False
    SECRET_KEY = os.getenv('FLASK_SECRET_KEY', 'chave-padrao-insegura')
    
    JWT_SECRET_KEY = os.getenv('JWT_SECRET_KEY')
    
    CORS_ORIGINS = ["http://localhost:3000", "http://127.0.0.1:3000"]

class DevelopmentConfig(DefaultConfig):
    DEBUG = True

class ProductionConfig(DefaultConfig):
    origins_env = os.getenv('CORS_ORIGINS')
    if origins_env:
        CORS_ORIGINS = origins_env.split(',')
    else:
        CORS_ORIGINS = ["https://dominio.com"]

def init_app(app):
    config_class = os.getenv('APP_SETTINGS', 'app.config.DevelopmentConfig')
    app.config.from_object(config_class)

    CORS(app, origins=app.config.get('CORS_ORIGINS'))