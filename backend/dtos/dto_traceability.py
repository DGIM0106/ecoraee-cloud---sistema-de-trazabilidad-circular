from datetime import datetime
from typing import List, Optional
from uuid import UUID
from pydantic import Field
from dtos.dto_common import BaseDTO


class SolicitudCreateDTO(BaseDTO):
    codigo_solicitud: str = Field(..., min_length=2, max_length=30)
    estado_recoleccion: str = Field(default="Pendiente", max_length=30)
    id_centro: UUID
    id_usuario: Optional[UUID] = None


class SolicitudUpdateDTO(BaseDTO):
    estado_recoleccion: Optional[str] = Field(default=None, max_length=30)
    id_centro: Optional[UUID] = None
    id_usuario: Optional[UUID] = None


class LoteCreateDTO(BaseDTO):
    codigo_lote: str = Field(..., min_length=2, max_length=30)
    id_solicitud: UUID
    id_usuario: Optional[UUID] = None


class LoteResumenDTO(BaseDTO):
    id_lote: UUID
    codigo_lote: str
    fecha_creacion: datetime
    id_solicitud: UUID
    total_dispositivos: int = 0


class LoteResponseDTO(BaseDTO):
    id_lote: UUID
    codigo_lote: str
    fecha_creacion: datetime
    id_solicitud: UUID
    codigo_solicitud: str
    estado_recoleccion: str = ""
    id_centro: Optional[UUID] = None
    nombre_centro: str = ""
    total_dispositivos: int = 0


class SolicitudResponseDTO(BaseDTO):
    id_solicitud: UUID
    codigo_solicitud: str
    fecha_solicitud: datetime
    estado_recoleccion: str
    id_centro: UUID
    nombre_centro: str = ""
    codigo_centro: str = ""
    lotes: List[LoteResumenDTO] = Field(default_factory=list)
    total_lotes: int = 0
    total_dispositivos: int = 0


class DispositivoCreateDTO(BaseDTO):
    """
    Solo permite seleccionar id_objeto e id_categoria existentes en la base de datos.
    No permite ingresar libremente marca, modelo ni categoria.
    """

    num_serie: str = Field(..., min_length=2, max_length=60)
    id_objeto: UUID
    id_categoria: UUID
    id_lote: UUID
    observacion_inicial: Optional[str] = Field(
        default="Recepción inicial del equipo en centro", max_length=250
    )
    id_usuario: Optional[UUID] = None


class DispositivoUpdateDTO(BaseDTO):
    num_serie: Optional[str] = Field(default=None, min_length=2, max_length=60)
    id_objeto: Optional[UUID] = None
    id_categoria: Optional[UUID] = None
    id_lote: Optional[UUID] = None
    id_usuario: Optional[UUID] = None


class EvidenciaResponseDTO(BaseDTO):
    id_evidencia: UUID
    nombre_archivo: str
    tipo_archivo: str
    url_archivo: str
    id_tratamiento: UUID


class TratamientoResponseDTO(BaseDTO):
    id_tratamiento: UUID
    resultado: str
    destino: str
    fecha_cierre: datetime
    id_dispositivo: UUID
    evidencias: List[EvidenciaResponseDTO] = Field(default_factory=list)


class EvaluacionCreateDTO(BaseDTO):
    diagnostico: str = Field(..., min_length=3, max_length=250)
    clasificacion_tecnica: str = Field(..., max_length=40)
    id_dispositivo: UUID
    id_condicion: UUID
    id_usuario_evaluador: UUID


class EvaluacionUpdateDTO(BaseDTO):
    diagnostico: Optional[str] = Field(default=None, min_length=3, max_length=250)
    clasificacion_tecnica: Optional[str] = Field(default=None, max_length=40)
    id_condicion: Optional[UUID] = None
    id_usuario_evaluador: UUID


class EvaluacionResponseDTO(BaseDTO):
    id_evaluacion: UUID
    fecha_evaluacion: datetime
    diagnostico: str
    clasificacion_tecnica: str
    id_dispositivo: UUID
    id_condicion: UUID
    descripcion_condicion: str = ""
    id_usuario_evaluador: UUID
    nombre_evaluador: str = ""


class HistorialEstadoResponseDTO(BaseDTO):
    id_historial: UUID
    id_secuencia: int
    id_estado: UUID
    nombre_estado: str
    fecha_cambio: datetime
    observacion: str


class TransferenciaCreateDTO(BaseDTO):
    estado_transferencia: str = Field(default="En Transito", max_length=30)
    id_centro_origen: UUID
    id_centro_destino: UUID
    id_dispositivo: UUID
    id_usuario: Optional[UUID] = None


class TransferenciaUpdateDTO(BaseDTO):
    estado_transferencia: str = Field(..., max_length=30)
    id_usuario: Optional[UUID] = None


class TransferenciaResponseDTO(BaseDTO):
    id_movimiento: UUID
    fecha_movimiento: datetime
    estado_transferencia: str
    id_centro_origen: UUID
    nombre_centro_origen: str = ""
    codigo_centro_origen: str = ""
    id_centro_destino: UUID
    nombre_centro_destino: str = ""
    codigo_centro_destino: str = ""
    id_dispositivo: UUID
    num_serie: str = ""
    nombre_objeto: str = ""
    marca: str = ""
    modelo: str = ""


class DispositivoResponseDTO(BaseDTO):
    id_dispositivo: UUID
    num_serie: str
    id_objeto: UUID
    codigo_objeto: str = ""
    nombre_objeto: str
    marca: str
    modelo: str
    id_categoria: UUID
    nombre_categoria: str
    id_lote: UUID
    codigo_lote: str
    id_solicitud: Optional[UUID] = None
    codigo_solicitud: str = ""
    id_centro_actual: Optional[UUID] = None
    nombre_centro: str = ""
    codigo_centro: str = ""
    id_estado_actual: Optional[UUID] = None
    estado_actual: str
    fecha_registro: datetime
    fecha_ultimo_estado: Optional[datetime] = None
    total_eventos_historial: int = 0
    evaluacion: Optional[EvaluacionResponseDTO] = None
    tratamiento: Optional[TratamientoResponseDTO] = None


class DispositivoDetalleResponseDTO(BaseDTO):
    id_dispositivo: UUID
    num_serie: str
    id_objeto: UUID
    codigo_objeto: str = ""
    nombre_objeto: str
    marca: str
    modelo: str
    id_categoria: UUID
    nombre_categoria: str
    id_lote: UUID
    codigo_lote: str
    codigo_solicitud: str = ""
    id_centro_recepcion: Optional[UUID] = None
    nombre_centro_recepcion: str = ""
    fecha_registro: datetime
    historial_estados: List[HistorialEstadoResponseDTO] = Field(default_factory=list)
    evaluacion_tecnica: Optional[EvaluacionResponseDTO] = None
    transferencias: List[TransferenciaResponseDTO] = Field(default_factory=list)
    tratamiento: Optional[TratamientoResponseDTO] = None
