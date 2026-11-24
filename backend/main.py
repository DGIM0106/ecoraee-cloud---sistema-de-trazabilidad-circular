import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from dotenv import load_dotenv
from sqlmodel import text

from MyDbContext import create_all_tables, engine
import models  # noqa: F401 - Registra todos los modelos SQLModel antes de create_all_tables
from services.seed_service import seed_initial_data
from services.s3_service import get_storage_status
from app.routers import (
    router_users,
    router_catalogs,
    router_solicitudes,
    router_dispositivos,
    router_network,
)

load_dotenv()

app = FastAPI(lifespan=create_all_tables)

raw_origins = os.getenv(
    "CORS_ORIGINS",
    "http://localhost:5173,http://127.0.0.1:5173,http://localhost:3000,http://127.0.0.1:3000",
)
allow_origins = [origin.strip() for origin in raw_origins.split(",") if origin.strip()]
if "*" in allow_origins:
    allow_origins = ["*"]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allow_origins,
    allow_credentials="*" not in allow_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

uploads_dir = os.path.join(os.path.dirname(__file__), "uploads")
os.makedirs(uploads_dir, exist_ok=True)
app.mount("/uploads", StaticFiles(directory=uploads_dir), name="uploads")

app.include_router(router_users.auth)
app.include_router(router_catalogs.catalogos)
app.include_router(router_solicitudes.solicitudes)
app.include_router(router_dispositivos.dispositivos)
app.include_router(router_network.red)


@app.get("/")
def root():
    return {
        "sistema": "EcoRAEE Cloud API",
        "version": "2.0.0",
        "arquitectura": "DTOs + UUID + Catálogos BD (Categorías & Objetos)",
        "cloud_ready": "AWS RDS SQL Server + EC2 + S3",
        "almacenamiento": get_storage_status(),
        "estado": "Operativo",
    }


@app.post("/seed", tags=["Inicialización"])
def inicializar_datos_base():
    """
    Endpoint sincrónico opcional para poblar catálogos iniciales con UUID
    si la base de datos (SQL Server local o AWS RDS) está vacía.
    """
    seed_initial_data()
    return {"message": "Catálogos iniciales verificados / creados correctamente."}


@app.get("/health")
def health_check():
    db_ok = False
    db_error = None
    try:
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))
            db_ok = True
    except Exception as exc:
        db_error = str(exc)

    return {
        "status": "healthy" if db_ok else "degraded",
        "database": "connected" if db_ok else "error",
        "database_error": db_error,
        "storage": get_storage_status(),
    }
