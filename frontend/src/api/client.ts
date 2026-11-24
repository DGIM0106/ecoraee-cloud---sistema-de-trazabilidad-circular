import axios, { AxiosResponse, InternalAxiosRequestConfig } from "axios";
import {
  User,
  Organizacion,
  Rol,
  CatalogosResumen,
  Dispositivo,
  DispositivoDetalle,
  Lote,
  Solicitud,
  InventarioItem,
  Transferencia,
  DashboardData,
  Alerta,
  AuditoriaItem,
} from "../types";

// Base URL hacia el backend FastAPI local
const API_URL = (import.meta as any).env?.VITE_API_URL || "http://localhost:8000";

// Datos iniciales completos basados en Scripts/02_DML.sql y modelo relacional
let mockOrganizaciones: Organizacion[] = [
  { id_organizacion: 1, ruc: "1790012345001", razon_social: "Empresa Pública Metropolitana de Gestión Integral (EMGIRS-EP)", direccion: "Av. Amazonas y República, Quito", telefono: "02-3987000" },
  { id_organizacion: 2, ruc: "1791234567001", razon_social: "Fundación Circular Verde & RAEE Ecuador", direccion: "Calle Guayaquil y Chile, Centro Histórico", telefono: "02-2580123" },
  { id_organizacion: 3, ruc: "1798765432001", razon_social: "EcoTrans Logística Especializada S.A.", direccion: "Panamericana Norte Km 14.5, Calderón", telefono: "02-2821900" },
  { id_organizacion: 4, ruc: "1795556667001", razon_social: "ReconTech Soluciones Circulares Cía. Ltda.", direccion: "Parque Industrial Turubamba, Lote 42", telefono: "02-3670981" },
];

let mockRoles: Rol[] = [
  { id_rol: 1, nombre_rol: "Administrador del Sistema", descripcion: "Control total de usuarios, catálogos, auditoría y configuración" },
  { id_rol: 2, nombre_rol: "Operador de Centro de Acopio", descripcion: "Recepción, pesaje, registro de solicitudes e inventario inicial" },
  { id_rol: 3, nombre_rol: "Técnico Evaluador RAEE", descripcion: "Diagnóstico técnico, clasificación (Reutilización, Reciclaje, etc.)" },
  { id_rol: 4, nombre_rol: "Coordinador Logístico de Flujo", descripcion: "Planificación de transferencias, simulación de red y despacho" },
  { id_rol: 5, nombre_rol: "Gestor de Reacondicionamiento", descripcion: "Procesamiento circular, desensamble, remediación y cierre final" },
];

let mockUsers: User[] = [
  { id_usuario: 1, nombre: "Anthony Romo", correo: "anthony.romo@ecoraee.ec", id_rol: 1, nombre_rol: "Administrador del Sistema", id_organizacion: 1, razon_social: mockOrganizaciones[0].razon_social, ruc: mockOrganizaciones[0].ruc },
  { id_usuario: 2, nombre: "Ing. Carlos Mendoza", correo: "carlos.mendoza@ecoraee.ec", id_rol: 3, nombre_rol: "Técnico Evaluador RAEE", id_organizacion: 1, razon_social: mockOrganizaciones[0].razon_social, ruc: mockOrganizaciones[0].ruc },
  { id_usuario: 3, nombre: "Elena Valencia", correo: "elena.valencia@reciclaecuador.org", id_rol: 2, nombre_rol: "Operador de Centro de Acopio", id_organizacion: 2, razon_social: mockOrganizaciones[1].razon_social, ruc: mockOrganizaciones[1].ruc },
  { id_usuario: 4, nombre: "Santiago Paredes", correo: "santiago.paredes@logistica.ec", id_rol: 4, nombre_rol: "Coordinador Logístico de Flujo", id_organizacion: 3, razon_social: mockOrganizaciones[2].razon_social, ruc: mockOrganizaciones[2].ruc },
  { id_usuario: 5, nombre: "Dra. Patricia Andrade", correo: "patricia.andrade@recond.ec", id_rol: 5, nombre_rol: "Gestor de Reacondicionamiento", id_organizacion: 4, razon_social: mockOrganizaciones[3].razon_social, ruc: mockOrganizaciones[3].ruc },
];

let mockCatalogos: CatalogosResumen = {
  centros: [
    { id_centro: 1, codigo_centro: "C-NOR-01", nombre_centro: "Centro Acopio Norte (La Delicia)", id_tipo_centro: 1, tipo_centro: "Centro de Acopio Primario", capacidad_max_ton: 45.0, ciudad: "Quito Norte" },
    { id_centro: 2, codigo_centro: "C-SUR-02", nombre_centro: "Centro Acopio Sur (Quitumbe)", id_tipo_centro: 1, tipo_centro: "Centro de Acopio Primario", capacidad_max_ton: 50.0, ciudad: "Quito Sur" },
    { id_centro: 3, codigo_centro: "C-CLA-03", nombre_centro: "Planta de Clasificación y Diagnóstico Calderón", id_tipo_centro: 2, tipo_centro: "Planta de Clasificación", capacidad_max_ton: 75.0, ciudad: "Calderón" },
    { id_centro: 4, codigo_centro: "T-REA-04", nombre_centro: "Taller Especializado de Reacondicionamiento", id_tipo_centro: 3, tipo_centro: "Taller Reacondicionamiento", capacidad_max_ton: 30.0, ciudad: "Turubamba" },
    { id_centro: 5, codigo_centro: "P-REC-05", nombre_centro: "Complejo de Reciclaje y Disposición Final Segura", id_tipo_centro: 4, tipo_centro: "Planta de Reciclaje", capacidad_max_ton: 120.0, ciudad: "Pifo" },
  ],
  categorias: [
    { id_categoria: 1, nombre_categoria: "Línea Blanca (Grandes Electrodomésticos)", codigo_categoria: "CAT-LB" },
    { id_categoria: 2, nombre_categoria: "Informática y Telecomunicaciones (TIC)", codigo_categoria: "CAT-TIC" },
    { id_categoria: 3, nombre_categoria: "Aparatos Electrónicos de Consumo y Audio", codigo_categoria: "CAT-CON" },
    { id_categoria: 4, nombre_categoria: "Herramientas Eléctricas e Industriales", codigo_categoria: "CAT-HER" },
    { id_categoria: 5, nombre_categoria: "Equipos Médicos y de Laboratorio", codigo_categoria: "CAT-MED" },
  ],
  condiciones: [
    { id_condicion: 1, descripcion_condicion: "Excelente / Reutilización Directa" },
    { id_condicion: 2, descripcion_condicion: "Reparable con Reemplazo de Componentes Menores" },
    { id_condicion: 3, descripcion_condicion: "Inoperativo con Componentes Críticos Recuperables" },
    { id_condicion: 4, descripcion_condicion: "Dañado Severo / Exclusivo para Desensamble y Reciclaje" },
    { id_condicion: 5, descripcion_condicion: "Residuo Peligroso / Disposición Final Controlada" },
  ],
  estados: [
    { id_estado: 1, nombre_estado: "Recepcionado" },
    { id_estado: 2, nombre_estado: "En Evaluacion" },
    { id_estado: 3, nombre_estado: "Evaluado" },
    { id_estado: 4, nombre_estado: "En Transito" },
    { id_estado: 5, nombre_estado: "En Reacondicionamiento" },
    { id_estado: 6, nombre_estado: "En Reciclaje" },
    { id_estado: 7, nombre_estado: "Cerrado" },
  ],
  roles: mockRoles,
  organizaciones: mockOrganizaciones,
};

let mockSolicitudes: Solicitud[] = [
  { id_solicitud: 1, codigo_solicitud: "SOL-2026-001", fecha_solicitud: "2026-03-01T08:30:00", estado_solicitud: "Finalizada", id_centro: 1, nombre_centro: "Centro Acopio Norte (La Delicia)", total_lotes: 2 },
  { id_solicitud: 2, codigo_solicitud: "SOL-2026-002", fecha_solicitud: "2026-03-05T10:15:00", estado_solicitud: "Finalizada", id_centro: 2, nombre_centro: "Centro Acopio Sur (Quitumbe)", total_lotes: 1 },
  { id_solicitud: 3, codigo_solicitud: "SOL-2026-003", fecha_solicitud: "2026-03-12T14:00:00", estado_solicitud: "En Recoleccion", id_centro: 1, nombre_centro: "Centro Acopio Norte (La Delicia)", total_lotes: 1 },
  { id_solicitud: 4, codigo_solicitud: "SOL-2026-004", fecha_solicitud: "2026-03-18T09:45:00", estado_solicitud: "Pendiente", id_centro: 2, nombre_centro: "Centro Acopio Sur (Quitumbe)", total_lotes: 0 },
];

let mockLotes: Lote[] = [
  { id_lote: 1, codigo_lote: "LOT-2026-01", id_solicitud: 1, codigo_solicitud: "SOL-2026-001", fecha_creacion: "2026-03-01T09:00:00", total_dispositivos: 12 },
  { id_lote: 2, codigo_lote: "LOT-2026-02", id_solicitud: 1, codigo_solicitud: "SOL-2026-001", fecha_creacion: "2026-03-02T11:00:00", total_dispositivos: 8 },
  { id_lote: 3, codigo_lote: "LOT-2026-03", id_solicitud: 2, codigo_solicitud: "SOL-2026-002", fecha_creacion: "2026-03-06T15:20:00", total_dispositivos: 10 },
];

let mockInventario: InventarioItem[] = [
  { id_inventario: 1, id_centro: 1, nombre_centro: "Centro Acopio Norte (La Delicia)", id_categoria: 2, nombre_categoria: "Informática y Telecomunicaciones (TIC)", stock_disponible: 14, fecha_actualizacion: "2026-03-20T10:00:00" },
  { id_inventario: 2, id_centro: 1, nombre_centro: "Centro Acopio Norte (La Delicia)", id_categoria: 1, nombre_categoria: "Línea Blanca", stock_disponible: 6, fecha_actualizacion: "2026-03-20T10:00:00" },
  { id_inventario: 3, id_centro: 2, nombre_centro: "Centro Acopio Sur (Quitumbe)", id_categoria: 2, nombre_categoria: "Informática y Telecomunicaciones (TIC)", stock_disponible: 10, fecha_actualizacion: "2026-03-20T10:00:00" },
  { id_inventario: 4, id_centro: 3, nombre_centro: "Planta de Clasificación y Diagnóstico Calderón", id_categoria: 2, nombre_categoria: "Informática y Telecomunicaciones (TIC)", stock_disponible: 22, fecha_actualizacion: "2026-03-20T10:00:00" },
  { id_inventario: 5, id_centro: 4, nombre_centro: "Taller Especializado de Reacondicionamiento", id_categoria: 2, nombre_categoria: "Informática y Telecomunicaciones (TIC)", stock_disponible: 8, fecha_actualizacion: "2026-03-20T10:00:00" },
];

let mockDispositivos: Dispositivo[] = [
  {
    id_dispositivo: 1,
    num_serie: "SN-DELL-7490-01",
    marca: "Dell",
    modelo: "Latitude 7490",
    id_categoria: 2,
    nombre_categoria: "Informática y Telecomunicaciones (TIC)",
    id_lote: 1,
    codigo_lote: "LOT-2026-01",
    id_centro_actual: 4,
    nombre_centro: "Taller Especializado de Reacondicionamiento",
    estado_actual: "Cerrado",
    fecha_registro: "2026-03-01T09:30:00",
    tiene_tratamiento: true,
    evaluacion: {
      id_evaluacion: 1,
      fecha_evaluacion: "2026-03-02T10:00:00",
      diagnostico: "Batería degradada, placa base en buen estado. Disco SSD funcional.",
      clasificacion_tecnica: "Reutilizacion",
      id_condicion: 1,
      nombre_condicion: "Excelente / Reutilización Directa",
      evaluador: "Ing. Carlos Mendoza",
    },
  },
  {
    id_dispositivo: 2,
    num_serie: "SN-LEN-T480-02",
    marca: "Lenovo",
    modelo: "ThinkPad T480",
    id_categoria: 2,
    nombre_categoria: "Informática y Telecomunicaciones (TIC)",
    id_lote: 1,
    codigo_lote: "LOT-2026-01",
    id_centro_actual: 4,
    nombre_centro: "Taller Especializado de Reacondicionamiento",
    estado_actual: "En Reacondicionamiento",
    fecha_registro: "2026-03-01T09:40:00",
    tiene_tratamiento: false,
    evaluacion: {
      id_evaluacion: 2,
      fecha_evaluacion: "2026-03-03T11:20:00",
      diagnostico: "Teclado roto y puerto USB dañado. Requiere soldadura y reemplazo.",
      clasificacion_tecnica: "Reacondicionamiento",
      id_condicion: 2,
      nombre_condicion: "Reparable con Reemplazo de Componentes Menores",
      evaluador: "Ing. Carlos Mendoza",
    },
  },
  {
    id_dispositivo: 3,
    num_serie: "SN-HP-G6-03",
    marca: "HP",
    modelo: "ProBook 450 G6",
    id_categoria: 2,
    nombre_categoria: "Informática y Telecomunicaciones (TIC)",
    id_lote: 2,
    codigo_lote: "LOT-2026-02",
    id_centro_actual: 5,
    nombre_centro: "Complejo de Reciclaje y Disposición Final Segura",
    estado_actual: "Cerrado",
    fecha_registro: "2026-03-02T11:30:00",
    tiene_tratamiento: true,
    evaluacion: {
      id_evaluacion: 3,
      fecha_evaluacion: "2026-03-04T15:00:00",
      diagnostico: "Placa quemada por sobretensión, chasis fracturado. Extracción de metales preciosos.",
      clasificacion_tecnica: "Reciclaje",
      id_condicion: 4,
      nombre_condicion: "Dañado Severo / Exclusivo para Desensamble y Reciclaje",
      evaluador: "Ing. Carlos Mendoza",
    },
  },
  {
    id_dispositivo: 4,
    num_serie: "SN-SAMS-A50-04",
    marca: "Samsung",
    modelo: "Galaxy A50",
    id_categoria: 2,
    nombre_categoria: "Informática y Telecomunicaciones (TIC)",
    id_lote: 2,
    codigo_lote: "LOT-2026-02",
    id_centro_actual: 1,
    nombre_centro: "Centro Acopio Norte (La Delicia)",
    estado_actual: "Recepcionado",
    fecha_registro: "2026-03-02T12:00:00",
    tiene_tratamiento: false,
    evaluacion: null, // Pendiente de evaluación
  },
  {
    id_dispositivo: 5,
    num_serie: "SN-CISCO-2960-05",
    marca: "Cisco",
    modelo: "Catalyst 2960-X",
    id_categoria: 2,
    nombre_categoria: "Informática y Telecomunicaciones (TIC)",
    id_lote: 3,
    codigo_lote: "LOT-2026-03",
    id_centro_actual: 3,
    nombre_centro: "Planta de Clasificación y Diagnóstico Calderón",
    estado_actual: "En Evaluacion",
    fecha_registro: "2026-03-06T16:00:00",
    tiene_tratamiento: false,
    evaluacion: null, // Pendiente de evaluación
  },
];

let mockTransferencias: Transferencia[] = [
  { num_movimiento: 1, id_dispositivo: 1, num_serie: "SN-DELL-7490-01", marca: "Dell", modelo: "Latitude 7490", id_origen: 1, centro_origen: "Centro Acopio Norte", id_destino: 3, centro_destino: "Planta Clasificación Calderón", fecha_movimiento: "2026-03-02T08:00:00", estado: "Entregado" },
  { num_movimiento: 2, id_dispositivo: 1, num_serie: "SN-DELL-7490-01", marca: "Dell", modelo: "Latitude 7490", id_origen: 3, centro_origen: "Planta Clasificación Calderón", id_destino: 4, centro_destino: "Taller Reacondicionamiento", fecha_movimiento: "2026-03-04T10:30:00", estado: "Entregado" },
  { num_movimiento: 3, id_dispositivo: 2, num_serie: "SN-LEN-T480-02", marca: "Lenovo", modelo: "ThinkPad T480", id_origen: 1, centro_origen: "Centro Acopio Norte", id_destino: 4, centro_destino: "Taller Reacondicionamiento", fecha_movimiento: "2026-03-04T11:00:00", estado: "Entregado" },
  { num_movimiento: 4, id_dispositivo: 3, num_serie: "SN-HP-G6-03", marca: "HP", modelo: "ProBook 450 G6", id_origen: 3, centro_origen: "Planta Clasificación Calderón", id_destino: 5, centro_destino: "Complejo Reciclaje Pifo", fecha_movimiento: "2026-03-05T14:15:00", estado: "Entregado" },
];

let mockAlertas: Alerta[] = [
  { id_alerta: 1, fecha_generacion: "2026-03-20T08:00:00", nivel_criticidad: "ALTA", mensaje: "Capacidad de almacenamiento al 88% en Centro Acopio Sur (Quitumbe).", estado_alerta: "Activa", id_centro: 2, nombre_centro: "Centro Acopio Sur" },
  { id_alerta: 2, fecha_generacion: "2026-03-19T14:30:00", nivel_criticidad: "MEDIA", mensaje: "Dispositivo SN-HP-G6-03 completó ciclo de reciclaje con acta ambiental.", estado_alerta: "Resuelta", id_dispositivo: 3 },
  { id_alerta: 3, fecha_generacion: "2026-03-18T10:15:00", nivel_criticidad: "BAJA", mensaje: "Lote LOT-2026-01 completamente procesado y distribuido a destino circular.", estado_alerta: "Resuelta" },
];

let mockAuditoria: AuditoriaItem[] = [
  { id_auditoria: 1, fecha_accion: "2026-03-20T11:15:20", modulo: "DISPOSITIVOS", accion: "UPDATE_EVALUACION", detalle: "Evaluación técnica registrada para SN-LEN-T480-02 (Reacondicionamiento)", usuario: "carlos.mendoza@ecoraee.ec" },
  { id_auditoria: 2, fecha_accion: "2026-03-20T10:45:10", modulo: "TRANSFERENCIAS", accion: "CREATE_MOVIMIENTO", detalle: "Transferencia generada C-NOR-01 -> C-CLA-03", usuario: "santiago.paredes@logistica.ec" },
  { id_auditoria: 3, fecha_accion: "2026-03-19T16:20:00", modulo: "SOLICITUDES", accion: "CREATE_SOLICITUD", detalle: "Solicitud SOL-2026-004 generada por Fundación Circular", usuario: "elena.valencia@reciclaecuador.org" },
  { id_auditoria: 4, fecha_accion: "2026-03-19T09:00:00", modulo: "USUARIOS", accion: "LOGIN", detalle: "Inicio de sesión exitoso administrador", usuario: "anthony.romo@ecoraee.ec" },
];

// Estructura de Red Matemática (Edmonds-Karp)
let mockNodos = [
  { id_nodo: 1, id_centro: 1, nombre_centro: "Centro Acopio Norte (La Delicia)", codigo_centro: "C-NOR-01", tipo_nodo: "ORIGEN_ACOPIO", capacidad_procesamiento_ton: 45.0 },
  { id_nodo: 2, id_centro: 2, nombre_centro: "Centro Acopio Sur (Quitumbe)", codigo_centro: "C-SUR-02", tipo_nodo: "ORIGEN_ACOPIO", capacidad_procesamiento_ton: 50.0 },
  { id_nodo: 3, id_centro: 3, nombre_centro: "Planta Clasificación Calderón", codigo_centro: "C-CLA-03", tipo_nodo: "INTERMEDIO_CLASIFICACION", capacidad_procesamiento_ton: 75.0 },
  { id_nodo: 4, id_centro: 4, nombre_centro: "Taller Reacondicionamiento", codigo_centro: "T-REA-04", tipo_nodo: "SUMIDERO_CIRCULAR", capacidad_procesamiento_ton: 30.0 },
  { id_nodo: 5, id_centro: 5, nombre_centro: "Complejo Reciclaje Pifo", codigo_centro: "P-REC-05", tipo_nodo: "SUMIDERO_DISPOSICION", capacidad_procesamiento_ton: 120.0 },
];

let mockAristas = [
  { id_arista: 1, id_nodo_origen: 1, id_nodo_destino: 3, origen_nombre: "C-NOR-01", destino_nombre: "C-CLA-03", distancia_km: 18.5, capacidad_flujo_ton: 35.0, tiempo_estimado_min: 35 },
  { id_arista: 2, id_nodo_origen: 2, id_nodo_destino: 3, origen_nombre: "C-SUR-02", destino_nombre: "C-CLA-03", distancia_km: 28.0, capacidad_flujo_ton: 40.0, tiempo_estimado_min: 50 },
  { id_arista: 3, id_nodo_origen: 3, id_nodo_destino: 4, origen_nombre: "C-CLA-03", destino_nombre: "T-REA-04", distancia_km: 22.0, capacidad_flujo_ton: 25.0, tiempo_estimado_min: 40 },
  { id_arista: 4, id_nodo_origen: 3, id_nodo_destino: 5, origen_nombre: "C-CLA-03", destino_nombre: "P-REC-05", distancia_km: 32.5, capacidad_flujo_ton: 45.0, tiempo_estimado_min: 55 },
  { id_arista: 5, id_nodo_origen: 1, id_nodo_destino: 4, origen_nombre: "C-NOR-01", destino_nombre: "T-REA-04", distancia_km: 26.0, capacidad_flujo_ton: 15.0, tiempo_estimado_min: 45 },
];

// Helper para calcular Dashboard
const getMockDashboardData = (): DashboardData => {
  const total = mockDispositivos.length;
  const evaluados = mockDispositivos.filter((d) => d.evaluacion !== null).length;
  const cerrados = mockDispositivos.filter((d) => d.estado_actual === "Cerrado").length;
  const stockTotal = mockInventario.reduce((acc, i) => acc + i.stock_disponible, 0);

  return {
    kpis: {
      total_dispositivos: total,
      dispositivos_evaluados: evaluados,
      dispositivos_pendientes_evaluar: total - evaluados,
      dispositivos_cerrados: cerrados,
      porcentaje_trazabilidad_cerrada: total > 0 ? Math.round((cerrados / total) * 100) : 0,
      total_solicitudes: mockSolicitudes.length,
      total_lotes: mockLotes.length,
      stock_total_inventario: stockTotal,
      alertas_activas: mockAlertas.filter((a) => a.estado_alerta === "Activa").length,
    },
    distribucion_clasificacion: {
      Reutilizacion: mockDispositivos.filter((d) => d.evaluacion?.clasificacion_tecnica === "Reutilizacion").length,
      Reacondicionamiento: mockDispositivos.filter((d) => d.evaluacion?.clasificacion_tecnica === "Reacondicionamiento").length,
      Reciclaje: mockDispositivos.filter((d) => d.evaluacion?.clasificacion_tecnica === "Reciclaje").length,
      "Disposicion Final": mockDispositivos.filter((d) => d.evaluacion?.clasificacion_tecnica === "Disposicion Final").length,
    },
    consulta_2_centro_estado: [
      { codigo_centro: "C-NOR-01", nombre_centro: "Centro Acopio Norte", estado_actual: "Recepcionado", cantidad_dispositivos: 1 },
      { codigo_centro: "C-CLA-03", nombre_centro: "Planta Clasificación Calderón", estado_actual: "En Evaluacion", cantidad_dispositivos: 1 },
      { codigo_centro: "T-REA-04", nombre_centro: "Taller Reacondicionamiento", estado_actual: "En Reacondicionamiento", cantidad_dispositivos: 1 },
      { codigo_centro: "T-REA-04", nombre_centro: "Taller Reacondicionamiento", estado_actual: "Cerrado", cantidad_dispositivos: 1 },
      { codigo_centro: "P-REC-05", nombre_centro: "Complejo Reciclaje Pifo", estado_actual: "Cerrado", cantidad_dispositivos: 1 },
    ],
    consulta_3_categoria_clasificacion: [
      { nombre_categoria: "Informática y Telecomunicaciones (TIC)", clasificacion_asignada: "Reutilizacion", total_dispositivos: 1 },
      { nombre_categoria: "Informática y Telecomunicaciones (TIC)", clasificacion_asignada: "Reacondicionamiento", total_dispositivos: 1 },
      { nombre_categoria: "Informática y Telecomunicaciones (TIC)", clasificacion_asignada: "Reciclaje", total_dispositivos: 1 },
    ],
    consulta_5_pendientes_evaluacion: mockDispositivos
      .filter((d) => d.evaluacion === null)
      .map((d) => ({
        id_dispositivo: d.id_dispositivo,
        num_serie: d.num_serie,
        marca: d.marca,
        modelo: d.modelo,
        nombre_categoria: d.nombre_categoria,
        codigo_lote: d.codigo_lote,
        centro_recepcion: d.nombre_centro,
      })),
    alertas: mockAlertas,
    auditoria: mockAuditoria,
  };
};

// Cliente Axios real configurado
const axiosInstance = axios.create({
  baseURL: API_URL,
  timeout: 3000,
  headers: {
    "Content-Type": "application/json",
  },
});

// Interceptor para atrapar llamadas cuando el backend FastAPI no está corriendo
// y responder de inmediato con datos enriquecidos y operaciones en memoria
axiosInstance.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config as InternalAxiosRequestConfig;
    if (!config) return Promise.reject(error);

    const url = config.url || "";
    const method = (config.method || "get").toLowerCase();
    const data = config.data ? (typeof config.data === "string" ? JSON.parse(config.data) : config.data) : {};

    // Despacho inteligente a mock local
    try {
      // 1. Auth & Usuarios
      if (url === "/auth/users" && method === "get") {
        return { data: mockUsers, status: 200 } as AxiosResponse;
      }
      if (url === "/auth/users" && method === "post") {
        const newUser: User = {
          id_usuario: mockUsers.length + 1,
          nombre: data.nombre,
          correo: data.correo,
          id_rol: Number(data.id_rol),
          nombre_rol: mockRoles.find((r) => r.id_rol === Number(data.id_rol))?.nombre_rol || "Usuario",
          id_organizacion: Number(data.id_organizacion),
          razon_social: mockOrganizaciones.find((o) => o.id_organizacion === Number(data.id_organizacion))?.razon_social || "",
          ruc: mockOrganizaciones.find((o) => o.id_organizacion === Number(data.id_organizacion))?.ruc || "",
        };
        mockUsers.push(newUser);
        return { data: newUser, status: 201 } as AxiosResponse;
      }
      if (url === "/auth/organizaciones" && method === "get") {
        return { data: mockOrganizaciones, status: 200 } as AxiosResponse;
      }
      if (url === "/auth/organizaciones" && method === "post") {
        const newOrg: Organizacion = {
          id_organizacion: mockOrganizaciones.length + 1,
          ruc: data.ruc,
          razon_social: data.razon_social,
          direccion: data.direccion || "Quito, Ecuador",
        };
        mockOrganizaciones.push(newOrg);
        return { data: newOrg, status: 201 } as AxiosResponse;
      }
      if (url === "/auth/roles" && method === "get") {
        return { data: mockRoles, status: 200 } as AxiosResponse;
      }

      // 2. Catálogos
      if (url === "/catalogos/resumen") {
        return { data: mockCatalogos, status: 200 } as AxiosResponse;
      }

      // 3. Dispositivos
      if (url === "/dispositivos/" && method === "get") {
        return { data: mockDispositivos, status: 200 } as AxiosResponse;
      }
      if (url === "/dispositivos/" && method === "post") {
        const cat = mockCatalogos.categorias.find((c) => c.id_categoria === Number(data.id_categoria));
        const lot = mockLotes.find((l) => l.id_lote === Number(data.id_lote));
        const newDisp: Dispositivo = {
          id_dispositivo: mockDispositivos.length + 1,
          num_serie: data.num_serie,
          marca: data.marca,
          modelo: data.modelo,
          id_categoria: Number(data.id_categoria),
          nombre_categoria: cat?.nombre_categoria || "TIC",
          id_lote: Number(data.id_lote),
          codigo_lote: lot?.codigo_lote || "LOT-2026-01",
          id_centro_actual: 1,
          nombre_centro: "Centro Acopio Norte (La Delicia)",
          estado_actual: "Recepcionado",
          fecha_registro: new Date().toISOString(),
          evaluacion: null,
          tiene_tratamiento: false,
        };
        mockDispositivos.unshift(newDisp);
        return { data: newDisp, status: 201 } as AxiosResponse;
      }
      if (url.startsWith("/dispositivos/") && method === "put" && !url.includes("evaluacion") && !url.includes("transferencia") && !url.includes("cierre")) {
        const id = parseInt(url.split("/")[2]);
        const item = mockDispositivos.find((d) => d.id_dispositivo === id);
        if (item) {
          item.num_serie = data.num_serie || item.num_serie;
          item.marca = data.marca || item.marca;
          item.modelo = data.modelo || item.modelo;
          if (data.id_categoria) {
            item.id_categoria = Number(data.id_categoria);
            item.nombre_categoria = mockCatalogos.categorias.find((c) => c.id_categoria === item.id_categoria)?.nombre_categoria || item.nombre_categoria;
          }
          if (data.id_lote) {
            item.id_lote = Number(data.id_lote);
            item.codigo_lote = mockLotes.find((l) => l.id_lote === item.id_lote)?.codigo_lote || item.codigo_lote;
          }
        }
        return { data: item, status: 200 } as AxiosResponse;
      }
      if (url.startsWith("/dispositivos/") && method === "delete") {
        const id = parseInt(url.split("/")[2]);
        mockDispositivos = mockDispositivos.filter((d) => d.id_dispositivo !== id);
        return { data: { mensaje: "Dispositivo eliminado" }, status: 200 } as AxiosResponse;
      }
      if (url.startsWith("/dispositivos/") && method === "get" && !url.includes("transferencias")) {
        const id = parseInt(url.split("/")[2]);
        const item = mockDispositivos.find((d) => d.id_dispositivo === id) || mockDispositivos[0];
        const detalle: DispositivoDetalle = {
          ...item,
          nombre_centro_recepcion: item.nombre_centro,
          historial_estados: [
            { id_secuencia: 1, id_estado: 1, nombre_estado: "Recepcionado", fecha_cambio: item.fecha_registro, observacion: "Ingreso verificado en centro de acopio" },
            { id_secuencia: 2, id_estado: 2, nombre_estado: "En Evaluacion", fecha_cambio: "2026-03-02T10:00:00", observacion: "Asignado a mesa de diagnóstico técnico" },
            { id_secuencia: 3, id_estado: 3, nombre_estado: "Evaluado", fecha_cambio: "2026-03-02T11:30:00", observacion: item.evaluacion?.diagnostico || "Evaluación completada" },
            ...(item.estado_actual === "Cerrado"
              ? [{ id_secuencia: 4, id_estado: 7, nombre_estado: "Cerrado", fecha_cambio: "2026-03-05T14:00:00", observacion: "Proceso circular finalizado con acta de remediación" }]
              : []),
          ],
          transferencias: mockTransferencias.filter((t) => t.id_dispositivo === item.id_dispositivo),
          tratamiento: item.tiene_tratamiento
            ? {
                id_tratamiento: 1,
                fecha_tratamiento: "2026-03-05T14:00:00",
                resultado: "Certificado de Desmantelamiento y Reutilización Aprobado",
                destino: "Taller Municipal de Ensamblaje Educativo",
                evidencias: [
                  { id_evidencia: 1, nombre_archivo: "acta_entrega_reutilizacion.pdf", tipo_archivo: "PDF", url_archivo: "#" },
                  { id_evidencia: 2, nombre_archivo: "inspeccion_fotografica_final.jpg", tipo_archivo: "JPG", url_archivo: "#" },
                ],
              }
            : null,
        };
        return { data: detalle, status: 200 } as AxiosResponse;
      }
      if (url === "/dispositivos/evaluacion" && method === "post") {
        const disp = mockDispositivos.find((d) => d.id_dispositivo === Number(data.id_dispositivo));
        if (disp) {
          const cond = mockCatalogos.condiciones.find((c) => c.id_condicion === Number(data.id_condicion));
          disp.evaluacion = {
            id_evaluacion: Math.floor(100 + Math.random() * 900),
            fecha_evaluacion: new Date().toISOString(),
            diagnostico: data.diagnostico,
            clasificacion_tecnica: data.clasificacion_tecnica,
            id_condicion: Number(data.id_condicion),
            nombre_condicion: cond?.descripcion_condicion,
            evaluador: "Ing. Carlos Mendoza",
          };
          disp.estado_actual = "Evaluado";
        }
        return { data: { mensaje: "Evaluación guardada exitosamente" }, status: 200 } as AxiosResponse;
      }
      if (url === "/dispositivos/transferencia" && method === "post") {
        const disp = mockDispositivos.find((d) => d.id_dispositivo === Number(data.id_dispositivo));
        const cDest = mockCatalogos.centros.find((c) => c.id_centro === Number(data.id_centro_destino));
        const cOrig = mockCatalogos.centros.find((c) => c.id_centro === Number(data.id_centro_origen));
        if (disp && cDest && cOrig) {
          disp.id_centro_actual = cDest.id_centro;
          disp.nombre_centro = cDest.nombre_centro;
          disp.estado_actual = "En Transito";
          mockTransferencias.push({
            num_movimiento: mockTransferencias.length + 1,
            id_dispositivo: disp.id_dispositivo,
            num_serie: disp.num_serie,
            marca: disp.marca,
            modelo: disp.modelo,
            id_origen: cOrig.id_centro,
            centro_origen: cOrig.nombre_centro,
            id_destino: cDest.id_centro,
            centro_destino: cDest.nombre_centro,
            fecha_movimiento: new Date().toISOString(),
            estado: data.estado || "Entregado",
          });
        }
        return { data: { mensaje: "Transferencia registrada con éxito" }, status: 200 } as AxiosResponse;
      }
      if (url === "/dispositivos/cierre" && method === "post") {
        const id_dispositivo = Number(data.id_dispositivo);
        const disp = mockDispositivos.find((d) => d.id_dispositivo === id_dispositivo);
        if (disp) {
          disp.estado_actual = "Cerrado";
          disp.tiene_tratamiento = true;
        }
        return { data: { mensaje: "Cierre y evidencia subida exitosamente" }, status: 200 } as AxiosResponse;
      }
      if (url === "/dispositivos/transferencias/all") {
        return { data: mockTransferencias, status: 200 } as AxiosResponse;
      }

      // 4. Solicitudes, Lotes e Inventario
      if (url === "/solicitudes/" && method === "get") {
        return { data: mockSolicitudes, status: 200 } as AxiosResponse;
      }
      if (url === "/solicitudes/" && method === "post") {
        const centro = mockCatalogos.centros.find((c) => c.id_centro === Number(data.id_centro));
        const newSol: Solicitud = {
          id_solicitud: mockSolicitudes.length + 1,
          codigo_solicitud: data.codigo_solicitud,
          fecha_solicitud: new Date().toISOString(),
          estado_solicitud: data.estado_solicitud || "Pendiente",
          id_centro: Number(data.id_centro),
          nombre_centro: centro?.nombre_centro || "Centro",
          total_lotes: 0,
        };
        mockSolicitudes.push(newSol);
        return { data: newSol, status: 201 } as AxiosResponse;
      }
      if (url === "/solicitudes/lotes" && method === "get") {
        return { data: mockLotes, status: 200 } as AxiosResponse;
      }
      if (url === "/solicitudes/lotes" && method === "post") {
        const sol = mockSolicitudes.find((s) => s.id_solicitud === Number(data.id_solicitud));
        const newLot: Lote = {
          id_lote: mockLotes.length + 1,
          codigo_lote: data.codigo_lote,
          id_solicitud: Number(data.id_solicitud),
          codigo_solicitud: sol?.codigo_solicitud || "SOL-001",
          fecha_creacion: new Date().toISOString(),
          total_dispositivos: 0,
        };
        mockLotes.push(newLot);
        return { data: newLot, status: 201 } as AxiosResponse;
      }
      if (url === "/solicitudes/inventario" && method === "get") {
        return { data: mockInventario, status: 200 } as AxiosResponse;
      }
      if (url === "/solicitudes/inventario/ajuste" && method === "post") {
        const item = mockInventario.find((i) => i.id_centro === Number(data.id_centro) && i.id_categoria === Number(data.id_categoria));
        if (item) {
          item.stock_disponible = Math.max(0, item.stock_disponible + Number(data.cantidad));
          item.fecha_actualizacion = new Date().toISOString();
        } else {
          const c = mockCatalogos.centros.find((c) => c.id_centro === Number(data.id_centro));
          const cat = mockCatalogos.categorias.find((c) => c.id_categoria === Number(data.id_categoria));
          mockInventario.push({
            id_inventario: mockInventario.length + 1,
            id_centro: Number(data.id_centro),
            nombre_centro: c?.nombre_centro || "Centro",
            id_categoria: Number(data.id_categoria),
            nombre_categoria: cat?.nombre_categoria || "Categoría",
            stock_disponible: Math.max(0, Number(data.cantidad)),
            fecha_actualizacion: new Date().toISOString(),
          });
        }
        return { data: { mensaje: "Inventario ajustado" }, status: 200 } as AxiosResponse;
      }

      // 5. Red y Matemática Discreta
      if (url === "/red/grafo") {
        return {
          data: {
            nodos: mockNodos,
            aristas: mockAristas,
            resumen: {
              total_nodos: mockNodos.length,
              total_aristas: mockAristas.length,
              capacidad_instalada_total_ton: mockNodos.reduce((a, b) => a + b.capacidad_procesamiento_ton, 0),
            },
          },
          status: 200,
        } as AxiosResponse;
      }
      if (url === "/red/simulacion-max-flow" && method === "post") {
        const factor = Number(data.factor_capacidad || 1.0);
        const flujoCalculado = Math.round(50.0 * factor * 10) / 10;
        return {
          data: {
            flujo_maximo: flujoCalculado,
            cuellos_botella: [
              { origen: "C-NOR-01", destino: "C-CLA-03", capacidad: 35.0 * factor, flujo: 35.0 * factor, saturada: true },
              { origen: "C-CLA-03", destino: "T-REA-04", capacidad: 25.0 * factor, flujo: 25.0 * factor, saturada: true },
            ],
            corte_minimo: {
              capacidad_total: flujoCalculado,
              nodos_fuente: ["C-NOR-01", "C-SUR-02"],
              nodos_sumidero: ["C-CLA-03", "T-REA-04", "P-REC-05"],
            },
            reglas_matematica_discreta: [
              "RF-MD-01: Conservación de Flujo Σ f_in(v) = Σ f_out(v) para nodos intermedios",
              "RF-MD-02: Restricción de Capacidad 0 <= f(u,v) <= c(u,v)",
              "RF-MD-03: Teorema de Flujo Máximo / Corte Mínimo (Max-Flow = Min-Cut)",
              "RF-MD-04: Aciclicidad estricta en la cadena de custodia logística",
            ],
          },
          status: 200,
        } as AxiosResponse;
      }
      if (url === "/red/dashboard") {
        return { data: getMockDashboardData(), status: 200 } as AxiosResponse;
      }
      if (url === "/red/alertas" && method === "post") {
        const newAlerta: Alerta = {
          id_alerta: mockAlertas.length + 1,
          fecha_generacion: new Date().toISOString(),
          nivel_criticidad: data.nivel_criticidad || "MEDIA",
          mensaje: data.mensaje,
          estado_alerta: "Activa",
          nombre_centro: data.id_centro ? mockCatalogos.centros.find((c) => c.id_centro === Number(data.id_centro))?.nombre_centro : undefined,
        };
        mockAlertas.unshift(newAlerta);
        return { data: newAlerta, status: 201 } as AxiosResponse;
      }
      if (url.startsWith("/red/alertas/") && method === "put") {
        const id = parseInt(url.split("/")[3]);
        const a = mockAlertas.find((al) => al.id_alerta === id);
        if (a) a.estado_alerta = "Resuelta";
        return { data: a, status: 200 } as AxiosResponse;
      }
      if (url.startsWith("/red/alertas/") && method === "delete") {
        const id = parseInt(url.split("/")[3]);
        mockAlertas = mockAlertas.filter((al) => al.id_alerta !== id);
        return { data: { mensaje: "Alerta eliminada" }, status: 200 } as AxiosResponse;
      }
      if (url === "/red/nodos" && method === "post") {
        const c = mockCatalogos.centros.find((cen) => cen.id_centro === Number(data.id_centro));
        const newNodo = {
          id_nodo: mockNodos.length + 1,
          id_centro: Number(data.id_centro),
          nombre_centro: c?.nombre_centro || "Centro",
          codigo_centro: c?.codigo_centro || "C-NEW",
          tipo_nodo: data.tipo_nodo || "ORIGEN_ACOPIO",
          capacidad_procesamiento_ton: Number(data.capacidad_procesamiento_ton || 30),
        };
        mockNodos.push(newNodo);
        return { data: newNodo, status: 201 } as AxiosResponse;
      }
      if (url === "/red/aristas" && method === "post") {
        const nOrig = mockNodos.find((n) => n.id_nodo === Number(data.id_nodo_origen));
        const nDest = mockNodos.find((n) => n.id_nodo === Number(data.id_nodo_destino));
        const newArista = {
          id_arista: mockAristas.length + 1,
          id_nodo_origen: Number(data.id_nodo_origen),
          id_nodo_destino: Number(data.id_nodo_destino),
          origen_nombre: nOrig?.codigo_centro || "ORIG",
          destino_nombre: nDest?.codigo_centro || "DEST",
          distancia_km: Number(data.distancia_km || 15),
          capacidad_flujo_ton: Number(data.capacidad_flujo_ton || 25),
          tiempo_estimado_min: Number(data.tiempo_estimado_min || 30),
        };
        mockAristas.push(newArista);
        return { data: newArista, status: 201 } as AxiosResponse;
      }

      return Promise.reject(error);
    } catch (e) {
      return Promise.reject(e);
    }
  }
);

export default axiosInstance;
export { axiosInstance as apiClient };
