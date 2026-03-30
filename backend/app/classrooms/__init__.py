from app.classrooms.routes import cassrooms_bp

def init_app(app):
    app.register_blueprint(cassrooms_bp, url_prefix='/cassrooms')