from sqlalchemy import create_engine, URL
from sqlalchemy.orm import sessionmaker
import os
from dotenv import load_dotenv


load_dotenv()

TIDB_HOST = os.getenv("TIDB_HOST")
TIDB_PORT = int(os.getenv("TIDB_PORT"))
TIDB_USER = os.getenv("TIDB_USER")
TIDB_PASSWORD = os.getenv("TIDB_PASSWORD")
TIDB_DB_NAME = os.getenv("TIDB_DB_NAME")
CA_PATH = os.getenv("CA_PATH")

connect_args = {
    "ssl_verify_cert": True,
    "ssl_verify_identity": True,
    "ssl_ca": CA_PATH,
}

engine = create_engine(
    URL.create(
        drivername="mysql+pymysql",
        username=TIDB_USER,
        password=TIDB_PASSWORD,
        host=TIDB_HOST,
        port=TIDB_PORT,
        database=TIDB_DB_NAME,
    ),
    connect_args=connect_args,
    pool_recycle=300
)

Session = sessionmaker(bind=engine)