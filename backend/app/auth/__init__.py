from app.auth.routes import auth_bp
from flask_jwt_extended import JWTManager
import os


def init_app(app):
    jwt = JWTManager()
    app.config['JWT_SECRET_KEY'] = os.getenv('JWT_SECRET_KEY')
    jwt.init_app(app) 
    app.register_blueprint(auth_bp, url_prefix='/auth')