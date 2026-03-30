from flask import Flask

def create_app():

    app = Flask(__name__)

    from app.config import init_app as init_config
    init_config(app)

    from app.main import init_app as init_main
    init_main(app)

    from app.auth import init_app as init_auth
    init_auth(app)

    from app.classrooms import init_app as init_cassrooms
    init_cassrooms(app)
    
    return app