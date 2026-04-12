from app.main.routes import bp

def init_app(app):
    """Inicializa o módulo principal, registrando as rotas e preparando o serviço."""
    app.register_blueprint(bp)