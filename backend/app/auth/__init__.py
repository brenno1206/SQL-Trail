from app.auth.routes import auth_bp
from flask_jwt_extended import JWTManager

# Inicialização do módulo de autenticação
# Isso inclui o Login, o CRUD de usuários
# E a configuração do JWT para autenticação baseada em tokens

def init_app(app):
    jwt = JWTManager()
    jwt.init_app(app) 
    app.register_blueprint(auth_bp, url_prefix='/auth')