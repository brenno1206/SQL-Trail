from flask import jsonify
from flask_jwt_extended import JWTManager

from app.routes.auth import auth_bp
from app.routes.classroom import classrooms_bp
from app.routes.reports import reports_bp
from app.routes.submission import submission_bp


def _register_jwt_handlers(jwt):
    """Erros de autenticação no mesmo formato ({"error": ...}) das demais rotas."""

    @jwt.expired_token_loader
    def expired(_header, _payload):
        return jsonify({"error": "Sua sessão expirou. Faça login novamente.", "code": "token_expired"}), 401

    @jwt.invalid_token_loader
    def invalid(reason):
        return jsonify({"error": "Token de acesso inválido. Faça login novamente.", "code": "token_invalid"}), 401

    @jwt.unauthorized_loader
    def missing(reason):
        return jsonify({"error": "Autenticação necessária.", "code": "token_missing"}), 401


def init_app(app):
    """Registra os blueprints das rotas e o JWT."""
    jwt = JWTManager()
    jwt.init_app(app)
    _register_jwt_handlers(jwt)

    @app.errorhandler(413)
    def too_large(_e):
        return jsonify({"error": "Arquivo muito grande (limite de 5 MB)."}), 413

    app.register_blueprint(auth_bp, url_prefix='/auth')
    app.register_blueprint(submission_bp)
    app.register_blueprint(classrooms_bp, url_prefix='/classrooms')
    app.register_blueprint(reports_bp, url_prefix='/reports')
