import os

class DefaultConfig:
    DEBUG = False
    TESTING = False
    SECRET_KEY = os.getenv('SECRET_KEY', 'chave-padrao-insegura')

class DevelopmentConfig(DefaultConfig):
    DEBUG = True
    TESTING = True
    ENV = 'development'
    FLASK_DEBUG = 1

class ProductionConfig(DefaultConfig):
	DEBUG = False
	ENV = 'production'