from datetime import datetime
from typing import Any, Dict, List, Optional
from uuid import UUID
from pydantic import Field
from dtos.dto_common import BaseDTO


class NodoCreateDTO(BaseDTO):
    id_centro: Optional[UUID] = None
    tipo_nodo: str = Field(..., min_length=2, max_length=50)
    capacidad_nodo: float = Field(..., gt=0)


class NodoResponseDTO(BaseDTO):
    id_nodo: UUID
    id_centro: Optional[UUID] = None
    nombre_centro: Optional[str] = None
    codigo_centro: Optional[str] = None
    tipo_nodo: str
    capacidad_nodo: float


class AristaCreateDTO(BaseDTO):
    distancia_km: float = Field(..., gt=0)
    tiempo_estimado_min: int = Field(..., gt=0)
    id_nodo_origen: UUID
    id_nodo_destino: UUID


class AristaResponseDTO(BaseDTO):
    id_arista: UUID
    distancia_km: float
    tiempo_estimado_min: int
    id_nodo_origen: UUID
    nombre_origen: Optional[str] = None
    id_nodo_destino: UUID
    nombre_destino: Optional[str] = None


class EscenarioResponseDTO(BaseDTO):
    id_escenario: UUID
    codigo_escenario: str
    resultado: str


class IndicadorResponseDTO(BaseDTO):
    id_indicador: UUID
    nombre_indicador: str
    valor_meta: float
    valor_actual: float
    periodo: str
    id_escenario: UUID


class AlertaCreateDTO(BaseDTO):
    nivel_criticidad: str = Field(..., max_length=20)
    mensaje: str = Field(..., min_length=3, max_length=250)
    estado_alerta: str = Field(default="Activa", max_length=30)
    id_centro: UUID


class AlertaUpdateDTO(BaseDTO):
    estado_alerta: str = Field(..., max_length=30)
    nivel_criticidad: Optional[str] = Field(default=None, max_length=20)
    mensaje: Optional[str] = Field(default=None, max_length=250)


class AlertaResponseDTO(BaseDTO):
    id_alerta: UUID
    fecha_generacion: datetime
    nivel_criticidad: str
    mensaje: str
    estado_alerta: str
    id_centro: UUID
    nombre_centro: str = ""


class AuditoriaResponseDTO(BaseDTO):
    id_auditoria: UUID
    fecha_accion: datetime
    tabla_afectada: str
    tipo_operacion: str
    detalle: str
    id_usuario: Optional[UUID] = None
    nombre_usuario: str = "Sistema"


class MaxFlowRequestDTO(BaseDTO):
    id_nodo_origen: Optional[UUID] = None
    id_nodo_sumidero: Optional[UUID] = None
    factor_capacidad: float = Field(default=1.0, gt=0)
    guardar_escenario: bool = False
    codigo_escenario: Optional[str] = Field(default=None, max_length=30)


class FlujoAristaDTO(BaseDTO):
    id_arista: str
    id_nodo_origen: str
    nombre_origen: str
    id_nodo_destino: str
    nombre_destino: str
    distancia_km: float
    tiempo_estimado_min: int
    capacidad: float
    flujo: float
    holgura: float
    porcentaje_uso: float
    saturada: bool
    en_corte_minimo: bool


class CorteMinimoDTO(BaseDTO):
    conjunto_S: List[Dict[str, Any]]
    conjunto_T: List[Dict[str, Any]]
    aristas_criticas: List[FlujoAristaDTO]
    capacidad_corte: float


class RutaAumentanteDTO(BaseDTO):
    camino_nodos: List[str]
    camino_nombres: List[str]
    flujo_aportado: float


class MaxFlowResponseDTO(BaseDTO):
    nodo_origen: Optional[Dict[str, Any]] = None
    nodo_sumidero: Optional[Dict[str, Any]] = None
    factor_capacidad: float = 1.0
    flujo_maximo: float
    flujo_por_arista: List[FlujoAristaDTO]
    corte_minimo: CorteMinimoDTO
    rutas_aumentantes: List[RutaAumentanteDTO]
    escenario_guardado: Optional[EscenarioResponseDTO] = None


class ComparacionEscenarioDTO(BaseDTO):
    nombre: str
    factor: float
    flujo_maximo: float
    aristas_saturadas: int
    capacidad_corte_minimo: float


class GrafoResumenResponseDTO(BaseDTO):
    nodos: List[NodoResponseDTO]
    aristas: List[AristaResponseDTO]
    escenarios: List[EscenarioResponseDTO]
    indicadores: List[IndicadorResponseDTO]
    analisis_flujo_actual: MaxFlowResponseDTO
    comparacion_escenarios: List[ComparacionEscenarioDTO]
    reglas_discretas: List[Dict[str, Any]]


class DashboardKPIsDTO(BaseDTO):
    total_dispositivos: int
    dispositivos_evaluados: int
    dispositivos_pendientes_evaluar: int
    dispositivos_cerrados: int
    porcentaje_trazabilidad_cerrada: float
    total_solicitudes: int
    total_lotes: int
    stock_total_inventario: int
    alertas_activas: int


class CentroEstadoResumenDTO(BaseDTO):
    codigo_centro: str
    nombre_centro: str
    estado_actual: str
    cantidad_dispositivos: int


class CategoriaClasificacionResumenDTO(BaseDTO):
    nombre_categoria: str
    clasificacion_asignada: str
    total_dispositivos: int


class DispositivoPendienteDTO(BaseDTO):
    id_dispositivo: UUID
    num_serie: str
    nombre_objeto: str
    marca: str
    modelo: str
    nombre_categoria: str
    codigo_lote: str
    centro_recepcion: str


class DashboardResponseDTO(BaseDTO):
    kpis: DashboardKPIsDTO
    distribucion_clasificacion: Dict[str, int]
    consulta_2_centro_estado: List[CentroEstadoResumenDTO]
    consulta_3_categoria_clasificacion: List[CategoriaClasificacionResumenDTO]
    consulta_5_pendientes_evaluacion: List[DispositivoPendienteDTO]
    alertas: List[AlertaResponseDTO]
    auditoria: List[AuditoriaResponseDTO]
