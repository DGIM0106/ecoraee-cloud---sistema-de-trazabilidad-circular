from datetime import datetime, timezone
from typing import Optional
from uuid import UUID, uuid4
from sqlmodel import SQLModel, Field


class ModelSolicitud(SQLModel, table=True):
    __tablename__ = "SOLICITUD"

    id_solicitud: UUID = Field(default_factory=uuid4, primary_key=True)
    codigo_solicitud: str = Field(max_length=30, unique=True)
    fecha_solicitud: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    estado_recoleccion: str = Field(max_length=30)
    id_centro: UUID = Field(foreign_key="CENTRO.id_centro")


class ModelLote(SQLModel, table=True):
    __tablename__ = "LOTE"

    id_lote: UUID = Field(default_factory=uuid4, primary_key=True)
    codigo_lote: str = Field(max_length=30, unique=True)
    fecha_creacion: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    id_solicitud: UUID = Field(foreign_key="SOLICITUD.id_solicitud")


class ModelDispositivo(SQLModel, table=True):
    __tablename__ = "DISPOSITIVO"

    id_dispositivo: UUID = Field(default_factory=uuid4, primary_key=True)
    num_serie: str = Field(max_length=60, unique=True)
    id_objeto: UUID = Field(foreign_key="OBJETO.id_objeto")
    id_categoria: UUID = Field(foreign_key="CATEGORIA.id_categoria")
    id_lote: UUID = Field(foreign_key="LOTE.id_lote")
    fecha_registro: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ModelEvaluacionTecnica(SQLModel, table=True):
    __tablename__ = "EVALUACION_TECNICA"

    id_evaluacion: UUID = Field(default_factory=uuid4, primary_key=True)
    fecha_evaluacion: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    diagnostico: str = Field(max_length=250)
    clasificacion_tecnica: str = Field(max_length=40)
    id_dispositivo: UUID = Field(foreign_key="DISPOSITIVO.id_dispositivo", unique=True)
    id_condicion: UUID = Field(foreign_key="CONDICION.id_condicion")
    id_usuario_evaluador: UUID = Field(foreign_key="USUARIO.id_usuario")


class ModelHistorialEstados(SQLModel, table=True):
    __tablename__ = "HISTORIAL_ESTADOS"

    id_historial: UUID = Field(default_factory=uuid4, primary_key=True)
    id_dispositivo: UUID = Field(foreign_key="DISPOSITIVO.id_dispositivo")
    id_secuencia: int
    id_estado: UUID = Field(foreign_key="ESTADO_CATALOGO.id_estado")
    fecha_cambio: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    observacion: Optional[str] = Field(default=None, max_length=250)


class ModelTransferenciaMovimiento(SQLModel, table=True):
    __tablename__ = "TRANSFERENCIA_MOVIMIENTO"

    id_movimiento: UUID = Field(default_factory=uuid4, primary_key=True)
    fecha_movimiento: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    estado_transferencia: str = Field(max_length=30)
    id_centro_origen: UUID = Field(foreign_key="CENTRO.id_centro")
    id_centro_destino: UUID = Field(foreign_key="CENTRO.id_centro")
    id_dispositivo: UUID = Field(foreign_key="DISPOSITIVO.id_dispositivo")


class ModelTratamiento(SQLModel, table=True):
    __tablename__ = "TRATAMIENTO"

    id_tratamiento: UUID = Field(default_factory=uuid4, primary_key=True)
    resultado: str = Field(max_length=150)
    destino: str = Field(max_length=150)
    fecha_cierre: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    id_dispositivo: UUID = Field(foreign_key="DISPOSITIVO.id_dispositivo", unique=True)


class ModelEvidencia(SQLModel, table=True):
    __tablename__ = "EVIDENCIA"

    id_evidencia: UUID = Field(default_factory=uuid4, primary_key=True)
    nombre_archivo: str = Field(max_length=150)
    tipo_archivo: str = Field(max_length=30)
    url_archivo: str = Field(max_length=500)
    id_tratamiento: UUID = Field(foreign_key="TRATAMIENTO.id_tratamiento")


class ModelInventario(SQLModel, table=True):
    __tablename__ = "INVENTARIO"

    id_inventario: UUID = Field(default_factory=uuid4, primary_key=True)
    stock_actual: int = Field(default=0)
    fecha_actualizacion: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    id_centro: UUID = Field(foreign_key="CENTRO.id_centro")
    id_categoria: UUID = Field(foreign_key="CATEGORIA.id_categoria")
