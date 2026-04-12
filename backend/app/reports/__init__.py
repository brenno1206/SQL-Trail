from app.reports.routes import reports_bp as bp

def init_app(app):
    """Inicializa o módulo de relatórios, registrando as rotas e preparando o serviço."""
    app.register_blueprint(bp, url_prefix='/reports')