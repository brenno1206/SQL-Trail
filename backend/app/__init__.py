from flask import Flask


def create_app(config_object=None):
    """Função factory para criar e configurar a aplicação Flask."""

    app = Flask(__name__)

    from app.config import init_app as init_config
    init_config(app, config_object)

    from app.database import init_app as init_database
    init_database(app)

    from app.routes import init_app as init_routes
    init_routes(app)

    return app
