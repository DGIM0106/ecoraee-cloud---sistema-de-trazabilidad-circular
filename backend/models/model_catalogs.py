from decimal import Decimal
from typing import Optional
from uuid import UUID, uuid4
from sqlmodel import SQLModel, Field


class ModelTipoCentro(SQLModel, table=True):
    __tablename__ = "TIPO_CENTRO"

    id_tipo_centro: UUID = Field(default_factory=uuid4, primary_key=True)
    nombre_tipo: str = Field(max_length=60, unique=True)


class ModelCentro(SQLModel, table=True):
    __tablename__ = "CENTRO"

    id_centro: UUID = Field(default_factory=uuid4, primary_key=True)
    codigo_centro: str = Field(max_length=20, unique=True)
    nombre_centro: str = Field(max_length=120)
    direccion: str = Field(max_length=200)
    ciudad: Optional[str] = Field(default="Quito", max_length=80)
    capacidad_max_ton: Decimal = Field(default=Decimal("50.00"), max_digits=10, decimal_places=2)
    id_tipo_centro: UUID = Field(foreign_key="TIPO_CENTRO.id_tipo_centro")


class ModelCategoria(SQLModel, table=True):
    __tablename__ = "CATEGORIA"

    id_categoria: UUID = Field(default_factory=uuid4, primary_key=True)
    codigo_categoria: str = Field(max_length=30, unique=True)
    nombre_categoria: str = Field(max_length=100, unique=True)
    descripcion: Optional[str] = Field(default=None, max_length=250)


class ModelObjeto(SQLModel, table=True):
    """
    Catálogo de objetos/equipos electrónicos registrados en la base de datos.
    Los dispositivos RAEE solo pueden crearse seleccionando un objeto y categoría
    existentes en esta tabla (no mediante texto libre).
    """

    __tablename__ = "OBJETO"

    id_objeto: UUID = Field(default_factory=uuid4, primary_key=True)
    codigo_objeto: str = Field(max_length=30, unique=True)
    nombre_objeto: str = Field(max_length=120, unique=True)
    marca: str = Field(max_length=50)
    modelo: str = Field(max_length=60)
    descripcion: Optional[str] = Field(default=None, max_length=250)
    peso_estimado_kg: Optional[Decimal] = Field(default=None, max_digits=8, decimal_places=2)
    id_categoria: UUID = Field(foreign_key="CATEGORIA.id_categoria")


class ModelCondicion(SQLModel, table=True):
    __tablename__ = "CONDICION"

    id_condicion: UUID = Field(default_factory=uuid4, primary_key=True)
    descripcion_condicion: str = Field(max_length=120, unique=True)


class ModelEstadoCatalogo(SQLModel, table=True):
    __tablename__ = "ESTADO_CATALOGO"

    id_estado: UUID = Field(default_factory=uuid4, primary_key=True)
    orden: int = Field(unique=True)
    nombre_estado: str = Field(max_length=60, unique=True)
