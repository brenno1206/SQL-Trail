from app.routes.auth import auth_bp
from app.routes.classroom import classrooms_bp
from app.routes.reports import reports_bp
from app.routes.submission import submission_bp
from flask_jwt_extended import JWTManager

def init_app(app):
    """Registra os blueprints das rotas"""
    jwt = JWTManager()
    jwt.init_app(app) 
    app.register_blueprint(auth_bp, url_prefix='/auth')
    app.register_blueprint(submission_bp)
    app.register_blueprint(classrooms_bp, url_prefix='/classrooms')
    app.register_blueprint(reports_bp, url_prefix='/reports')