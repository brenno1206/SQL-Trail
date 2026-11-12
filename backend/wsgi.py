"""Ponto de entrada WSGI (ex.: `gunicorn wsgi:app`) e execução direta (`python wsgi.py`).

Para desenvolvimento use `flask run` dentro de backend/ (o Flask encontra a factory
create_app do pacote `app`).
"""
from app import create_app

app = create_app()

if __name__ == '__main__':
    app.run(port=5000)
