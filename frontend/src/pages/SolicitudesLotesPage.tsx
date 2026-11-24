import React, { useEffect, useState, useCallback } from "react";
import {
  Truck,
  Package,
  Boxes,
  Building,
  Plus,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import apiClient from "../api/client";
import { useAuth } from "../context/AuthContext";
import {
  SolicitudDTO,
  LoteDTO,
  CatalogosResumenDTO,
  InventarioDTO,
  TransferenciaDTO,
  UUID,
} from "../types";
import Button from "../components/atoms/Button";
import Input from "../components/atoms/Input";
import FormField from "../components/molecules/FormField";

const ESTADOS_REC = ["Pendiente", "Asignada", "En Recoleccion", "Finalizada"];

const SolicitudesLotesPage: React.FC = () => {
  const { user } = useAuth();
  const [solicitudes, setSolicitudes] = useState<SolicitudDTO[]>([]);
  const [lotes, setLotes] = useState<LoteDTO[]>([]);
  const [catalogos, setCatalogos] = useState<CatalogosResumenDTO | null>(null);
  const [inventario, setInventario] = useState<InventarioDTO[]>([]);
  const [transferencias, setTransferencias] = useState<TransferenciaDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Nueva Solicitud
  const [modalSol, setModalSol] = useState(false);
  const [codSolicitud, setCodSolicitud] = useState("SOL-2026-002");
  const [estadoSol, setEstadoSol] = useState("Pendiente");
  const [idCentroSol, setIdCentroSol] = useState<UUID>("");

  // Nuevo Lote
  const [modalLote, setModalLote] = useState(false);
  const [codLote, setCodLote] = useState("LOT-2026-02");
  const [idSolLote, setIdSolLote] = useState<UUID>("");

  // Ajuste de Inventario
  const [modalStock, setModalStock] = useState(false);
  const [idCentroStock, setIdCentroStock] = useState<UUID>("");
  const [idCatStock, setIdCatStock] = useState<UUID>("");
  const [cantAjuste, setCantAjuste] = useState<number>(5);

  const cargarDatos = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const [solRes, lotRes, catRes, invRes, traRes] = await Promise.all([
        apiClient.get<SolicitudDTO[]>("/solicitudes/"),
        apiClient.get<LoteDTO[]>("/solicitudes/lotes"),
        apiClient.get<CatalogosResumenDTO>("/catalogos/resumen"),
        apiClient.get<InventarioDTO[]>("/catalogos/inventario"),
        apiClient.get<TransferenciaDTO[]>("/dispositivos/transferencias/all"),
      ]);
      setSolicitudes(solRes.data);
      setLotes(lotRes.data);
      setCatalogos(catRes.data);
      setInventario(invRes.data);
      setTransferencias(traRes.data);

      if (catRes.data.centros.length > 0) {
        setIdCentroSol((prev) => prev || catRes.data.centros[0].id_centro);
        setIdCentroStock((prev) => prev || catRes.data.centros[0].id_centro);
      }
      if (catRes.data.categorias.length > 0) {
        setIdCatStock((prev) => prev || catRes.data.categorias[0].id_categoria);
      }
      if (solRes.data.length > 0) {
        setIdSolLote((prev) => prev || solRes.data[0].id_solicitud);
      }
    } catch (err: any) {
      console.error(err);
      setErrorMsg("Error cargando módulos de logística y stock desde la base de datos.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarDatos();
  }, [cargarDatos]);

  const handleCrearSolicitud = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!codSolicitud.trim() || !idCentroSol) return;
    try {
      await apiClient.post("/solicitudes/", {
        codigo_solicitud: codSolicitud.trim(),
        estado_recoleccion: estadoSol,
        id_centro: idCentroSol,
        id_usuario: user?.id_usuario,
      });
      setModalSol(false);
      setCodSolicitud(`SOL-2026-00${solicitudes.length + 2}`);
      await cargarDatos();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Error al crear la solicitud.");
    }
  };

  const handleCrearLote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!codLote.trim() || !idSolLote) return;
    try {
      await apiClient.post("/solicitudes/lotes", {
        codigo_lote: codLote.trim(),
        id_solicitud: idSolLote,
        id_usuario: user?.id_usuario,
      });
      setModalLote(false);
      setCodLote(`LOT-2026-0${lotes.length + 2}`);
      await cargarDatos();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Error al crear el lote.");
    }
  };

  const handleAjusteInventario = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!idCentroStock || !idCatStock) return;
    try {
      await apiClient.post("/catalogos/inventario/ajuste", {
        id_centro: idCentroStock,
        id_categoria: idCatStock,
        cantidad: cantAjuste,
        id_usuario: user?.id_usuario,
      });
      setModalStock(false);
      await cargarDatos();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Error al ajustar el inventario.");
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Header */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#D6E3DC] shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-[#EBF2EE] text-[#274C3D] text-xs font-bold uppercase tracking-wider mb-2 border border-[#C5D8CF]">
            <Truck className="w-3.5 h-3.5 text-[#274C3D]" />
            Logística RAEE · Solicitudes, Lotes & Stock
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#1F2925] tracking-tight">
            Gestión de Solicitudes, Lotes e Inventario
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-2xl">
            Control de entrada por solicitudes de retiro, conformación de lotes y existencias atómicas por centro de acopio y categoría de base de datos.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setModalSol(true)}
            className="flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Nueva Solicitud
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setModalLote(true)}
            className="flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Nuevo Lote
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => setModalStock(true)}
            className="flex items-center gap-1.5"
          >
            <TrendingUp className="w-4 h-4" />
            Ajustar Stock
          </Button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
          {errorMsg}
        </div>
      )}

      {loading && solicitudes.length === 0 ? (
        <div className="bg-white rounded-3xl border border-[#D6E3DC] p-12 text-center">
          <div className="w-8 h-8 rounded-full border-3 border-[#274C3D] border-t-transparent animate-spin mx-auto" />
        </div>
      ) : (
        <>
          {/* Grid de Solicitudes y Lotes */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-3xl border border-[#D6E3DC] shadow-xs p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Package className="w-5 h-5 text-[#274C3D]" />
                  <h2 className="text-base font-bold text-[#1F2925]">
                    Solicitudes de Recolección (SOLICITUD)
                  </h2>
                </div>
                <span className="text-xs font-bold text-[#274C3D] bg-[#EBF2EE] px-2.5 py-0.5 rounded-lg border border-[#C5D8CF]">
                  {solicitudes.length} Registradas
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[#F2F7F4] text-[#274C3D] uppercase text-[10px] tracking-wider font-bold">
                    <tr>
                      <th className="py-2.5 px-3 rounded-l-xl">Código</th>
                      <th className="py-2.5 px-3">Centro Asignado</th>
                      <th className="py-2.5 px-3">Estado</th>
                      <th className="py-2.5 px-3 rounded-r-xl">Fecha</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EBF2EE]">
                    {solicitudes.map((s) => (
                      <tr key={s.id_solicitud} className="hover:bg-[#F9FCFA]">
                        <td className="py-2.5 px-3 font-mono font-bold text-[#274C3D]">
                          {s.codigo_solicitud}
                        </td>
                        <td className="py-2.5 px-3 text-[#1F2925] font-medium">
                          {s.nombre_centro}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className="px-2 py-0.5 rounded-lg bg-[#EBF2EE] text-[#274C3D] font-bold text-[10px] border border-[#C5D8CF]">
                            {s.estado_recoleccion}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 text-[11px]">
                          {new Date(s.fecha_solicitud).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-[#D6E3DC] shadow-xs p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Boxes className="w-5 h-5 text-[#274C3D]" />
                  <h2 className="text-base font-bold text-[#1F2925]">
                    Lotes de Agrupación (LOTE)
                  </h2>
                </div>
                <span className="text-xs font-bold text-[#274C3D] bg-[#EBF2EE] px-2.5 py-0.5 rounded-lg border border-[#C5D8CF]">
                  {lotes.length} Lotes
                </span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-[#F2F7F4] text-[#274C3D] uppercase text-[10px] tracking-wider font-bold">
                    <tr>
                      <th className="py-2.5 px-3 rounded-l-xl">Código Lote</th>
                      <th className="py-2.5 px-3">Solicitud Origen</th>
                      <th className="py-2.5 px-3 text-right">Equipos</th>
                      <th className="py-2.5 px-3 rounded-r-xl">Fecha</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EBF2EE]">
                    {lotes.map((l) => (
                      <tr key={l.id_lote} className="hover:bg-[#F9FCFA]">
                        <td className="py-2.5 px-3 font-mono font-bold text-[#274C3D]">
                          {l.codigo_lote}
                        </td>
                        <td className="py-2.5 px-3 font-mono text-slate-600">
                          {l.codigo_solicitud}
                        </td>
                        <td className="py-2.5 px-3 text-right font-black text-[#274C3D]">
                          {l.total_dispositivos || 0}
                        </td>
                        <td className="py-2.5 px-3 text-slate-500 text-[11px]">
                          {new Date(l.fecha_creacion).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          {/* Inventario */}
          <div className="bg-white rounded-3xl border border-[#D6E3DC] shadow-xs p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#274C3D] bg-[#EBF2EE] px-2.5 py-0.5 rounded-lg border border-[#C5D8CF]">
                  Tabla INVENTARIO · Control Físico de Existencias
                </span>
                <h2 className="text-base font-bold text-[#1F2925] mt-1">
                  Inventario Atómico por Centro y Categoría
                </h2>
              </div>
              <span className="text-xs text-slate-500">
                Total en stock:{" "}
                <strong>{inventario.reduce((a, b) => a + b.stock_actual, 0)} unidades</strong>
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#F2F7F4] text-[#274C3D] uppercase text-[10px] tracking-wider font-bold">
                  <tr>
                    <th className="py-3 px-4 rounded-l-xl">Centro de Acopio / Planta</th>
                    <th className="py-3 px-4">Categoría RAEE</th>
                    <th className="py-3 px-4 text-right">Stock Actual</th>
                    <th className="py-3 px-4 rounded-r-xl">Última Actualización</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EBF2EE]">
                  {inventario.map((inv) => (
                    <tr key={inv.id_inventario} className="hover:bg-[#F9FCFA]">
                      <td className="py-3 px-4 font-bold text-[#1F2925]">
                        {inv.nombre_centro}
                      </td>
                      <td className="py-3 px-4 text-slate-700 font-medium">
                        {inv.nombre_categoria}
                      </td>
                      <td className="py-3 px-4 text-right font-mono font-black text-[#274C3D] text-sm">
                        {inv.stock_actual} unid.
                      </td>
                      <td className="py-3 px-4 text-slate-500 text-[11px]">
                        {new Date(inv.fecha_actualizacion).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Centros */}
          <div className="bg-white rounded-3xl border border-[#D6E3DC] shadow-xs p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building className="w-5 h-5 text-[#274C3D]" />
                <h2 className="text-base font-bold text-[#1F2925]">
                  Infraestructura de Centros de la Red (CENTRO)
                </h2>
              </div>
              <span className="text-xs text-slate-500">
                Capacidad total instalada:{" "}
                <strong>
                  {catalogos?.centros.reduce((a, b) => a + b.capacidad_max_ton, 0) || 0} toneladas
                </strong>
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {catalogos?.centros.map((c) => (
                <div
                  key={c.id_centro}
                  className="p-5 rounded-3xl bg-[#F8FAF9] border border-[#D6E3DC] space-y-2 hover:border-[#274C3D] transition-all"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono text-xs font-bold text-[#274C3D] bg-[#EBF2EE] px-2 py-0.5 rounded-lg border border-[#C5D8CF]">
                      {c.codigo_centro}
                    </span>
                    <span className="text-[11px] text-slate-500 font-medium">{c.ciudad}</span>
                  </div>
                  <h3 className="text-sm font-bold text-[#1F2925] line-clamp-1">
                    {c.nombre_centro}
                  </h3>
                  <p className="text-xs text-slate-600">{c.nombre_tipo_centro}</p>
                  <div className="pt-2 flex items-center justify-between text-xs border-t border-[#D6E3DC]">
                    <span className="text-slate-500">Capacidad Máxima:</span>
                    <span className="font-bold text-[#274C3D]">{c.capacidad_max_ton} ton</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Transferencias */}
          <div className="bg-white rounded-3xl border border-[#D6E3DC] shadow-xs p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-[#1F2925] flex items-center gap-2">
                <Truck className="w-5 h-5 text-[#274C3D]" />
                <span>Transferencias Logísticas Inter-Centro (TRANSFERENCIA_MOVIMIENTO)</span>
              </h2>
              <span className="text-xs text-slate-500">
                {transferencias.length} Movimientos Registrados
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#F2F7F4] text-[#274C3D] uppercase text-[10px] tracking-wider font-bold">
                  <tr>
                    <th className="py-2.5 px-3 rounded-l-xl">Movimiento (UUID)</th>
                    <th className="py-2.5 px-3">Dispositivo</th>
                    <th className="py-2.5 px-3">Ruta Logística</th>
                    <th className="py-2.5 px-3">Estado</th>
                    <th className="py-2.5 px-3 rounded-r-xl">Fecha</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EBF2EE]">
                  {transferencias.map((t) => (
                    <tr key={t.id_movimiento} className="hover:bg-[#F9FCFA]">
                      <td className="py-2.5 px-3 font-mono font-bold text-[#274C3D]">
                        {t.id_movimiento.slice(0, 8)}...
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="font-mono font-bold text-[#1F2925]">{t.num_serie}</span>
                        <span className="text-slate-500 block text-[10px]">
                          {t.nombre_objeto} ({t.marca} {t.modelo})
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-medium text-slate-800">
                        {t.nombre_centro_origen}{" "}
                        <ArrowRight className="w-3 h-3 inline text-[#274C3D] mx-1" />{" "}
                        {t.nombre_centro_destino}
                      </td>
                      <td className="py-2.5 px-3">
                        <span className="px-2 py-0.5 rounded-lg bg-[#EBF2EE] text-[#274C3D] font-bold text-[10px]">
                          {t.estado_transferencia}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 text-slate-500 text-[11px]">
                        {new Date(t.fecha_movimiento).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* MODAL 1: Nueva Solicitud */}
      {modalSol && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 border border-[#D6E3DC] shadow-xl">
            <h3 className="text-lg font-bold text-[#1F2925]">
              Registrar Nueva Solicitud de Recolección
            </h3>
            <form onSubmit={handleCrearSolicitud} className="space-y-4 text-xs">
              <FormField label="Código de Solicitud">
                <Input
                  value={codSolicitud}
                  onChange={(e) => setCodSolicitud(e.target.value)}
                  placeholder="SOL-2026-005"
                  required
                />
              </FormField>

              <FormField label="Centro de Acopio Asignado">
                <select
                  value={idCentroSol}
                  onChange={(e) => setIdCentroSol(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 bg-white border border-[#D6E3DC] text-slate-800 text-xs rounded-xl focus:border-[#274C3D] outline-none"
                >
                  {catalogos?.centros.map((c) => (
                    <option key={c.id_centro} value={c.id_centro}>
                      {c.nombre_centro} ({c.codigo_centro})
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField label="Estado Inicial">
                <select
                  value={estadoSol}
                  onChange={(e) => setEstadoSol(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-[#D6E3DC] text-slate-800 text-xs rounded-xl focus:border-[#274C3D] outline-none"
                >
                  {ESTADOS_REC.map((est) => (
                    <option key={est} value={est}>
                      {est}
                    </option>
                  ))}
                </select>
              </FormField>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-[#EBF2EE]">
                <Button type="button" variant="secondary" size="sm" onClick={() => setModalSol(false)}>
                  Cancelar
                </Button>
                <Button type="submit" variant="primary" size="sm">
                  Guardar Solicitud
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Nuevo Lote */}
      {modalLote && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 border border-[#D6E3DC] shadow-xl">
            <h3 className="text-lg font-bold text-[#1F2925]">Crear Nuevo Lote de RAEE</h3>
            <form onSubmit={handleCrearLote} className="space-y-4 text-xs">
              <FormField label="Código de Lote">
                <Input
                  value={codLote}
                  onChange={(e) => setCodLote(e.target.value)}
                  placeholder="LOT-2026-04"
                  required
                />
              </FormField>

              <FormField label="Solicitud Vinculada">
                <select
                  value={idSolLote}
                  onChange={(e) => setIdSolLote(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 bg-white border border-[#D6E3DC] text-slate-800 text-xs rounded-xl focus:border-[#274C3D] outline-none"
                >
                  {solicitudes.map((s) => (
                    <option key={s.id_solicitud} value={s.id_solicitud}>
                      {s.codigo_solicitud} - {s.nombre_centro}
                    </option>
                  ))}
                </select>
              </FormField>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-[#EBF2EE]">
                <Button type="button" variant="secondary" size="sm" onClick={() => setModalLote(false)}>
                  Cancelar
                </Button>
                <Button type="submit" variant="primary" size="sm">
                  Crear Lote
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Ajuste de Inventario */}
      {modalStock && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 border border-[#D6E3DC] shadow-xl">
            <h3 className="text-lg font-bold text-[#1F2925]">Ajuste de Stock en Inventario</h3>
            <form onSubmit={handleAjusteInventario} className="space-y-4 text-xs">
              <FormField label="Centro de Acopio / Planta">
                <select
                  value={idCentroStock}
                  onChange={(e) => setIdCentroStock(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 bg-white border border-[#D6E3DC] text-slate-800 text-xs rounded-xl focus:border-[#274C3D] outline-none"
                >
                  {catalogos?.centros.map((c) => (
                    <option key={c.id_centro} value={c.id_centro}>
                      {c.nombre_centro}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField label="Categoría de RAEE (desde BD)">
                <select
                  value={idCatStock}
                  onChange={(e) => setIdCatStock(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 bg-white border border-[#D6E3DC] text-slate-800 text-xs rounded-xl focus:border-[#274C3D] outline-none"
                >
                  {catalogos?.categorias.map((cat) => (
                    <option key={cat.id_categoria} value={cat.id_categoria}>
                      {cat.nombre_categoria}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField label="Cantidad a Agregar (o restar con negativo)">
                <Input
                  type="number"
                  value={cantAjuste}
                  onChange={(e) => setCantAjuste(Number(e.target.value))}
                  required
                />
              </FormField>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-[#EBF2EE]">
                <Button type="button" variant="secondary" size="sm" onClick={() => setModalStock(false)}>
                  Cancelar
                </Button>
                <Button type="submit" variant="primary" size="sm">
                  Aplicar Ajuste
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default SolicitudesLotesPage;
