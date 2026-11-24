import React, { useEffect, useState, useCallback } from "react";
import {
  Network,
  Play,
  Plus,
  GitBranch,
  Flame,
  Binary,
  ArrowRight,
  ShieldAlert,
} from "lucide-react";
import apiClient from "../api/client";
import { CentroDTO, GrafoResumenDTO, MaxFlowResponseDTO, UUID } from "../types";
import Button from "../components/atoms/Button";
import Input from "../components/atoms/Input";
import FormField from "../components/molecules/FormField";

const RedFlujoPage: React.FC = () => {
  const [grafoData, setGrafoData] = useState<GrafoResumenDTO | null>(null);
  const [centros, setCentros] = useState<CentroDTO[]>([]);
  const [simulacionActiva, setSimulacionActiva] = useState<MaxFlowResponseDTO | null>(null);
  const [loading, setLoading] = useState(true);
  const [simulando, setSimulando] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [nodoOrigen, setNodoOrigen] = useState<UUID>("");
  const [nodoSumidero, setNodoSumidero] = useState<UUID>("");
  const [factorCap, setFactorCap] = useState<number>(1.0);

  const [modalNodo, setModalNodo] = useState(false);
  const [modalArista, setModalArista] = useState(false);

  const [idCentroNodo, setIdCentroNodo] = useState<UUID>("");
  const [tipoNodo, setTipoNodo] = useState("ORIGEN_ACOPIO");
  const [capNodo, setCapNodo] = useState<number>(45);

  const [aristaOrig, setAristaOrig] = useState<UUID>("");
  const [aristaDest, setAristaDest] = useState<UUID>("");
  const [distKm, setDistKm] = useState<number>(32.5);
  const [tiempoMin, setTiempoMin] = useState<number>(50);

  const cargarRed = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const [grafoRes, catRes] = await Promise.all([
        apiClient.get<GrafoResumenDTO>("/red/grafo"),
        apiClient.get("/catalogos/resumen"),
      ]);
      setGrafoData(grafoRes.data);
      setSimulacionActiva(grafoRes.data.analisis_flujo_actual);
      const loadedCentros: CentroDTO[] = catRes.data.centros || [];
      setCentros(loadedCentros);

      if (grafoRes.data.nodos.length > 0) {
        const first = grafoRes.data.nodos[0].id_nodo;
        const last = grafoRes.data.nodos[grafoRes.data.nodos.length - 1].id_nodo;
        setNodoOrigen((prev) => prev || first);
        setNodoSumidero((prev) => prev || last);
        setAristaOrig((prev) => prev || first);
        setAristaDest((prev) => prev || last);
      }
      if (loadedCentros.length > 0) {
        setIdCentroNodo((prev) => prev || loadedCentros[0].id_centro);
      }
    } catch (err) {
      console.error("Error cargando grafo de red:", err);
      setErrorMsg("No se pudo cargar la red logística desde la base de datos.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarRed();
  }, [cargarRed]);

  const ejecutarSimulacion = async () => {
    try {
      setSimulando(true);
      const res = await apiClient.post<MaxFlowResponseDTO>("/red/flujo-maximo", {
        id_nodo_origen: nodoOrigen || null,
        id_nodo_sumidero: nodoSumidero || null,
        factor_capacidad: factorCap,
      });
      setSimulacionActiva(res.data);
    } catch (err: any) {
      alert(err.response?.data?.detail || "Error al ejecutar la simulación de flujo máximo.");
    } finally {
      setSimulando(false);
    }
  };

  const handleCrearNodo = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiClient.post("/red/nodos", {
        id_centro: idCentroNodo || null,
        tipo_nodo: tipoNodo,
        capacidad_nodo: capNodo,
      });
      setModalNodo(false);
      await cargarRed();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Error al registrar el nodo.");
    }
  };

  const handleCrearArista = async (e: React.FormEvent) => {
    e.preventDefault();
    if (aristaOrig === aristaDest) {
      alert("El nodo origen y destino no pueden ser iguales.");
      return;
    }
    try {
      await apiClient.post("/red/aristas", {
        id_nodo_origen: aristaOrig,
        id_nodo_destino: aristaDest,
        distancia_km: distKm,
        tiempo_estimado_min: tiempoMin,
      });
      setModalArista(false);
      await cargarRed();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Error al registrar la ruta logística.");
    }
  };

  const cuellosBotella =
    simulacionActiva?.flujo_por_arista?.filter((a) => a.saturada || a.en_corte_minimo) || [];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Header */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#D6E3DC] shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-[#EBF2EE] text-[#274C3D] text-xs font-bold uppercase tracking-wider mb-2 border border-[#C5D8CF]">
            <Binary className="w-3.5 h-3.5 text-[#274C3D]" />
            Matemática Discreta · Algoritmo Edmonds-Karp & Redes UUID
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#1F2925] tracking-tight">
            Modelo Matemático de Flujo Máximo Logístico
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-2xl">
            Simulación de transporte y capacidades de carga entre centros de acopio y plantas de destino con cálculo de cuellos de botella y corte mínimo (Min-Cut).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setModalNodo(true)}
            className="flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Nuevo Nodo
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setModalArista(true)}
            className="flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Nueva Ruta (Arista)
          </Button>
        </div>
      </div>

      {/* Simulador */}
      <div className="bg-white rounded-3xl p-6 border border-[#D6E3DC] shadow-xs space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-[#EBF2EE] pb-4">
          <div>
            <h2 className="text-base font-bold text-[#1F2925] flex items-center gap-2">
              <Play className="w-5 h-5 text-[#274C3D]" />
              <span>Simulador de Capacidad de Flujo Logístico</span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Determina el cuello de botella crítico entre un origen de acopio y una planta de destino circular.
            </p>
          </div>
          <Button
            variant="primary"
            size="sm"
            onClick={ejecutarSimulacion}
            isLoading={simulando}
            className="flex items-center gap-2 self-start sm:self-auto"
          >
            <Play className="w-4 h-4" />
            <span>Ejecutar Edmonds-Karp</span>
          </Button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <FormField label="Nodo Origen (Fuente)">
            <select
              value={nodoOrigen}
              onChange={(e) => setNodoOrigen(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border border-[#D6E3DC] text-slate-800 text-xs rounded-xl focus:border-[#274C3D] outline-none"
            >
              {grafoData?.nodos?.map((n) => (
                <option key={n.id_nodo} value={n.id_nodo}>
                  {n.nombre_centro} ({n.codigo_centro})
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Nodo Destino (Sumidero)">
            <select
              value={nodoSumidero}
              onChange={(e) => setNodoSumidero(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-white border border-[#D6E3DC] text-slate-800 text-xs rounded-xl focus:border-[#274C3D] outline-none"
            >
              {grafoData?.nodos?.map((n) => (
                <option key={n.id_nodo} value={n.id_nodo}>
                  {n.nombre_centro} ({n.codigo_centro})
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Factor de Capacidad / Escenario">
            <select
              value={factorCap}
              onChange={(e) => setFactorCap(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 bg-white border border-[#D6E3DC] text-slate-800 text-xs rounded-xl focus:border-[#274C3D] outline-none"
            >
              <option value={1.0}>1.0x - Capacidad Nominal Regular</option>
              <option value={1.35}>1.35x - Campaña Pico de Reciclaje (+35%)</option>
              <option value={0.7}>0.70x - Mantenimiento Vial / Flota Reducida (-30%)</option>
            </select>
          </FormField>
        </div>

        {simulacionActiva && (
          <div className="p-6 rounded-3xl bg-[#F2F7F4] border border-[#C5D8CF] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#274C3D] bg-white px-2.5 py-0.5 rounded-lg border border-[#C5D8CF]">
                  Resultado Teorema Max-Flow / Min-Cut
                </span>
                <div className="text-3xl font-black text-[#274C3D] mt-1">
                  {simulacionActiva.flujo_maximo}{" "}
                  <span className="text-base font-bold text-slate-600">Toneladas / Periodo</span>
                </div>
              </div>
              <div className="text-xs text-slate-600 bg-white p-3 rounded-2xl border border-[#D6E3DC] max-w-xs">
                <span className="font-bold text-[#274C3D] block mb-1">
                  Corte Mínimo: {simulacionActiva.corte_minimo.capacidad_corte} Ton
                </span>
                <span>Capacidad máxima transferible antes de saturación de aristas.</span>
              </div>
            </div>

            {cuellosBotella.length > 0 && (
              <div className="space-y-2">
                <span className="text-xs font-bold text-[#274C3D] flex items-center gap-1.5 uppercase tracking-wider">
                  <Flame className="w-4 h-4 text-amber-600" />
                  Rutas Críticas Saturadas / Corte Mínimo
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {cuellosBotella.map((cb) => (
                    <div
                      key={cb.id_arista}
                      className="p-3 rounded-2xl bg-white border border-[#D6E3DC] text-xs flex items-center justify-between gap-2"
                    >
                      <div className="font-bold text-[#1F2925] flex items-center gap-1.5 truncate">
                        <span className="truncate">{cb.nombre_origen}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-[#274C3D] shrink-0" />
                        <span className="truncate">{cb.nombre_destino}</span>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-lg bg-rose-50 text-rose-800 font-bold text-[10px] border border-rose-200 shrink-0">
                        {cb.flujo} / {cb.capacidad} Ton
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tablas de Nodos y Aristas en BD */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-3xl p-6 border border-[#D6E3DC] shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Network className="w-5 h-5 text-[#274C3D]" />
              <h2 className="text-base font-bold text-[#1F2925]">Nodos de Red (NODO)</h2>
            </div>
            <span className="text-xs text-slate-500">{grafoData?.nodos.length || 0} Nodos</span>
          </div>
          {loading ? (
            <p className="text-xs text-slate-500">Cargando nodos...</p>
          ) : (
            <div className="space-y-2">
              {grafoData?.nodos.map((n) => (
                <div
                  key={n.id_nodo}
                  className="p-3 rounded-2xl bg-[#F8FAF9] border border-[#D6E3DC] text-xs flex items-center justify-between"
                >
                  <div>
                    <p className="font-bold text-[#1F2925]">{n.nombre_centro}</p>
                    <p className="text-[10px] text-slate-500 font-mono">
                      {n.tipo_nodo} · {n.id_nodo.slice(0, 8)}...
                    </p>
                  </div>
                  <span className="font-bold text-[#274C3D] bg-[#EBF2EE] px-2.5 py-1 rounded-xl">
                    {n.capacidad_nodo} Ton
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-3xl p-6 border border-[#D6E3DC] shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <GitBranch className="w-5 h-5 text-[#274C3D]" />
              <h2 className="text-base font-bold text-[#1F2925]">Rutas Dirigidas (ARISTA)</h2>
            </div>
            <span className="text-xs text-slate-500">{grafoData?.aristas.length || 0} Rutas</span>
          </div>
          <div className="space-y-2">
            {grafoData?.aristas.map((a) => (
              <div
                key={a.id_arista}
                className="p-3 rounded-2xl bg-[#F8FAF9] border border-[#D6E3DC] text-xs flex items-center justify-between gap-2"
              >
                <div className="font-semibold text-[#1F2925] truncate">
                  {a.nombre_origen} <ArrowRight className="w-3 h-3 inline text-[#274C3D] mx-1" />{" "}
                  {a.nombre_destino}
                </div>
                <span className="font-mono text-[11px] text-[#274C3D] shrink-0">
                  {a.distancia_km} km · {a.tiempo_estimado_min} min
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Reglas Formalizadas */}
      {grafoData?.reglas_discretas && grafoData.reglas_discretas.length > 0 && (
        <div className="bg-white rounded-3xl p-6 border border-[#D6E3DC] shadow-xs space-y-4">
          <div className="flex items-center gap-2">
            <GitBranch className="w-5 h-5 text-[#274C3D]" />
            <h2 className="text-base font-bold text-[#1F2925]">
              Reglas de Negocio Formalizadas (Matemática Discreta)
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            {grafoData.reglas_discretas.map((r) => (
              <div
                key={r.codigo}
                className="p-4 rounded-2xl bg-[#F8FAF9] border border-[#D6E3DC] space-y-1.5"
              >
                <span className="font-bold text-[#274C3D] block uppercase">
                  {r.codigo}: {r.titulo}
                </span>
                <div className="font-mono bg-white p-2 rounded-xl border border-[#D6E3DC] text-[11px] text-[#274C3D] font-bold">
                  {r.formula}
                </div>
                <p className="text-[11px] text-slate-600">{r.implementacion_sql_api}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* MODAL 1: Nuevo Nodo */}
      {modalNodo && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 border border-[#D6E3DC] shadow-xl">
            <h3 className="text-lg font-bold text-[#1F2925]">Registrar Nuevo Nodo de Red</h3>
            <form onSubmit={handleCrearNodo} className="space-y-4 text-xs">
              <FormField label="Centro Asociado">
                <select
                  value={idCentroNodo}
                  onChange={(e) => setIdCentroNodo(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-[#D6E3DC] text-slate-800 text-xs rounded-xl focus:border-[#274C3D] outline-none"
                >
                  {centros.map((c) => (
                    <option key={c.id_centro} value={c.id_centro}>
                      {c.nombre_centro} ({c.codigo_centro})
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField label="Tipo de Nodo">
                <select
                  value={tipoNodo}
                  onChange={(e) => setTipoNodo(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-[#D6E3DC] text-slate-800 text-xs rounded-xl focus:border-[#274C3D] outline-none"
                >
                  <option value="ORIGEN_ACOPIO">ORIGEN_ACOPIO</option>
                  <option value="INTERMEDIO_CLASIFICACION">INTERMEDIO_CLASIFICACION</option>
                  <option value="SUMIDERO_CIRCULAR">SUMIDERO_CIRCULAR</option>
                  <option value="SUMIDERO_DISPOSICION">SUMIDERO_DISPOSICION</option>
                </select>
              </FormField>

              <FormField label="Capacidad de Procesamiento (Ton)">
                <Input
                  type="number"
                  step="0.5"
                  min="1"
                  value={capNodo}
                  onChange={(e) => setCapNodo(Number(e.target.value))}
                  required
                />
              </FormField>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-[#EBF2EE]">
                <Button type="button" variant="secondary" size="sm" onClick={() => setModalNodo(false)}>
                  Cancelar
                </Button>
                <Button type="submit" variant="primary" size="sm">
                  Guardar Nodo
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Nueva Arista */}
      {modalArista && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 border border-[#D6E3DC] shadow-xl">
            <h3 className="text-lg font-bold text-[#1F2925]">
              Registrar Nueva Ruta (Arista Dirigida)
            </h3>
            <form onSubmit={handleCrearArista} className="space-y-4 text-xs">
              <FormField label="Nodo Origen (Salida)">
                <select
                  value={aristaOrig}
                  onChange={(e) => setAristaOrig(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-[#D6E3DC] text-slate-800 text-xs rounded-xl focus:border-[#274C3D] outline-none"
                >
                  {grafoData?.nodos?.map((n) => (
                    <option key={n.id_nodo} value={n.id_nodo}>
                      {n.nombre_centro} ({n.codigo_centro})
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField label="Nodo Destino (Llegada)">
                <select
                  value={aristaDest}
                  onChange={(e) => setAristaDest(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-white border border-[#D6E3DC] text-slate-800 text-xs rounded-xl focus:border-[#274C3D] outline-none"
                >
                  {grafoData?.nodos?.map((n) => (
                    <option key={n.id_nodo} value={n.id_nodo}>
                      {n.nombre_centro} ({n.codigo_centro})
                    </option>
                  ))}
                </select>
              </FormField>

              <div className="grid grid-cols-2 gap-3">
                <FormField label="Distancia (km)">
                  <Input
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={distKm}
                    onChange={(e) => setDistKm(Number(e.target.value))}
                    required
                  />
                </FormField>
                <FormField label="Tiempo Estimado (Min)">
                  <Input
                    type="number"
                    min="1"
                    value={tiempoMin}
                    onChange={(e) => setTiempoMin(Number(e.target.value))}
                    required
                  />
                </FormField>
              </div>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-[#EBF2EE]">
                <Button type="button" variant="secondary" size="sm" onClick={() => setModalArista(false)}>
                  Cancelar
                </Button>
                <Button type="submit" variant="primary" size="sm">
                  Guardar Ruta
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default RedFlujoPage;
