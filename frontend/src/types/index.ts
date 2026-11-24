/**
 * EcoRAEE Cloud - DTOs y Tipos TypeScript (UUID + Contratos estrictos con FastAPI)
 */

export type UUID = string;

export interface UserDTO {
  id_usuario: UUID;
  nombre: string;
  correo: string;
  id_rol: UUID;
  nombre_rol: string;
  id_organizacion: UUID;
  razon_social: string;
  ruc: string;
}

export interface RolDTO {
  id_rol: UUID;
  nombre_rol: string;
  descripcion?: string | null;
}

export interface OrganizacionDTO {
  id_organizacion: UUID;
  ruc: string;
  razon_social: string;
  direccion?: string | null;
  telefono?: string | null;
}

export interface TipoCentroDTO {
  id_tipo_centro: UUID;
  nombre_tipo: string;
}

export interface CentroDTO {
  id_centro: UUID;
  codigo_centro: string;
  nombre_centro: string;
  direccion: string;
  ciudad?: string | null;
  capacidad_max_ton: number;
  id_tipo_centro: UUID;
  nombre_tipo_centro: string;
}

export interface CategoriaDTO {
  id_categoria: UUID;
  codigo_categoria: string;
  nombre_categoria: string;
  descripcion?: string | null;
  total_objetos: number;
}

export interface CategoriaCreateDTO {
  codigo_categoria: string;
  nombre_categoria: string;
  descripcion?: string | null;
}

export interface ObjetoDTO {
  id_objeto: UUID;
  codigo_objeto: string;
  nombre_objeto: string;
  marca: string;
  modelo: string;
  descripcion?: string | null;
  peso_estimado_kg?: number | null;
  id_categoria: UUID;
  nombre_categoria: string;
  codigo_categoria: string;
}

export interface ObjetoCreateDTO {
  codigo_objeto: string;
  nombre_objeto: string;
  marca: string;
  modelo: string;
  descripcion?: string | null;
  peso_estimado_kg?: number | null;
  id_categoria: UUID;
}

export interface CondicionDTO {
  id_condicion: UUID;
  descripcion_condicion: string;
}

export interface EstadoCatalogoDTO {
  id_estado: UUID;
  orden: number;
  nombre_estado: string;
}

export interface CatalogosResumenDTO {
  tipos_centro: TipoCentroDTO[];
  centros: CentroDTO[];
  categorias: CategoriaDTO[];
  objetos: ObjetoDTO[];
  condiciones: CondicionDTO[];
  estados_catalogo: EstadoCatalogoDTO[];
  organizaciones: OrganizacionDTO[];
  roles: RolDTO[];
}

export interface EvaluacionDTO {
  id_evaluacion: UUID;
  fecha_evaluacion: string;
  diagnostico: string;
  clasificacion_tecnica: string;
  id_dispositivo: UUID;
  id_condicion: UUID;
  descripcion_condicion: string;
  id_usuario_evaluador: UUID;
  nombre_evaluador: string;
}

export interface EvidenciaDTO {
  id_evidencia: UUID;
  nombre_archivo: string;
  tipo_archivo: string;
  url_archivo: string;
  id_tratamiento: UUID;
}

export interface TratamientoDTO {
  id_tratamiento: UUID;
  resultado: string;
  destino: string;
  fecha_cierre: string;
  id_dispositivo: UUID;
  evidencias: EvidenciaDTO[];
}

export interface DispositivoDTO {
  id_dispositivo: UUID;
  num_serie: string;
  id_objeto: UUID;
  codigo_objeto: string;
  nombre_objeto: string;
  marca: string;
  modelo: string;
  id_categoria: UUID;
  nombre_categoria: string;
  id_lote: UUID;
  codigo_lote: string;
  id_solicitud?: UUID | null;
  codigo_solicitud: string;
  id_centro_actual?: UUID | null;
  nombre_centro: string;
  codigo_centro: string;
  id_estado_actual?: UUID | null;
  estado_actual: string;
  fecha_registro: string;
  fecha_ultimo_estado?: string | null;
  total_eventos_historial: number;
  evaluacion: EvaluacionDTO | null;
  tratamiento: TratamientoDTO | null;
}

export interface DispositivoCreateDTO {
  num_serie: string;
  id_objeto: UUID;
  id_categoria: UUID;
  id_lote: UUID;
  observacion_inicial?: string;
  id_usuario?: UUID;
}

export interface DispositivoUpdateDTO {
  num_serie?: string;
  id_objeto?: UUID;
  id_categoria?: UUID;
  id_lote?: UUID;
  id_usuario?: UUID;
}

export interface HistorialEstadoDTO {
  id_historial: UUID;
  id_secuencia: number;
  id_estado: UUID;
  nombre_estado: string;
  fecha_cambio: string;
  observacion: string;
}

export interface TransferenciaDTO {
  id_movimiento: UUID;
  fecha_movimiento: string;
  estado_transferencia: string;
  id_centro_origen: UUID;
  nombre_centro_origen: string;
  codigo_centro_origen: string;
  id_centro_destino: UUID;
  nombre_centro_destino: string;
  codigo_centro_destino: string;
  id_dispositivo: UUID;
  num_serie: string;
  nombre_objeto: string;
  marca: string;
  modelo: string;
}

export interface DispositivoDetalleDTO {
  id_dispositivo: UUID;
  num_serie: string;
  id_objeto: UUID;
  codigo_objeto: string;
  nombre_objeto: string;
  marca: string;
  modelo: string;
  id_categoria: UUID;
  nombre_categoria: string;
  id_lote: UUID;
  codigo_lote: string;
  codigo_solicitud: string;
  id_centro_recepcion?: UUID | null;
  nombre_centro_recepcion: string;
  fecha_registro: string;
  historial_estados: HistorialEstadoDTO[];
  evaluacion_tecnica: EvaluacionDTO | null;
  transferencias: TransferenciaDTO[];
  tratamiento: TratamientoDTO | null;
}

export interface LoteResumenDTO {
  id_lote: UUID;
  codigo_lote: string;
  fecha_creacion: string;
  id_solicitud: UUID;
  total_dispositivos: number;
}

export interface SolicitudDTO {
  id_solicitud: UUID;
  codigo_solicitud: string;
  fecha_solicitud: string;
  estado_recoleccion: string;
  id_centro: UUID;
  nombre_centro: string;
  codigo_centro: string;
  lotes: LoteResumenDTO[];
  total_lotes: number;
  total_dispositivos: number;
}

export interface LoteDTO {
  id_lote: UUID;
  codigo_lote: string;
  fecha_creacion: string;
  id_solicitud: UUID;
  codigo_solicitud: string;
  estado_recoleccion: string;
  id_centro?: UUID | null;
  nombre_centro: string;
  total_dispositivos: number;
}

export interface InventarioDTO {
  id_inventario: UUID;
  stock_actual: number;
  fecha_actualizacion: string;
  id_centro: UUID;
  codigo_centro: string;
  nombre_centro: string;
  id_categoria: UUID;
  nombre_categoria: string;
}

export interface NodoDTO {
  id_nodo: UUID;
  id_centro?: UUID | null;
  nombre_centro?: string | null;
  codigo_centro?: string | null;
  tipo_nodo: string;
  capacidad_nodo: number;
}

export interface AristaDTO {
  id_arista: UUID;
  distancia_km: number;
  tiempo_estimado_min: number;
  id_nodo_origen: UUID;
  nombre_origen?: string | null;
  id_nodo_destino: UUID;
  nombre_destino?: string | null;
}

export interface FlujoAristaDTO {
  id_arista: string;
  id_nodo_origen: string;
  nombre_origen: string;
  id_nodo_destino: string;
  nombre_destino: string;
  distancia_km: number;
  tiempo_estimado_min: number;
  capacidad: number;
  flujo: number;
  holgura: number;
  porcentaje_uso: number;
  saturada: boolean;
  en_corte_minimo: boolean;
}

export interface MaxFlowResponseDTO {
  nodo_origen: Record<string, any> | null;
  nodo_sumidero: Record<string, any> | null;
  factor_capacidad: number;
  flujo_maximo: number;
  flujo_por_arista: FlujoAristaDTO[];
  corte_minimo: {
    conjunto_S: Record<string, any>[];
    conjunto_T: Record<string, any>[];
    aristas_criticas: FlujoAristaDTO[];
    capacidad_corte: number;
  };
  rutas_aumentantes: {
    camino_nodos: string[];
    camino_nombres: string[];
    flujo_aportado: number;
  }[];
  escenario_guardado?: {
    id_escenario: UUID;
    codigo_escenario: string;
    resultado: string;
  } | null;
}

export interface GrafoResumenDTO {
  nodos: NodoDTO[];
  aristas: AristaDTO[];
  escenarios: {
    id_escenario: UUID;
    codigo_escenario: string;
    resultado: string;
  }[];
  indicadores: {
    id_indicador: UUID;
    nombre_indicador: string;
    valor_meta: number;
    valor_actual: number;
    periodo: string;
    id_escenario: UUID;
  }[];
  analisis_flujo_actual: MaxFlowResponseDTO;
  comparacion_escenarios: {
    nombre: string;
    factor: number;
    flujo_maximo: number;
    aristas_saturadas: number;
    capacidad_corte_minimo: number;
  }[];
  reglas_discretas: {
    codigo: string;
    titulo: string;
    proposiciones: Record<string, string>;
    formula: string;
    implementacion_sql_api: string;
  }[];
}

export interface AlertaDTO {
  id_alerta: UUID;
  fecha_generacion: string;
  nivel_criticidad: string;
  mensaje: string;
  estado_alerta: string;
  id_centro: UUID;
  nombre_centro: string;
}

export interface AuditoriaDTO {
  id_auditoria: UUID;
  fecha_accion: string;
  tabla_afectada: string;
  tipo_operacion: string;
  detalle: string;
  id_usuario?: UUID | null;
  nombre_usuario: string;
}

export interface DashboardDTO {
  kpis: {
    total_dispositivos: number;
    dispositivos_evaluados: number;
    dispositivos_pendientes_evaluar: number;
    dispositivos_cerrados: number;
    porcentaje_trazabilidad_cerrada: number;
    total_solicitudes: number;
    total_lotes: number;
    stock_total_inventario: number;
    alertas_activas: number;
  };
  distribucion_clasificacion: Record<string, number>;
  consulta_2_centro_estado: {
    codigo_centro: string;
    nombre_centro: string;
    estado_actual: string;
    cantidad_dispositivos: number;
  }[];
  consulta_3_categoria_clasificacion: {
    nombre_categoria: string;
    clasificacion_asignada: string;
    total_dispositivos: number;
  }[];
  consulta_5_pendientes_evaluacion: {
    id_dispositivo: UUID;
    num_serie: string;
    nombre_objeto: string;
    marca: string;
    modelo: string;
    nombre_categoria: string;
    codigo_lote: string;
    centro_recepcion: string;
  }[];
  alertas: AlertaDTO[];
  auditoria: AuditoriaDTO[];
}

// Alias de compatibilidad
export type User = UserDTO;
export type Rol = RolDTO;
export type Organizacion = OrganizacionDTO;
export type Centro = CentroDTO;
export type Categoria = CategoriaDTO;
export type Objeto = ObjetoDTO;
export type Condicion = CondicionDTO;
export type EstadoCatalogo = EstadoCatalogoDTO;
export type CatalogosResumen = CatalogosResumenDTO;
export type EvaluacionResumen = EvaluacionDTO;
export type Dispositivo = DispositivoDTO;
export type DispositivoDetalle = DispositivoDetalleDTO;
export type Solicitud = SolicitudDTO;
export type Lote = LoteDTO;
export type InventarioItem = InventarioDTO;
export type Transferencia = TransferenciaDTO;
export type Nodo = NodoDTO;
export type Arista = AristaDTO;
export type Alerta = AlertaDTO;
export type AuditoriaItem = AuditoriaDTO;
export type DashboardData = DashboardDTO;
