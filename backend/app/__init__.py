from flask import Flask
from flask_cors import CORS
from dotenv import load_dotenv
import os
from app.main import init_app as init_main
from app.auth import init_app as init_auth

def create_app():
    load_dotenv()

    app = Flask(__name__)

    config_class = os.getenv('APP_SETTINGS', 'config.DevelopmentConfig')
    app.config.from_object(config_class)

    CORS(app, origins=app.config.get('CORS_ORIGINS'))

    init_main(app)
    init_auth(app)
    
    return app