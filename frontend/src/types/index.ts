/**
 * EcoRAEE Cloud - Modelos de Datos y Tipos TypeScript
 * Definiciones para Trazabilidad RAEE, Red Logística y Actores
 */

export interface User {
  id_usuario: number;
  nombre: string;
  correo: string;
  id_rol: number;
  nombre_rol?: string;
  id_organizacion?: number;
  razon_social?: string;
  ruc?: string;
  telefono?: string;
  activo?: boolean;
}

export interface Rol {
  id_rol: number;
  nombre_rol: string;
  descripcion?: string;
}

export interface Organizacion {
  id_organizacion: number;
  ruc: string;
  razon_social: string;
  direccion?: string;
  telefono?: string;
}

export interface Centro {
  id_centro: number;
  codigo_centro: string;
  nombre_centro: string;
  id_tipo_centro: number;
  tipo_centro?: string;
  capacidad_max_ton: number;
  direccion?: string;
  ciudad?: string;
  activo?: boolean;
}

export interface Categoria {
  id_categoria: number;
  nombre_categoria: string;
  codigo_categoria?: string;
  descripcion?: string;
}

export interface Condicion {
  id_condicion: number;
  descripcion_condicion: string;
}

export interface EstadoCatalogo {
  id_estado: number;
  nombre_estado: string;
}

export interface CatalogosResumen {
  centros: Centro[];
  categorias: Categoria[];
  condiciones: Condicion[];
  estados: EstadoCatalogo[];
  roles?: Rol[];
  organizaciones?: Organizacion[];
}

export interface EvaluacionResumen {
  id_evaluacion: number;
  fecha_evaluacion: string;
  diagnostico: string;
  clasificacion_tecnica: string;
  id_condicion: number;
  nombre_condicion?: string;
  id_tecnico?: number;
  evaluador?: string;
}

export interface Dispositivo {
  id_dispositivo: number;
  num_serie: string;
  marca: string;
  modelo: string;
  id_categoria: number;
  nombre_categoria: string;
  id_lote: number;
  codigo_lote: string;
  id_centro_actual: number;
  nombre_centro: string;
  estado_actual: string;
  id_estado_actual?: number;
  fecha_registro: string;
  evaluacion: EvaluacionResumen | null;
  tiene_tratamiento?: boolean;
  peso_kg?: number;
}

export interface DispositivoDetalle {
  id_dispositivo: number;
  num_serie: string;
  marca: string;
  modelo: string;
  id_categoria: number;
  id_lote: number;
  codigo_lote: string;
  codigo_solicitud?: string;
  nombre_categoria: string;
  nombre_centro_recepcion: string;
  id_centro_recepcion?: number;
  historial_estados: {
    id_secuencia: number;
    id_estado: number;
    nombre_estado: string;
    fecha_cambio: string;
    observacion: string;
  }[];
  evaluacion: EvaluacionResumen | null;
  transferencias: {
    num_movimiento: number;
    centro_origen: string;
    centro_destino: string;
    fecha_movimiento: string;
    estado: string;
  }[];
  tratamiento?: {
    id_tratamiento: number;
    fecha_tratamiento: string;
    resultado: string;
    destino: string;
    evidencias: {
      id_evidencia: number;
      nombre_archivo: string;
      tipo_archivo: string;
      url_archivo: string;
      fecha_subida?: string;
    }[];
  } | null;
}

export interface Solicitud {
  id_solicitud: number;
  codigo_solicitud: string;
  fecha_solicitud: string;
  estado_solicitud: string;
  id_centro: number;
  nombre_centro?: string;
  total_lotes?: number;
}

export interface Lote {
  id_lote: number;
  codigo_lote: string;
  id_solicitud: number;
  codigo_solicitud?: string;
  fecha_creacion: string;
  total_dispositivos?: number;
}

export interface InventarioItem {
  id_inventario: number;
  id_centro: number;
  nombre_centro: string;
  id_categoria: number;
  nombre_categoria: string;
  stock_disponible: number;
  fecha_actualizacion: string;
}

export interface Transferencia {
  num_movimiento: number;
  id_dispositivo: number;
  num_serie: string;
  marca: string;
  modelo: string;
  id_origen: number;
  centro_origen: string;
  id_destino: number;
  centro_destino: string;
  fecha_movimiento: string;
  estado: string;
}

export interface Nodo {
  id_nodo: number;
  id_centro: number;
  nombre_centro: string;
  codigo_centro: string;
  tipo_nodo: string;
  capacidad_procesamiento_ton: number;
  activo?: boolean;
}

export interface Arista {
  id_arista: number;
  id_nodo_origen: number;
  id_nodo_destino: number;
  origen_nombre: string;
  destino_nombre: string;
  distancia_km: number;
  capacidad_flujo_ton: number;
  tiempo_estimado_min: number;
  activa?: boolean;
}

export interface Alerta {
  id_alerta: number;
  fecha_generacion: string;
  nivel_criticidad: string;
  mensaje: string;
  estado_alerta: string;
  id_centro?: number;
  nombre_centro?: string;
  id_dispositivo?: number;
}

export interface Escenario {
  id_escenario: number;
  codigo_escenario: string;
  descripcion: string;
  flujo_maximo_obtenido: number;
  capacidad_corte_minimo: number;
  fecha_simulacion: string;
}

export interface AuditoriaItem {
  id_auditoria: number;
  fecha_accion: string;
  modulo: string;
  accion: string;
  detalle: string;
  usuario: string;
}

export interface DashboardData {
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
    id_dispositivo: number;
    num_serie: string;
    marca: string;
    modelo: string;
    nombre_categoria: string;
    codigo_lote: string;
    centro_recepcion: string;
  }[];
  alertas: Alerta[];
  auditoria: AuditoriaItem[];
}
