from app.reports.routes import reports_bp as bp

def init_app(app):
    app.register_blueprint(bp, url_prefix='/reports')