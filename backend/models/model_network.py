from datetime import datetime, timezone
from decimal import Decimal
from typing import Optional
from uuid import UUID, uuid4
from sqlmodel import SQLModel, Field


class ModelNodo(SQLModel, table=True):
    __tablename__ = "NODO"

    id_nodo: UUID = Field(default_factory=uuid4, primary_key=True)
    id_centro: Optional[UUID] = Field(default=None, foreign_key="CENTRO.id_centro")
    tipo_nodo: str = Field(max_length=50)
    capacidad_nodo: Decimal = Field(max_digits=10, decimal_places=2)


class ModelArista(SQLModel, table=True):
    __tablename__ = "ARISTA"

    id_arista: UUID = Field(default_factory=uuid4, primary_key=True)
    distancia_km: Decimal = Field(max_digits=8, decimal_places=2)
    tiempo_estimado_min: int
    id_nodo_origen: UUID = Field(foreign_key="NODO.id_nodo")
    id_nodo_destino: UUID = Field(foreign_key="NODO.id_nodo")


class ModelEscenario(SQLModel, table=True):
    __tablename__ = "ESCENARIO"

    id_escenario: UUID = Field(default_factory=uuid4, primary_key=True)
    codigo_escenario: str = Field(max_length=30, unique=True)
    resultado: str = Field(max_length=150)


class ModelIndicador(SQLModel, table=True):
    __tablename__ = "INDICADOR"

    id_indicador: UUID = Field(default_factory=uuid4, primary_key=True)
    nombre_indicador: str = Field(max_length=100)
    valor_meta: Decimal = Field(max_digits=12, decimal_places=2)
    valor_actual: Decimal = Field(max_digits=12, decimal_places=2)
    periodo: str = Field(max_length=20)
    id_escenario: UUID = Field(foreign_key="ESCENARIO.id_escenario")


class ModelAlerta(SQLModel, table=True):
    __tablename__ = "ALERTA"

    id_alerta: UUID = Field(default_factory=uuid4, primary_key=True)
    fecha_generacion: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    nivel_criticidad: str = Field(max_length=20)
    mensaje: str = Field(max_length=250)
    estado_alerta: str = Field(default="Activa", max_length=30)
    id_centro: UUID = Field(foreign_key="CENTRO.id_centro")


class ModelAuditoria(SQLModel, table=True):
    __tablename__ = "AUDITORIA"

    id_auditoria: UUID = Field(default_factory=uuid4, primary_key=True)
    fecha_accion: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    tabla_afectada: str = Field(max_length=60)
    tipo_operacion: str = Field(max_length=20)
    detalle: str = Field(max_length=500)
    id_usuario: Optional[UUID] = Field(default=None, foreign_key="USUARIO.id_usuario")
