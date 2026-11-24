from typing import Annotated
from dotenv import load_dotenv
from fastapi import Depends, FastAPI
from sqlmodel import SQLModel, Session
from sqlmodel import create_engine
import os

load_dotenv()

database_url = os.getenv(
    "DATABASE_URL",
    "mssql+pyodbc://@localhost/EcoRAEE_DB?driver=ODBC+Driver+17+for+SQL+Server&trusted_connection=yes&TrustServerCertificate=yes"
)


engine = create_engine(database_url, echo= True)

def create_all_tables(app: FastAPI):
    SQLModel.metadata.create_all(engine)
    yield

def get_session():
    with Session(engine) as session:
        yield session

SessionDep = Annotated[Session, Depends(get_session)]