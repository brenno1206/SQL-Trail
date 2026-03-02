from flask import Flask
from flask_cors import CORS
from dotenv import load_dotenv
import os

def create_app():
    load_dotenv()

    app = Flask(__name__)

    config_class = os.getenv('APP_SETTINGS', 'config.DevelopmentConfig')
    app.config.from_object(config_class)
    app.secret_key = os.getenv('FLASK_SECRET_KEY')

    CORS(app, origins=["http://localhost:3000", "http://127.0.0.1:3000"])

    from .main import main as main_blueprint
    app.register_blueprint(main_blueprint)
    
    return app