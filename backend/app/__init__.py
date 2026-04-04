from flask import Flask

def create_app():

    app = Flask(__name__)

    from app.config import init_app as init_config
    init_config(app)

    from app.main import init_app as init_main
    init_main(app)

    from app.auth import init_app as init_auth
    init_auth(app)

    from app.classrooms import init_app as init_classrooms
    init_classrooms(app)

    from app.reports import init_app as init_reports
    init_reports(app)
    
    return app