from app.classrooms.routes import classrooms_bp

def init_app(app):
    app.register_blueprint(classrooms_bp, url_prefix='/classrooms')