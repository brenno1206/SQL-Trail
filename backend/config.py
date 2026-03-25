import os

class DefaultConfig:
    DEBUG = False
    TESTING = False
    SECRET_KEY = os.getenv('SECRET_KEY', 'chave-padrao-insegura')
    CORS_ORIGINS = ["http://localhost:3000", "http://127.0.0.1:3000"]

class DevelopmentConfig(DefaultConfig):
    DEBUG = True

class ProductionConfig(DefaultConfig):
    origins_env = os.getenv('CORS_ORIGINS')
    if origins_env:
        CORS_ORIGINS = origins_env.split(',')
    else:
        CORS_ORIGINS = ["https://dominio.com"]