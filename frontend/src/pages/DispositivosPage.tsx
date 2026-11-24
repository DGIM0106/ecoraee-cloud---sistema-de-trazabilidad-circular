import React, { useEffect, useState, useMemo, useCallback } from "react";
import { Link } from "react-router-dom";
import {
  Cpu,
  Plus,
  Search,
  Eye,
  ClipboardCheck,
  Truck,
  FileCheck2,
  Pencil,
  Trash2,
  X,
  CheckCircle2,
  Clock,
  ExternalLink,
  ShieldAlert,
  FolderTree,
  PackageCheck,
} from "lucide-react";
import apiClient from "../api/client";
import { useAuth } from "../context/AuthContext";
import {
  DispositivoDTO,
  DispositivoDetalleDTO,
  CatalogosResumenDTO,
  LoteDTO,
  UUID,
} from "../types";
import Button from "../components/atoms/Button";
import Input from "../components/atoms/Input";
import FormField from "../components/molecules/FormField";

const CLASIFICACIONES = [
  "Reutilizacion",
  "Reacondicionamiento",
  "Reciclaje",
  "Disposicion Final",
];

const DispositivosPage: React.FC = () => {
  const { user } = useAuth();
  const [dispositivos, setDispositivos] = useState<DispositivoDTO[]>([]);
  const [catalogos, setCatalogos] = useState<CatalogosResumenDTO | null>(null);
  const [lotes, setLotes] = useState<LoteDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);

  // Filtros
  const [search, setSearch] = useState("");
  const [catFilter, setCatFilter] = useState<string>("");
  const [clasifFilter, setClasifFilter] = useState<string>("TODOS");

  // Modales activos
  const [modalCrearEditar, setModalCrearEditar] = useState<DispositivoDTO | "NEW" | null>(null);
  const [modalTrazabilidad, setModalTrazabilidad] = useState<DispositivoDetalleDTO | null>(null);
  const [modalEvaluar, setModalEvaluar] = useState<DispositivoDTO | null>(null);
  const [modalTransferir, setModalTransferir] = useState<DispositivoDTO | null>(null);
  const [modalCerrar, setModalCerrar] = useState<DispositivoDTO | null>(null);

  // Formulario Crear / Editar Dispositivo (estrictamente categoría y objeto desde BD)
  const [numSerie, setNumSerie] = useState("");
  const [idCategoria, setIdCategoria] = useState<UUID>("");
  const [idObjeto, setIdObjeto] = useState<UUID>("");
  const [idLote, setIdLote] = useState<UUID>("");
  const [obsInicial, setObsInicial] = useState("Ingreso y verificación física en centro de acopio");

  // Formulario Evaluación Técnica
  const [diagnostico, setDiagnostico] = useState("");
  const [clasificacion, setClasificacion] = useState("Reutilizacion");
  const [idCondicion, setIdCondicion] = useState<UUID>("");

  // Formulario Transferencia
  const [idCentroOrigen, setIdCentroOrigen] = useState<UUID>("");
  const [idCentroDestino, setIdCentroDestino] = useState<UUID>("");
  const [estadoTransf, setEstadoTransf] = useState("Entregado");

  // Formulario Cierre y Evidencia
  const [resultadoTrat, setResultadoTrat] = useState("");
  const [destinoTrat, setDestinoTrat] = useState("");
  const [archivoEvidencia, setArchivoEvidencia] = useState<File | null>(null);
  const [tipoManual, setTipoManual] = useState("PDF");

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const cargarTodo = useCallback(async () => {
    try {
      setLoading(true);
      setPageError(null);
      const [dispRes, catRes, lotRes] = await Promise.all([
        apiClient.get<DispositivoDTO[]>("/dispositivos/"),
        apiClient.get<CatalogosResumenDTO>("/catalogos/resumen"),
        apiClient.get<LoteDTO[]>("/solicitudes/lotes"),
      ]);
      setDispositivos(dispRes.data);
      setCatalogos(catRes.data);
      setLotes(lotRes.data);
    } catch (err: any) {
      console.error("Error cargando dispositivos:", err);
      setPageError(
        err.response?.data?.detail ||
          "No se pudo conectar con la API de EcoRAEE para cargar los dispositivos."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarTodo();
  }, [cargarTodo]);

  // Objetos disponibles en BD para la categoría seleccionada
  const objetosDeCategoria = useMemo(() => {
    if (!catalogos?.objetos) return [];
    if (!idCategoria) return catalogos.objetos;
    return catalogos.objetos.filter((o) => o.id_categoria === idCategoria);
  }, [catalogos, idCategoria]);

  const objetoSeleccionado = useMemo(() => {
    return catalogos?.objetos.find((o) => o.id_objeto === idObjeto) || null;
  }, [catalogos, idObjeto]);

  const dispositivosFiltrados = useMemo(() => {
    return dispositivos.filter((d) => {
      if (catFilter && d.id_categoria !== catFilter) return false;
      if (clasifFilter === "PENDIENTE" && d.evaluacion !== null) return false;
      if (
        clasifFilter !== "TODOS" &&
        clasifFilter !== "PENDIENTE" &&
        d.evaluacion?.clasificacion_tecnica !== clasifFilter
      ) {
        return false;
      }
      if (search.trim()) {
        const q = search.toLowerCase();
        const match =
          d.num_serie.toLowerCase().includes(q) ||
          d.nombre_objeto.toLowerCase().includes(q) ||
          d.marca.toLowerCase().includes(q) ||
          d.modelo.toLowerCase().includes(q) ||
          d.codigo_lote.toLowerCase().includes(q) ||
          d.nombre_centro.toLowerCase().includes(q);
        if (!match) return false;
      }
      return true;
    });
  }, [dispositivos, catFilter, clasifFilter, search]);

  const handleCategoriaChange = (newCatId: UUID) => {
    setIdCategoria(newCatId);
    const matching = (catalogos?.objetos || []).filter((o) => o.id_categoria === newCatId);
    setIdObjeto(matching[0]?.id_objeto || "");
  };

  const abrirModalNuevo = () => {
    setFormError(null);
    setNumSerie(`SN-ECO-${Math.floor(1000 + Math.random() * 9000)}`);
    const firstCat = catalogos?.categorias[0]?.id_categoria || "";
    setIdCategoria(firstCat);
    const matchingObjs = (catalogos?.objetos || []).filter((o) => o.id_categoria === firstCat);
    setIdObjeto(matchingObjs[0]?.id_objeto || "");
    setIdLote(lotes[0]?.id_lote || "");
    setObsInicial("Ingreso verificado en centro de acopio");
    setModalCrearEditar("NEW");
  };

  const abrirModalEditar = (d: DispositivoDTO) => {
    setFormError(null);
    setNumSerie(d.num_serie);
    setIdCategoria(d.id_categoria);
    setIdObjeto(d.id_objeto);
    setIdLote(d.id_lote);
    setModalCrearEditar(d);
  };

  const handleGuardarDispositivo = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!numSerie.trim() || !idCategoria || !idObjeto || !idLote) {
      setFormError(
        "Debes ingresar el número de serie y seleccionar Categoría, Objeto y Lote registrados en la base de datos."
      );
      return;
    }
    try {
      setSubmitting(true);
      if (modalCrearEditar === "NEW") {
        await apiClient.post("/dispositivos/", {
          num_serie: numSerie.trim(),
          id_objeto: idObjeto,
          id_categoria: idCategoria,
          id_lote: idLote,
          observacion_inicial: obsInicial,
          id_usuario: user?.id_usuario,
        });
      } else if (modalCrearEditar) {
        await apiClient.put(`/dispositivos/${modalCrearEditar.id_dispositivo}`, {
          num_serie: numSerie.trim(),
          id_objeto: idObjeto,
          id_categoria: idCategoria,
          id_lote: idLote,
          id_usuario: user?.id_usuario,
        });
      }
      setModalCrearEditar(null);
      await cargarTodo();
    } catch (err: any) {
      setFormError(err.response?.data?.detail || "Error al guardar el dispositivo.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEliminarDispositivo = async (d: DispositivoDTO) => {
    if (!window.confirm(`¿Eliminar el dispositivo ${d.num_serie} (${d.nombre_objeto})?`)) {
      return;
    }
    try {
      await apiClient.delete(`/dispositivos/${d.id_dispositivo}`);
      await cargarTodo();
    } catch (err: any) {
      alert(err.response?.data?.detail || "No se pudo eliminar el dispositivo.");
    }
  };

  const abrirTrazabilidad = async (id_dispositivo: UUID) => {
    try {
      const res = await apiClient.get<DispositivoDetalleDTO>(`/dispositivos/${id_dispositivo}`);
      setModalTrazabilidad(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const abrirEvaluar = (d: DispositivoDTO) => {
    setFormError(null);
    setDiagnostico(d.evaluacion?.diagnostico || "");
    setClasificacion(d.evaluacion?.clasificacion_tecnica || "Reutilizacion");
    setIdCondicion(d.evaluacion?.id_condicion || catalogos?.condiciones[0]?.id_condicion || "");
    setModalEvaluar(d);
  };

  const handleGuardarEvaluacion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalEvaluar) return;
    if (!diagnostico.trim() || !idCondicion || !user?.id_usuario) {
      setFormError("Diagnóstico, condición física y usuario autenticado son obligatorios.");
      return;
    }
    try {
      setSubmitting(true);
      if (modalEvaluar.evaluacion) {
        await apiClient.put(`/dispositivos/evaluaciones/${modalEvaluar.evaluacion.id_evaluacion}`, {
          diagnostico: diagnostico.trim(),
          clasificacion_tecnica: clasificacion,
          id_condicion: idCondicion,
          id_usuario_evaluador: user.id_usuario,
        });
      } else {
        await apiClient.post("/dispositivos/evaluaciones", {
          id_dispositivo: modalEvaluar.id_dispositivo,
          diagnostico: diagnostico.trim(),
          clasificacion_tecnica: clasificacion,
          id_condicion: idCondicion,
          id_usuario_evaluador: user.id_usuario,
        });
      }
      setModalEvaluar(null);
      await cargarTodo();
    } catch (err: any) {
      setFormError(err.response?.data?.detail || "Error al guardar la evaluación.");
    } finally {
      setSubmitting(false);
    }
  };

  const abrirTransferir = (d: DispositivoDTO) => {
    setFormError(null);
    const origen = d.id_centro_actual || catalogos?.centros[0]?.id_centro || "";
    const destino =
      catalogos?.centros.find((c) => c.id_centro !== origen)?.id_centro || origen;
    setIdCentroOrigen(origen);
    setIdCentroDestino(destino);
    setEstadoTransf("Entregado");
    setModalTransferir(d);
  };

  const handleGuardarTransferencia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalTransferir) return;
    if (idCentroOrigen === idCentroDestino) {
      setFormError("El centro de origen no puede ser idéntico al de destino.");
      return;
    }
    try {
      setSubmitting(true);
      await apiClient.post("/dispositivos/transferencias", {
        id_dispositivo: modalTransferir.id_dispositivo,
        id_centro_origen: idCentroOrigen,
        id_centro_destino: idCentroDestino,
        estado_transferencia: estadoTransf,
        id_usuario: user?.id_usuario,
      });
      setModalTransferir(null);
      await cargarTodo();
    } catch (err: any) {
      setFormError(err.response?.data?.detail || "Error al registrar la transferencia.");
    } finally {
      setSubmitting(false);
    }
  };

  const abrirCerrar = (d: DispositivoDTO) => {
    setFormError(null);
    setResultadoTrat(`Acondicionamiento o desmantelamiento completado para ${d.num_serie}`);
    setDestinoTrat("Destino Circular Certificado (Gestor Autorizado)");
    setArchivoEvidencia(null);
    setTipoManual("PDF");
    setModalCerrar(d);
  };

  const handleGuardarCierre = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modalCerrar) return;
    try {
      setSubmitting(true);
      const formData = new FormData();
      formData.append("id_dispositivo", modalCerrar.id_dispositivo);
      formData.append("resultado", resultadoTrat);
      formData.append("destino", destinoTrat);
      if (user?.id_usuario) {
        formData.append("id_usuario", user.id_usuario);
      }
      if (archivoEvidencia) {
        formData.append("archivo_evidencia", archivoEvidencia);
      } else {
        formData.append("tipo_archivo_manual", tipoManual);
      }

      await apiClient.post("/dispositivos/tratamientos", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      setModalCerrar(null);
      await cargarTodo();
    } catch (err: any) {
      setFormError(err.response?.data?.detail || "Error al cerrar el ciclo de trazabilidad.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Cabecera */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#D6E3DC] shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-[#EBF2EE] text-[#274C3D] text-xs font-bold uppercase tracking-wider mb-2 border border-[#C5D8CF]">
            <Cpu className="w-3.5 h-3.5 text-[#274C3D]" />
            Ciclo de Vida RAEE · UUID & Objetos Controlados en BD
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#1F2925] tracking-tight">
            Gestión y Control de Dispositivos RAEE
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-2xl">
            Registra equipos seleccionando únicamente Categorías y Objetos existentes en la base de datos, con diagnóstico técnico, transferencias y evidencias en AWS S3.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <Link to="/catalogos">
            <Button variant="outline" size="sm" className="flex items-center gap-1.5">
              <FolderTree className="w-4 h-4" />
              <span>Gestionar Catálogos</span>
            </Button>
          </Link>
          <Button
            variant="primary"
            size="sm"
            onClick={abrirModalNuevo}
            className="flex items-center gap-2"
          >
            <Plus className="w-4 h-4" />
            <span>Registrar Nuevo RAEE</span>
          </Button>
        </div>
      </div>

      {pageError && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>{pageError}</span>
        </div>
      )}

      {/* Barra de Filtros */}
      <div className="bg-white rounded-3xl p-5 border border-[#D6E3DC] shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="relative flex-1 min-w-[260px]">
          <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por serie, objeto, marca, modelo, lote o centro..."
            className="w-full pl-10 pr-4 py-2.5 bg-[#F8FAF9] border border-[#D6E3DC] text-slate-800 placeholder-slate-400 text-xs sm:text-sm rounded-2xl outline-none focus:border-[#274C3D] focus:bg-white transition-all"
          />
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs font-bold text-[#527063] uppercase hidden sm:inline">
            Categoría:
          </span>
          <select
            value={catFilter}
            onChange={(e) => setCatFilter(e.target.value)}
            className="px-3 py-2 bg-[#F8FAF9] border border-[#D6E3DC] text-slate-800 text-xs sm:text-sm rounded-2xl outline-none focus:border-[#274C3D]"
          >
            <option value="">Todas las categorías (BD)</option>
            {catalogos?.categorias.map((c) => (
              <option key={c.id_categoria} value={c.id_categoria}>
                {c.nombre_categoria}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-1 overflow-x-auto py-1">
          {["TODOS", "PENDIENTE", ...CLASIFICACIONES].map((f) => (
            <button
              key={f}
              onClick={() => setClasifFilter(f)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all cursor-pointer ${
                clasifFilter === f
                  ? "bg-[#274C3D] text-white shadow-xs"
                  : "bg-[#F8FAF9] text-slate-600 hover:text-[#274C3D] border border-[#D6E3DC]"
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Tabla de Dispositivos */}
      <div className="bg-white rounded-3xl border border-[#D6E3DC] shadow-xs overflow-hidden">
        <div className="p-5 border-b border-[#EBF2EE] flex items-center justify-between">
          <h2 className="text-sm font-bold text-[#1F2925] flex items-center gap-2">
            <span>Listado de Dispositivos Registrados</span>
            <span className="px-2 py-0.5 rounded-lg bg-[#EBF2EE] text-[#274C3D] text-xs font-bold">
              {dispositivosFiltrados.length}
            </span>
          </h2>
          <span className="text-xs text-slate-500">DTOs validados · IDs UUID</span>
        </div>

        {loading ? (
          <div className="p-12 text-center space-y-3">
            <div className="w-8 h-8 rounded-full border-3 border-[#274C3D] border-t-transparent animate-spin mx-auto" />
            <p className="text-xs font-semibold text-[#274C3D]">
              Consultando dispositivos en SQL Server...
            </p>
          </div>
        ) : dispositivosFiltrados.length === 0 ? (
          <div className="p-12 text-center text-slate-500 text-sm">
            No se encontraron dispositivos que coincidan con los filtros aplicados.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-[#F2F7F4] text-[#274C3D] uppercase text-[10px] tracking-wider font-bold">
                <tr>
                  <th className="py-3 px-4">Serie & Objeto (BD)</th>
                  <th className="py-3 px-4">Categoría (BD)</th>
                  <th className="py-3 px-4">Ubicación Actual</th>
                  <th className="py-3 px-4">Diagnóstico / Clasificación</th>
                  <th className="py-3 px-4">Estado</th>
                  <th className="py-3 px-4 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EBF2EE]">
                {dispositivosFiltrados.map((d) => (
                  <tr key={d.id_dispositivo} className="hover:bg-[#F9FCFA] transition-colors">
                    <td className="py-3 px-4">
                      <div className="font-mono font-bold text-[#274C3D] text-xs">
                        {d.num_serie}
                      </div>
                      <div className="font-bold text-[#1F2925] text-xs">
                        {d.nombre_objeto}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {d.marca} {d.modelo} · <span className="font-mono">Lote: {d.codigo_lote}</span>
                      </div>
                    </td>

                    <td className="py-3 px-4 text-slate-700 font-medium">
                      {d.nombre_categoria}
                    </td>

                    <td className="py-3 px-4 text-slate-700">
                      <div className="font-medium text-[#1F2925]">{d.nombre_centro}</div>
                    </td>

                    <td className="py-3 px-4">
                      {d.evaluacion ? (
                        <div className="space-y-0.5">
                          <span className="inline-block px-2 py-0.5 rounded-lg bg-[#EBF2EE] text-[#274C3D] font-bold text-[10px] border border-[#C5D8CF]">
                            {d.evaluacion.clasificacion_tecnica}
                          </span>
                          <p
                            className="text-[11px] text-slate-600 line-clamp-1 max-w-[200px]"
                            title={d.evaluacion.diagnostico}
                          >
                            {d.evaluacion.diagnostico}
                          </p>
                        </div>
                      ) : (
                        <span className="inline-block px-2 py-0.5 rounded-lg bg-amber-50 text-amber-800 font-bold text-[10px] border border-amber-200">
                          Pendiente de Evaluación
                        </span>
                      )}
                    </td>

                    <td className="py-3 px-4">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-xl text-[10px] font-bold ${
                          d.estado_actual.toLowerCase().includes("cerrado")
                            ? "bg-emerald-100 text-emerald-800"
                            : d.estado_actual.toLowerCase().includes("tránsito") ||
                              d.estado_actual.toLowerCase().includes("transito")
                            ? "bg-blue-100 text-blue-800"
                            : d.estado_actual.toLowerCase().includes("evaluaci")
                            ? "bg-amber-100 text-amber-800"
                            : "bg-[#EBF2EE] text-[#274C3D]"
                        }`}
                      >
                        {d.estado_actual}
                      </span>
                    </td>

                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <button
                          onClick={() => abrirTrazabilidad(d.id_dispositivo)}
                          title="Ver Trazabilidad Completa"
                          className="p-1.5 rounded-xl bg-[#EBF2EE] text-[#274C3D] hover:bg-[#D6E3DC] cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => abrirEvaluar(d)}
                          title="Realizar / Editar Evaluación Técnica"
                          className="p-1.5 rounded-xl bg-amber-50 text-amber-800 hover:bg-amber-100 cursor-pointer"
                        >
                          <ClipboardCheck className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => abrirTransferir(d)}
                          title="Transferir a otro centro de la red"
                          className="p-1.5 rounded-xl bg-blue-50 text-blue-700 hover:bg-blue-100 cursor-pointer"
                        >
                          <Truck className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => abrirCerrar(d)}
                          title="Cerrar Ciclo con Evidencia AWS S3 / Local"
                          className="p-1.5 rounded-xl bg-emerald-50 text-emerald-800 hover:bg-emerald-100 cursor-pointer"
                        >
                          <FileCheck2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => abrirModalEditar(d)}
                          title="Editar Dispositivo"
                          className="p-1.5 rounded-xl text-slate-500 hover:bg-slate-100 cursor-pointer"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleEliminarDispositivo(d)}
                          title="Eliminar Dispositivo"
                          className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL 1: Crear / Editar Dispositivo (Solo Categorías y Objetos de la BD) */}
      {modalCrearEditar && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-5 border border-[#D6E3DC] shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-[#1F2925]">
                {modalCrearEditar === "NEW"
                  ? "Registrar Nuevo Dispositivo RAEE"
                  : `Editar Dispositivo: ${numSerie}`}
              </h3>
              <button
                onClick={() => setModalCrearEditar(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
                <ShieldAlert className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{formError}</span>
              </div>
            )}

            <form onSubmit={handleGuardarDispositivo} className="space-y-4 text-xs">
              <FormField label="Número de Serie Único">
                <Input
                  value={numSerie}
                  onChange={(e) => setNumSerie(e.target.value)}
                  placeholder="SN-ECO-1001"
                  required
                />
              </FormField>

              <FormField label="Categoría RAEE (Solo desde Base de Datos)">
                <select
                  value={idCategoria}
                  onChange={(e) => handleCategoriaChange(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 bg-white border border-[#D6E3DC] text-slate-800 text-xs rounded-xl focus:border-[#274C3D] outline-none"
                >
                  <option value="">Selecciona una categoría de la BD...</option>
                  {catalogos?.categorias.map((c) => (
                    <option key={c.id_categoria} value={c.id_categoria}>
                      [{c.codigo_categoria}] {c.nombre_categoria}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField label="Objeto RAEE (Solo desde Base de Datos)">
                {objetosDeCategoria.length > 0 ? (
                  <select
                    value={idObjeto}
                    onChange={(e) => setIdObjeto(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 bg-white border border-[#D6E3DC] text-slate-800 text-xs rounded-xl focus:border-[#274C3D] outline-none"
                  >
                    <option value="">Selecciona un objeto registrado en BD...</option>
                    {objetosDeCategoria.map((o) => (
                      <option key={o.id_objeto} value={o.id_objeto}>
                        [{o.codigo_objeto}] {o.nombre_objeto} ({o.marca} {o.modelo})
                      </option>
                    ))}
                  </select>
                ) : (
                  <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 flex items-center justify-between gap-2">
                    <span>No hay objetos en la BD para esta categoría.</span>
                    <Link
                      to="/catalogos"
                      className="font-bold underline whitespace-nowrap text-[#274C3D]"
                    >
                      Crear en Catálogos
                    </Link>
                  </div>
                )}
              </FormField>

              {objetoSeleccionado && (
                <div className="p-3.5 rounded-2xl bg-[#F2F7F4] border border-[#C5D8CF] flex items-start gap-3">
                  <PackageCheck className="w-4 h-4 text-[#274C3D] shrink-0 mt-0.5" />
                  <div className="space-y-0.5 text-[11px]">
                    <p className="font-bold text-[#1F2925]">
                      {objetoSeleccionado.nombre_objeto}
                    </p>
                    <p className="text-slate-600">
                      Marca: <strong>{objetoSeleccionado.marca}</strong> · Modelo:{" "}
                      <strong>{objetoSeleccionado.modelo}</strong>
                      {objetoSeleccionado.peso_estimado_kg != null &&
                        ` · Peso est.: ${objetoSeleccionado.peso_estimado_kg} kg`}
                    </p>
                  </div>
                </div>
              )}

              <FormField label="Lote de Origen">
                <select
                  value={idLote}
                  onChange={(e) => setIdLote(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 bg-white border border-[#D6E3DC] text-slate-800 text-xs rounded-xl focus:border-[#274C3D] outline-none"
                >
                  <option value="">Selecciona un lote...</option>
                  {lotes.map((l) => (
                    <option key={l.id_lote} value={l.id_lote}>
                      {l.codigo_lote} (Solicitud: {l.codigo_solicitud})
                    </option>
                  ))}
                </select>
              </FormField>

              {modalCrearEditar === "NEW" && (
                <FormField label="Observación Inicial de Ingreso">
                  <Input
                    value={obsInicial}
                    onChange={(e) => setObsInicial(e.target.value)}
                    placeholder="Detalles sobre el estado físico inicial..."
                  />
                </FormField>
              )}

              <div className="flex justify-end gap-2.5 pt-3 border-t border-[#EBF2EE]">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setModalCrearEditar(null)}
                >
                  Cancelar
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  size="sm"
                  isLoading={submitting}
                  disabled={!idObjeto || !idCategoria || !idLote}
                >
                  Guardar en Base de Datos
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Trazabilidad Completa */}
      {modalTrazabilidad && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-6 border border-[#D6E3DC] shadow-2xl">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#274C3D] bg-[#EBF2EE] px-2.5 py-0.5 rounded-lg border border-[#C5D8CF]">
                  Trazabilidad de Extremo a Extremo · UUID {modalTrazabilidad.id_dispositivo.slice(0, 8)}
                </span>
                <h2 className="text-xl font-black text-[#1F2925] mt-1">
                  {modalTrazabilidad.nombre_objeto} (
                  <span className="text-[#274C3D] font-mono">
                    {modalTrazabilidad.num_serie}
                  </span>
                  )
                </h2>
                <p className="text-xs text-slate-500">
                  {modalTrazabilidad.marca} {modalTrazabilidad.modelo} · Categoría:{" "}
                  {modalTrazabilidad.nombre_categoria} · Lote: {modalTrazabilidad.codigo_lote}
                </p>
              </div>
              <button
                onClick={() => setModalTrazabilidad(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Línea de Tiempo */}
            <div className="space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[#274C3D] flex items-center gap-1.5">
                <Clock className="w-4 h-4 text-[#274C3D]" />
                Línea de Tiempo de Estados (HISTORIAL_ESTADOS)
              </h3>
              <div className="space-y-2.5 border-l-2 border-[#274C3D] ml-3 pl-4">
                {modalTrazabilidad.historial_estados.map((h) => (
                  <div
                    key={h.id_historial}
                    className="p-3 rounded-2xl bg-[#F8FAF9] border border-[#D6E3DC] space-y-1 text-xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-[#274C3D] bg-[#EBF2EE] px-2 py-0.5 rounded-lg border border-[#C5D8CF]">
                        #{h.id_secuencia} · {h.nombre_estado}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(h.fecha_cambio).toLocaleString()}
                      </span>
                    </div>
                    <p className="text-slate-700">{h.observacion}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Transferencias */}
            {modalTrazabilidad.transferencias.length > 0 && (
              <div className="space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#274C3D] flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-[#274C3D]" />
                  Movimientos Logísticos (TRANSFERENCIA_MOVIMIENTO)
                </h3>
                {modalTrazabilidad.transferencias.map((t) => (
                  <div
                    key={t.id_movimiento}
                    className="p-3 rounded-2xl bg-[#F8FAF9] border border-[#D6E3DC] text-xs flex items-center justify-between"
                  >
                    <div>
                      <span className="font-bold text-[#1F2925]">
                        {t.nombre_centro_origen} → {t.nombre_centro_destino}
                      </span>
                      <p className="text-[10px] text-slate-400">
                        {new Date(t.fecha_movimiento).toLocaleString()}
                      </p>
                    </div>
                    <span className="px-2 py-0.5 rounded-lg bg-[#EBF2EE] text-[#274C3D] font-bold text-[10px]">
                      {t.estado_transferencia}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Tratamiento y Evidencias */}
            {modalTrazabilidad.tratamiento && (
              <div className="p-4 rounded-3xl bg-[#EBF2EE] border border-[#C5D8CF] space-y-2">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#274C3D] flex items-center gap-1.5">
                  <CheckCircle2 className="w-4 h-4 text-[#274C3D]" />
                  Cierre de Trazabilidad (TRATAMIENTO & EVIDENCIA S3)
                </h3>
                <p className="text-xs text-[#1F2925]">
                  <strong>Resultado:</strong> {modalTrazabilidad.tratamiento.resultado}
                </p>
                <p className="text-xs text-[#1F2925]">
                  <strong>Destino Circular:</strong> {modalTrazabilidad.tratamiento.destino}
                </p>
                <div className="pt-2 flex flex-wrap gap-2">
                  {modalTrazabilidad.tratamiento.evidencias.map((ev) => (
                    <a
                      key={ev.id_evidencia}
                      href={ev.url_archivo}
                      target="_blank"
                      rel="noreferrer"
                      className="px-3 py-1.5 rounded-xl bg-white border border-[#D6E3DC] text-xs font-bold text-[#274C3D] flex items-center gap-1.5 hover:bg-[#F2F7F4]"
                    >
                      <span>
                        {ev.nombre_archivo} ({ev.tipo_archivo})
                      </span>
                      <ExternalLink className="w-3.5 h-3.5 text-[#274C3D]" />
                    </a>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2">
              <Button variant="secondary" size="sm" onClick={() => setModalTrazabilidad(null)}>
                Cerrar Ventana
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: Evaluación Técnica */}
      {modalEvaluar && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 border border-[#D6E3DC] shadow-xl">
            <h3 className="text-lg font-bold text-[#1F2925]">
              Evaluación Técnica: {modalEvaluar.num_serie}
            </h3>
            <p className="text-xs text-slate-500">
              Objeto: {modalEvaluar.nombre_objeto} ({modalEvaluar.marca} {modalEvaluar.modelo})
            </p>

            {formError && (
              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
                {formError}
              </div>
            )}

            <form onSubmit={handleGuardarEvaluacion} className="space-y-4 text-xs">
              <FormField label="Diagnóstico Técnico del Especialista">
                <textarea
                  value={diagnostico}
                  onChange={(e) => setDiagnostico(e.target.value)}
                  rows={3}
                  className="w-full px-3.5 py-2.5 bg-white border border-[#D6E3DC] text-slate-800 text-xs rounded-xl focus:border-[#274C3D] outline-none"
                  placeholder="Detalla fallas observadas, componentes funcionales..."
                  required
                />
              </FormField>

              <FormField label="Clasificación Técnica Asignada">
                <select
                  value={clasificacion}
                  onChange={(e) => setClasificacion(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-[#D6E3DC] text-slate-800 text-xs rounded-xl focus:border-[#274C3D] outline-none"
                >
                  {CLASIFICACIONES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField label="Condición Física del Catálogo">
                <select
                  value={idCondicion}
                  onChange={(e) => setIdCondicion(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 bg-white border border-[#D6E3DC] text-slate-800 text-xs rounded-xl focus:border-[#274C3D] outline-none"
                >
                  {catalogos?.condiciones.map((cond) => (
                    <option key={cond.id_condicion} value={cond.id_condicion}>
                      {cond.descripcion_condicion}
                    </option>
                  ))}
                </select>
              </FormField>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-[#EBF2EE]">
                <Button type="button" variant="secondary" size="sm" onClick={() => setModalEvaluar(null)}>
                  Cancelar
                </Button>
                <Button type="submit" variant="primary" size="sm" isLoading={submitting}>
                  Guardar Evaluación
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: Transferencia Logística */}
      {modalTransferir && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 border border-[#D6E3DC] shadow-xl">
            <h3 className="text-lg font-bold text-[#1F2925]">
              Transferir RAEE: {modalTransferir.num_serie}
            </h3>

            {formError && (
              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
                {formError}
              </div>
            )}

            <form onSubmit={handleGuardarTransferencia} className="space-y-4 text-xs">
              <FormField label="Centro de Origen">
                <select
                  value={idCentroOrigen}
                  onChange={(e) => setIdCentroOrigen(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-[#D6E3DC] text-slate-800 text-xs rounded-xl focus:border-[#274C3D] outline-none"
                >
                  {catalogos?.centros.map((c) => (
                    <option key={c.id_centro} value={c.id_centro}>
                      {c.nombre_centro} ({c.codigo_centro})
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField label="Centro de Destino (Red Logística)">
                <select
                  value={idCentroDestino}
                  onChange={(e) => setIdCentroDestino(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-[#D6E3DC] text-slate-800 text-xs rounded-xl focus:border-[#274C3D] outline-none"
                >
                  {catalogos?.centros.map((c) => (
                    <option key={c.id_centro} value={c.id_centro}>
                      {c.nombre_centro} ({c.codigo_centro})
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField label="Estado del Movimiento">
                <select
                  value={estadoTransf}
                  onChange={(e) => setEstadoTransf(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-[#D6E3DC] text-slate-800 text-xs rounded-xl focus:border-[#274C3D] outline-none"
                >
                  <option value="En Transito">En Tránsito</option>
                  <option value="Entregado">Entregado</option>
                </select>
              </FormField>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-[#EBF2EE]">
                <Button type="button" variant="secondary" size="sm" onClick={() => setModalTransferir(null)}>
                  Cancelar
                </Button>
                <Button type="submit" variant="primary" size="sm" isLoading={submitting}>
                  Registrar Movimiento
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: Cierre con Tratamiento y Evidencias S3/Local */}
      {modalCerrar && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 border border-[#D6E3DC] shadow-xl">
            <h3 className="text-lg font-bold text-[#1F2925]">
              Cierre de Ciclo Circular: {modalCerrar.num_serie}
            </h3>

            {formError && (
              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
                {formError}
              </div>
            )}

            <form onSubmit={handleGuardarCierre} className="space-y-4 text-xs">
              <FormField label="Resultado del Tratamiento / Remediación">
                <Input
                  value={resultadoTrat}
                  onChange={(e) => setResultadoTrat(e.target.value)}
                  placeholder="Certificado de Reutilización / Desensamble..."
                  required
                />
              </FormField>

              <FormField label="Destino Circular Final">
                <Input
                  value={destinoTrat}
                  onChange={(e) => setDestinoTrat(e.target.value)}
                  placeholder="Gestor autorizado, Planta de fundición..."
                  required
                />
              </FormField>

              <FormField label="Evidencia Digital (AWS S3 / Almacenamiento Local)">
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png,.docx"
                  onChange={(e) => setArchivoEvidencia(e.target.files?.[0] || null)}
                  className="w-full text-xs text-slate-600 file:mr-3 file:py-2 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-[#EBF2EE] file:text-[#274C3D] hover:file:bg-[#D6E3DC]"
                />
              </FormField>

              {!archivoEvidencia && (
                <FormField label="Tipo de Evidencia (si no adjuntas archivo)">
                  <select
                    value={tipoManual}
                    onChange={(e) => setTipoManual(e.target.value)}
                    className="w-full px-3.5 py-2.5 bg-white border border-[#D6E3DC] text-slate-800 text-xs rounded-xl focus:border-[#274C3D] outline-none"
                  >
                    <option value="PDF">PDF</option>
                    <option value="JPG">JPG</option>
                    <option value="PNG">PNG</option>
                    <option value="DOCX">DOCX</option>
                  </select>
                </FormField>
              )}

              <div className="flex justify-end gap-2.5 pt-3 border-t border-[#EBF2EE]">
                <Button type="button" variant="secondary" size="sm" onClick={() => setModalCerrar(null)}>
                  Cancelar
                </Button>
                <Button type="submit" variant="primary" size="sm" isLoading={submitting}>
                  Finalizar y Subir Evidencia
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default DispositivosPage;
