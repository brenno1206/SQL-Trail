from app.auth.routes import auth_bp
from flask_jwt_extended import JWTManager

def init_app(app):
    """Inicialização do módulo de autenticação."""
    jwt = JWTManager()
    jwt.init_app(app) 
    app.register_blueprint(auth_bp, url_prefix='/auth')