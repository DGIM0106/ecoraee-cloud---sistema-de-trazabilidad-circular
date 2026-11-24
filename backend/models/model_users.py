from typing import Optional
from uuid import UUID, uuid4
from sqlmodel import SQLModel, Field


class ModelOrganizacion(SQLModel, table=True):
    __tablename__ = "ORGANIZACION"

    id_organizacion: UUID = Field(default_factory=uuid4, primary_key=True)
    ruc: str = Field(max_length=13, unique=True)
    razon_social: str = Field(max_length=150)
    direccion: Optional[str] = Field(default=None, max_length=200)
    telefono: Optional[str] = Field(default=None, max_length=30)


class ModelRol(SQLModel, table=True):
    __tablename__ = "ROL"

    id_rol: UUID = Field(default_factory=uuid4, primary_key=True)
    nombre_rol: str = Field(max_length=60, unique=True)
    descripcion: Optional[str] = Field(default=None, max_length=250)


class ModelUsuario(SQLModel, table=True):
    __tablename__ = "USUARIO"

    id_usuario: UUID = Field(default_factory=uuid4, primary_key=True)
    nombre: str = Field(max_length=100)
    correo: str = Field(max_length=100, unique=True)
    id_organizacion: UUID = Field(foreign_key="ORGANIZACION.id_organizacion")
    id_rol: UUID = Field(foreign_key="ROL.id_rol")
