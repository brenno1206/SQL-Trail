from app.classrooms.routes import classrooms_bp

def init_app(app):
    """Função de inicialização do módulo de turmas."""
    app.register_blueprint(classrooms_bp, url_prefix='/classrooms')