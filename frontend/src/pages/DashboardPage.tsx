import React, { useEffect, useState, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Cpu,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Boxes,
  Database,
  Bell,
  Plus,
  Check,
  ArrowRight,
  Activity,
  Layers,
  FileSpreadsheet,
} from "lucide-react";
import apiClient from "../api/client";
import { Centro, DashboardData } from "../types";
import Button from "../components/atoms/Button";
import Input from "../components/atoms/Input";

const DashboardPage: React.FC = () => {
  const [data, setData] = useState<DashboardData | null>(null);
  const [centros, setCentros] = useState<Centro[]>([]);
  const [loading, setLoading] = useState(true);

  // Nueva alerta rápida
  const [mostrarModalAlerta, setMostrarModalAlerta] = useState(false);
  const [mensajeAlerta, setMensajeAlerta] = useState("");
  const [nivelCriticidad, setNivelCriticidad] = useState("MEDIA");
  const [idCentroAlerta, setIdCentroAlerta] = useState<number>(1);

  const cargarDashboard = useCallback(async () => {
    try {
      setLoading(true);
      const [dashRes, catRes] = await Promise.all([
        apiClient.get<DashboardData>("/red/dashboard"),
        apiClient.get("/catalogos/resumen"),
      ]);
      setData(dashRes.data);
      setCentros(catRes.data.centros || []);
    } catch (err) {
      console.error("Error al cargar el dashboard:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarDashboard();
  }, [cargarDashboard]);

  const handleResolverAlerta = async (id_alerta: number) => {
    try {
      await apiClient.put(`/red/alertas/${id_alerta}`, { estado_alerta: "Resuelta" });
      await cargarDashboard();
    } catch (err) {
      console.error(err);
    }
  };

  const handleCrearAlerta = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!mensajeAlerta.trim()) return;
    try {
      await apiClient.post("/red/alertas", {
        mensaje: mensajeAlerta,
        nivel_criticidad: nivelCriticidad,
        id_centro: idCentroAlerta,
      });
      setMensajeAlerta("");
      setMostrarModalAlerta(false);
      await cargarDashboard();
    } catch (err) {
      console.error(err);
    }
  };

  if (loading && !data) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center p-6 space-y-4">
        <div className="w-12 h-12 rounded-2xl border-4 border-[#274C3D] border-t-transparent animate-spin" />
        <p className="text-sm font-semibold text-[#274C3D]">
          Cargando métricas y consultas analíticas de EcoRAEE...
        </p>
      </div>
    );
  }

  const kpis = data?.kpis || {
    total_dispositivos: 0,
    dispositivos_evaluados: 0,
    dispositivos_pendientes_evaluar: 0,
    dispositivos_cerrados: 0,
    porcentaje_trazabilidad_cerrada: 0,
    total_solicitudes: 0,
    total_lotes: 0,
    stock_total_inventario: 0,
    alertas_activas: 0,
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Banner de Bienvenida y Estado */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#D6E3DC] shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-[#EBF2EE] text-[#274C3D] text-xs font-bold uppercase tracking-wider mb-2 border border-[#C5D8CF]">
            <Activity className="w-3.5 h-3.5 text-[#274C3D]" />
            EcoRAEE Cloud · Panel de Control & Consultas SQL
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#1F2925] tracking-tight">
            Trazabilidad Integral de Residuos RAEE
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-2xl">
            Integración de la base de datos relacional (23 tablas), API REST modular en FastAPI y aplicación React bajo los lineamientos de economía circular.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setMostrarModalAlerta(true)}
            className="flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Nueva Alerta Operativa
          </Button>
          <Link to="/dispositivos">
            <Button variant="primary" size="sm" className="flex items-center gap-1.5">
              <span>Gestionar RAEE</span>
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>

      {/* Grid de 4 KPIs Clave */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {/* KPI 1 */}
        <div className="bg-white rounded-3xl p-6 border border-[#D6E3DC] shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#527063]">
              Total RAEE en Sistema
            </span>
            <div className="w-10 h-10 rounded-2xl bg-[#EBF2EE] text-[#274C3D] flex items-center justify-center">
              <Cpu className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black text-[#1F2925]">
              {kpis.total_dispositivos}
            </div>
            <p className="text-xs text-slate-500 mt-1 flex items-center gap-1">
              <span className="font-bold text-[#274C3D]">
                {kpis.porcentaje_trazabilidad_cerrada}%
              </span>{" "}
              con ciclo circular cerrado
            </p>
          </div>
          <div className="w-full bg-[#EBF2EE] h-2 rounded-full overflow-hidden">
            <div
              className="bg-[#274C3D] h-full rounded-full transition-all duration-500"
              style={{ width: `${Math.min(100, kpis.porcentaje_trazabilidad_cerrada)}%` }}
            />
          </div>
        </div>

        {/* KPI 2 */}
        <div className="bg-white rounded-3xl p-6 border border-[#D6E3DC] shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#527063]">
              Evaluados Técnicamente
            </span>
            <div className="w-10 h-10 rounded-2xl bg-[#EBF2EE] text-[#274C3D] flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black text-[#1F2925]">
              {kpis.dispositivos_evaluados}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              {kpis.dispositivos_pendientes_evaluar} aún pendientes en mesas de diagnóstico
            </p>
          </div>
          <div className="w-full bg-[#EBF2EE] h-2 rounded-full overflow-hidden">
            <div
              className="bg-emerald-600 h-full rounded-full transition-all duration-500"
              style={{
                width: `${
                  kpis.total_dispositivos > 0
                    ? Math.round((kpis.dispositivos_evaluados / kpis.total_dispositivos) * 100)
                    : 0
                }%`,
              }}
            />
          </div>
        </div>

        {/* KPI 3 */}
        <div className="bg-white rounded-3xl p-6 border border-[#D6E3DC] shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#527063]">
              Stock en Almacén
            </span>
            <div className="w-10 h-10 rounded-2xl bg-[#EBF2EE] text-[#274C3D] flex items-center justify-center">
              <Boxes className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black text-[#1F2925]">
              {kpis.stock_total_inventario}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Unidades en centros de acopio y clasificación
            </p>
          </div>
          <div className="flex items-center gap-2 text-[11px] font-semibold text-[#527063]">
            <span>{kpis.total_solicitudes} Solicitudes</span> ·{" "}
            <span>{kpis.total_lotes} Lotes</span>
          </div>
        </div>

        {/* KPI 4 */}
        <div className="bg-white rounded-3xl p-6 border border-[#D6E3DC] shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-[#527063]">
              Alertas del Sistema
            </span>
            <div className="w-10 h-10 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center">
              <AlertTriangle className="w-5 h-5" />
            </div>
          </div>
          <div>
            <div className="text-3xl font-black text-[#1F2925]">
              {kpis.alertas_activas}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Capacidad y logística que requieren atención
            </p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-amber-700 font-bold">
            <Bell className="w-3.5 h-3.5" />
            <span>Monitoreo continuo activo</span>
          </div>
        </div>
      </div>

      {/* Distribución por Clasificación Circular */}
      <div className="bg-white rounded-3xl p-6 border border-[#D6E3DC] shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-5 h-5 text-[#274C3D]" />
            <h2 className="text-base font-bold text-[#1F2925]">
              Distribución por Estrategia de Economía Circular
            </h2>
          </div>
          <span className="text-xs text-slate-500">
            Regla de Jerarquía: Reutilización &gt; Reacondicionamiento &gt; Reciclaje &gt; Disposición
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {Object.entries(data?.distribucion_clasificacion || {}).map(([clave, cant]) => (
            <div
              key={clave}
              className="p-4 rounded-2xl bg-[#F8FAF9] border border-[#D6E3DC] space-y-1"
            >
              <span className="text-xs font-bold uppercase text-[#527063] block truncate">
                {clave}
              </span>
              <div className="text-2xl font-black text-[#274C3D]">{cant}</div>
              <p className="text-[11px] text-slate-500">
                {kpis.total_dispositivos > 0
                  ? `${Math.round((cant / kpis.total_dispositivos) * 100)}% del total registrado`
                  : "0%"}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Consultas Analíticas Oficiales de SQL Server (04_consultas.sql) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Consulta 2: Dispositivos por Centro y Estado */}
        <div className="bg-white rounded-3xl p-6 border border-[#D6E3DC] shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#274C3D] bg-[#EBF2EE] px-2.5 py-0.5 rounded-lg border border-[#C5D8CF]">
                Consulta #2 de 04_consultas.sql
              </span>
              <h3 className="text-base font-bold text-[#1F2925] mt-1">
                Dispositivos por Centro y Estado Actual
              </h3>
            </div>
            <Database className="w-5 h-5 text-slate-400" />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-[#F2F7F4] text-[#274C3D] uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-2.5 px-3 rounded-l-xl">Centro</th>
                  <th className="py-2.5 px-3">Estado</th>
                  <th className="py-2.5 px-3 text-right rounded-r-xl">Equipos</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EBF2EE]">
                {data?.consulta_2_centro_estado?.map((r, i) => (
                  <tr key={i} className="hover:bg-[#F9FCFA]">
                    <td className="py-2.5 px-3 font-semibold text-[#1F2925]">
                      {r.nombre_centro} ({r.codigo_centro})
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded-lg bg-[#EBF2EE] text-[#274C3D] font-bold text-[10px]">
                        {r.estado_actual}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-black text-[#274C3D]">
                      {r.cantidad_dispositivos}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Consulta 3: Categoría vs Clasificación Asignada */}
        <div className="bg-white rounded-3xl p-6 border border-[#D6E3DC] shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#274C3D] bg-[#EBF2EE] px-2.5 py-0.5 rounded-lg border border-[#C5D8CF]">
                Consulta #3 de 04_consultas.sql
              </span>
              <h3 className="text-base font-bold text-[#1F2925] mt-1">
                Categoría vs Clasificación Técnica
              </h3>
            </div>
            <FileSpreadsheet className="w-5 h-5 text-slate-400" />
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-[#F2F7F4] text-[#274C3D] uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-2.5 px-3 rounded-l-xl">Categoría</th>
                  <th className="py-2.5 px-3">Clasificación</th>
                  <th className="py-2.5 px-3 text-right rounded-r-xl">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EBF2EE]">
                {data?.consulta_3_categoria_clasificacion?.map((r, i) => (
                  <tr key={i} className="hover:bg-[#F9FCFA]">
                    <td className="py-2.5 px-3 font-semibold text-[#1F2925]">
                      {r.nombre_categoria}
                    </td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded-lg bg-[#EBF2EE] text-[#274C3D] font-bold text-[10px]">
                        {r.clasificacion_asignada}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right font-black text-[#274C3D]">
                      {r.total_dispositivos}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Consulta 5: Dispositivos Pendientes de Evaluación */}
      <div className="bg-white rounded-3xl p-6 border border-[#D6E3DC] shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800 bg-amber-50 px-2.5 py-0.5 rounded-lg border border-amber-200">
              Consulta #5 de 04_consultas.sql · Acción Requerida
            </span>
            <h3 className="text-base font-bold text-[#1F2925] mt-1">
              Dispositivos Pendientes de Evaluación Técnica
            </h3>
          </div>
          <Link to="/dispositivos">
            <span className="text-xs font-bold text-[#274C3D] hover:underline flex items-center gap-1">
              Ver todos en Trazabilidad <ArrowRight className="w-3.5 h-3.5" />
            </span>
          </Link>
        </div>

        {data?.consulta_5_pendientes_evaluacion &&
        data.consulta_5_pendientes_evaluacion.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-[#F2F7F4] text-[#274C3D] uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-2.5 px-3 rounded-l-xl">Serie / Código</th>
                  <th className="py-2.5 px-3">Equipo</th>
                  <th className="py-2.5 px-3">Categoría</th>
                  <th className="py-2.5 px-3">Lote</th>
                  <th className="py-2.5 px-3 rounded-r-xl text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EBF2EE]">
                {data.consulta_5_pendientes_evaluacion.map((p) => (
                  <tr key={p.id_dispositivo} className="hover:bg-[#F9FCFA]">
                    <td className="py-2.5 px-3 font-mono font-bold text-[#274C3D]">
                      {p.num_serie}
                    </td>
                    <td className="py-2.5 px-3 font-medium text-[#1F2925]">
                      {p.marca} {p.modelo}
                    </td>
                    <td className="py-2.5 px-3 text-slate-600">{p.nombre_categoria}</td>
                    <td className="py-2.5 px-3">
                      <span className="px-2 py-0.5 rounded bg-slate-100 font-mono text-[10px] text-slate-700">
                        {p.codigo_lote}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-right">
                      <Link to="/dispositivos">
                        <Button variant="primary" size="sm" className="text-[11px] py-1 px-3">
                          Evaluar
                        </Button>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-6 text-center text-slate-500 text-xs">
            No hay dispositivos pendientes de evaluación técnica en este momento.
          </div>
        )}
      </div>

      {/* Alertas y Auditoría */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Alertas Operativas */}
        <div className="bg-white rounded-3xl p-6 border border-[#D6E3DC] shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Bell className="w-5 h-5 text-amber-600" />
              <h3 className="text-base font-bold text-[#1F2925]">
                Alertas Activas del Sistema
              </h3>
            </div>
            <span className="text-xs font-bold text-[#274C3D]">
              {data?.alertas.filter((a) => a.estado_alerta === "Activa").length} Activas
            </span>
          </div>

          <div className="space-y-2.5">
            {data?.alertas.map((a) => (
              <div
                key={a.id_alerta}
                className={`p-3.5 rounded-2xl border text-xs flex items-start justify-between gap-3 ${
                  a.estado_alerta === "Activa"
                    ? "bg-amber-50/60 border-amber-200"
                    : "bg-slate-50 border-slate-200 opacity-60"
                }`}
              >
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        a.nivel_criticidad === "ALTA"
                          ? "bg-rose-100 text-rose-800"
                          : a.nivel_criticidad === "MEDIA"
                          ? "bg-amber-100 text-amber-800"
                          : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {a.nivel_criticidad}
                    </span>
                    <span className="text-slate-400 text-[10px]">
                      {new Date(a.fecha_generacion).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-slate-800 font-medium">{a.mensaje}</p>
                </div>
                {a.estado_alerta === "Activa" && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => handleResolverAlerta(a.id_alerta)}
                    className="text-[10px] py-1 px-2.5 shrink-0"
                  >
                    <Check className="w-3 h-3 text-emerald-600 mr-1" />
                    Resolver
                  </Button>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Registro de Auditoría */}
        <div className="bg-white rounded-3xl p-6 border border-[#D6E3DC] shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-[#274C3D]" />
              <h3 className="text-base font-bold text-[#1F2925]">
                Registro de Auditoría (AUDITORIA)
              </h3>
            </div>
            <span className="text-xs text-slate-500">Últimos eventos registrados</span>
          </div>

          <div className="space-y-2">
            {data?.auditoria.map((aud) => (
              <div
                key={aud.id_auditoria}
                className="p-3 rounded-2xl bg-[#F8FAF9] border border-[#D6E3DC] text-xs space-y-1"
              >
                <div className="flex items-center justify-between text-[11px]">
                  <span className="font-bold text-[#274C3D] uppercase">
                    {aud.modulo} · {aud.accion}
                  </span>
                  <span className="text-slate-400 font-mono text-[10px]">
                    {new Date(aud.fecha_accion).toLocaleTimeString()}
                  </span>
                </div>
                <p className="text-slate-700">{aud.detalle}</p>
                <span className="text-[10px] text-slate-500 font-mono block">
                  Operador: {aud.usuario}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* MODAL: Nueva Alerta */}
      {mostrarModalAlerta && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 border border-[#D6E3DC] shadow-xl">
            <h3 className="text-lg font-bold text-[#1F2925]">
              Generar Alerta de Capacidad / Logística
            </h3>
            <form onSubmit={handleCrearAlerta} className="space-y-4 text-xs">
              <div>
                <label className="block text-xs font-bold text-[#274C3D] uppercase tracking-wider mb-1">
                  Mensaje de Alerta
                </label>
                <Input
                  value={mensajeAlerta}
                  onChange={(e) => setMensajeAlerta(e.target.value)}
                  placeholder="Ej: Acumulación de 35 monitores en acopio norte..."
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#274C3D] uppercase tracking-wider mb-1">
                  Nivel de Criticidad
                </label>
                <select
                  value={nivelCriticidad}
                  onChange={(e) => setNivelCriticidad(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-[#D6E3DC] text-slate-800 text-sm rounded-xl focus:border-[#274C3D] outline-none"
                >
                  <option value="BAJA">BAJA - Informativa</option>
                  <option value="MEDIA">MEDIA - Atención Logística</option>
                  <option value="ALTA">ALTA - Saturación / Crítica</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#274C3D] uppercase tracking-wider mb-1">
                  Centro Asociado
                </label>
                <select
                  value={idCentroAlerta}
                  onChange={(e) => setIdCentroAlerta(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-white border border-[#D6E3DC] text-slate-800 text-sm rounded-xl focus:border-[#274C3D] outline-none"
                >
                  {centros.map((c) => (
                    <option key={c.id_centro} value={c.id_centro}>
                      {c.nombre_centro} ({c.codigo_centro})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-[#EBF2EE]">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setMostrarModalAlerta(false)}
                >
                  Cancelar
                </Button>
                <Button type="submit" variant="primary" size="sm">
                  Registrar Alerta
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;
