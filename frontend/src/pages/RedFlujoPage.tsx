import React, { useEffect, useState, useCallback } from "react";
import {
  Network,
  Play,
  Plus,
  GitBranch,
  Flame,
  CheckCircle2,
  Binary,
  Layers,
  ArrowRight,
} from "lucide-react";
import apiClient from "../api/client";
import Button from "../components/atoms/Button";
import Input from "../components/atoms/Input";
import FormField from "../components/molecules/FormField";

const RedFlujoPage: React.FC = () => {
  const [grafoData, setGrafoData] = useState<any>(null);
  const [simulacionActiva, setSimulacionActiva] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [simulando, setSimulando] = useState(false);

  // Parámetros del simulador Edmonds-Karp
  const [nodoOrigen, setNodoOrigen] = useState<number>(1);
  const [nodoSumidero, setNodoSumidero] = useState<number>(4);
  const [factorCap, setFactorCap] = useState<number>(1.0);

  // Modales
  const [modalNodo, setModalNodo] = useState(false);
  const [modalArista, setModalArista] = useState(false);

  // Nuevo Nodo
  const [idCentroNodo, setIdCentroNodo] = useState<number>(1);
  const [tipoNodo, setTipoNodo] = useState("ORIGEN_ACOPIO");
  const [capNodo, setCapNodo] = useState<number>(45);

  // Nueva Arista
  const [aristaOrig, setAristaOrig] = useState<number>(1);
  const [aristaDest, setAristaDest] = useState<number>(3);
  const [distKm, setDistKm] = useState<number>(32.5);
  const [tiempoMin, setTiempoMin] = useState<number>(50);
  const [capFlujoTon, setCapFlujoTon] = useState<number>(30.0);

  const cargarRed = useCallback(async () => {
    try {
      setLoading(true);
      const res = await apiClient.get("/red/grafo");
      setGrafoData(res.data);
    } catch (err) {
      console.error("Error cargando grafo de red:", err);
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
      const res = await apiClient.post("/red/simulacion-max-flow", {
        nodo_origen: nodoOrigen,
        nodo_sumidero: nodoSumidero,
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
        id_centro: idCentroNodo,
        tipo_nodo: tipoNodo,
        capacidad_procesamiento_ton: capNodo,
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
        capacidad_flujo_ton: capFlujoTon,
        tiempo_estimado_min: tiempoMin,
      });
      setModalArista(false);
      await cargarRed();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Error al registrar la ruta logística.");
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      {/* Header */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#D6E3DC] shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-[#EBF2EE] text-[#274C3D] text-xs font-bold uppercase tracking-wider mb-2 border border-[#C5D8CF]">
            <Binary className="w-3.5 h-3.5 text-[#274C3D]" />
            Matemática Discreta · Algoritmo Edmonds-Karp & Redes Dirigidas
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

      {/* Panel del Simulador Edmonds-Karp */}
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
              onChange={(e) => setNodoOrigen(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 bg-white border border-[#D6E3DC] text-slate-800 text-xs rounded-xl focus:border-[#274C3D] outline-none"
            >
              {grafoData?.nodos?.map((n: any) => (
                <option key={n.id_nodo} value={n.id_nodo}>
                  {n.nombre_centro} ({n.codigo_centro})
                </option>
              ))}
            </select>
          </FormField>

          <FormField label="Nodo Destino (Sumidero)">
            <select
              value={nodoSumidero}
              onChange={(e) => setNodoSumidero(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 bg-white border border-[#D6E3DC] text-slate-800 text-xs rounded-xl focus:border-[#274C3D] outline-none"
            >
              {grafoData?.nodos?.map((n: any) => (
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
              <option value={1.25}>1.25x - Campaña Pico de Reciclaje (+25%)</option>
              <option value={0.75}>0.75x - Mantenimiento Vial / Flota Reducida (-25%)</option>
            </select>
          </FormField>
        </div>

        {/* Resultados de la Simulación */}
        {simulacionActiva && (
          <div className="p-6 rounded-3xl bg-[#F2F7F4] border border-[#C5D8CF] space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-[#274C3D] bg-white px-2.5 py-0.5 rounded-lg border border-[#C5D8CF]">
                  Resultado Teorema Max-Flow / Min-Cut
                </span>
                <div className="text-3xl font-black text-[#274C3D] mt-1">
                  {simulacionActiva.flujo_maximo} <span className="text-base font-bold text-slate-600">Toneladas / Semana</span>
                </div>
              </div>
              <div className="text-xs text-slate-600 bg-white p-3 rounded-2xl border border-[#D6E3DC] max-w-xs">
                <span className="font-bold text-[#274C3D] block mb-1">Corte Mínimo (Min-Cut):</span>
                <span>Capacidad máxima transferible antes de saturación de aristas.</span>
              </div>
            </div>

            {/* Cuellos de Botella */}
            {simulacionActiva.cuellos_botella && (
              <div className="space-y-2">
                <span className="text-xs font-bold text-[#274C3D] flex items-center gap-1.5 uppercase tracking-wider">
                  <Flame className="w-4 h-4 text-amber-600" />
                  Rutas Críticas Saturadas (Cuellos de Botella)
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {simulacionActiva.cuellos_botella.map((cb: any, i: number) => (
                    <div
                      key={i}
                      className="p-3 rounded-2xl bg-white border border-[#D6E3DC] text-xs flex items-center justify-between"
                    >
                      <div className="font-bold text-[#1F2925] flex items-center gap-1.5">
                        <span>{cb.origen}</span>
                        <ArrowRight className="w-3.5 h-3.5 text-[#274C3D]" />
                        <span>{cb.destino}</span>
                      </div>
                      <span className="px-2.5 py-0.5 rounded-lg bg-rose-50 text-rose-800 font-bold text-[10px] border border-rose-200">
                        Saturada: {cb.flujo} / {cb.capacidad} Ton
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Representación Visual del Grafo Dirigido (SVG) */}
      <div className="bg-white rounded-3xl p-6 border border-[#D6E3DC] shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Network className="w-5 h-5 text-[#274C3D]" />
            <h2 className="text-base font-bold text-[#1F2925]">
              Topología de la Red de Centros (Grafo Dirigido G=(V,E))
            </h2>
          </div>
          <span className="text-xs text-slate-500">
            {grafoData?.nodos?.length || 5} Nodos · {grafoData?.aristas?.length || 5} Aristas Dirigidas
          </span>
        </div>

        {/* Lienzo SVG del Grafo */}
        <div className="w-full bg-[#F8FAF9] rounded-3xl p-6 border border-[#D6E3DC] overflow-x-auto">
          <svg className="w-full min-w-[700px] h-[320px]" viewBox="0 0 800 320">
            {/* Definición de Marcador Flecha */}
            <defs>
              <marker
                id="arrow"
                viewBox="0 0 10 10"
                refX="22"
                refY="5"
                markerWidth="6"
                markerHeight="6"
                orient="auto-start-reverse"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" fill="#274C3D" />
              </marker>
            </defs>

            {/* Aristas con líneas y flechas */}
            <line x1="140" y1="100" x2="400" y2="160" stroke="#274C3D" strokeWidth="2.5" markerEnd="url(#arrow)" />
            <line x1="140" y1="220" x2="400" y2="160" stroke="#274C3D" strokeWidth="2.5" markerEnd="url(#arrow)" />
            <line x1="400" y1="160" x2="660" y2="100" stroke="#274C3D" strokeWidth="2.5" markerEnd="url(#arrow)" />
            <line x1="400" y1="160" x2="660" y2="220" stroke="#274C3D" strokeWidth="2.5" markerEnd="url(#arrow)" />
            <line x1="140" y1="100" x2="660" y2="100" stroke="#274C3D" strokeWidth="1.5" strokeDasharray="5,5" markerEnd="url(#arrow)" />

            {/* Etiquetas de capacidad en las aristas */}
            <text x="260" y="120" fontSize="11" fill="#527063" fontWeight="bold">35 Ton (18.5 km)</text>
            <text x="260" y="205" fontSize="11" fill="#527063" fontWeight="bold">40 Ton (28 km)</text>
            <text x="520" y="120" fontSize="11" fill="#527063" fontWeight="bold">25 Ton (22 km)</text>
            <text x="520" y="205" fontSize="11" fill="#527063" fontWeight="bold">45 Ton (32.5 km)</text>

            {/* Nodo 1: Acopio Norte */}
            <g transform="translate(140, 100)">
              <circle r="36" fill="#FFFFFF" stroke="#274C3D" strokeWidth="3" />
              <text textAnchor="middle" y="-4" fontSize="11" fontWeight="bold" fill="#1F2925">C-NOR-01</text>
              <text textAnchor="middle" y="12" fontSize="9" fill="#527063">Acopio Norte</text>
            </g>

            {/* Nodo 2: Acopio Sur */}
            <g transform="translate(140, 220)">
              <circle r="36" fill="#FFFFFF" stroke="#274C3D" strokeWidth="3" />
              <text textAnchor="middle" y="-4" fontSize="11" fontWeight="bold" fill="#1F2925">C-SUR-02</text>
              <text textAnchor="middle" y="12" fontSize="9" fill="#527063">Acopio Sur</text>
            </g>

            {/* Nodo 3: Clasificación Calderón */}
            <g transform="translate(400, 160)">
              <circle r="42" fill="#EBF2EE" stroke="#274C3D" strokeWidth="3.5" />
              <text textAnchor="middle" y="-4" fontSize="12" fontWeight="black" fill="#274C3D">C-CLA-03</text>
              <text textAnchor="middle" y="12" fontSize="9" fontWeight="bold" fill="#1F2925">Clasificación</text>
            </g>

            {/* Nodo 4: Taller Reacondicionamiento */}
            <g transform="translate(660, 100)">
              <circle r="36" fill="#FFFFFF" stroke="#274C3D" strokeWidth="3" />
              <text textAnchor="middle" y="-4" fontSize="11" fontWeight="bold" fill="#1F2925">T-REA-04</text>
              <text textAnchor="middle" y="12" fontSize="9" fill="#527063">Recondicion.</text>
            </g>

            {/* Nodo 5: Complejo Reciclaje Pifo */}
            <g transform="translate(660, 220)">
              <circle r="36" fill="#FFFFFF" stroke="#274C3D" strokeWidth="3" />
              <text textAnchor="middle" y="-4" fontSize="11" fontWeight="bold" fill="#1F2925">P-REC-05</text>
              <text textAnchor="middle" y="12" fontSize="9" fill="#527063">Reciclaje Pifo</text>
            </g>
          </svg>
        </div>
      </div>

      {/* Reglas de Negocio Formalizadas de Matemática Discreta */}
      <div className="bg-white rounded-3xl p-6 border border-[#D6E3DC] shadow-xs space-y-4">
        <div className="flex items-center gap-2">
          <GitBranch className="w-5 h-5 text-[#274C3D]" />
          <h2 className="text-base font-bold text-[#1F2925]">
            Formalización de Reglas de Matemática Discreta (RF-MD-01..05)
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
          <div className="p-4 rounded-2xl bg-[#F8FAF9] border border-[#D6E3DC] space-y-1.5">
            <span className="font-bold text-[#274C3D] block uppercase">
              RF-MD-01: Conservación de Flujo en Red
            </span>
            <p className="text-slate-600">
              Para todo nodo intermedio de clasificación (excluyendo fuente y sumidero), la sumatoria del flujo entrante es estrictamente igual a la sumatoria del flujo saliente:
            </p>
            <div className="font-mono bg-white p-2 rounded-xl border border-[#D6E3DC] text-[11px] text-[#274C3D] font-bold">
              Σ f(u, v) = Σ f(v, w)
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#F8FAF9] border border-[#D6E3DC] space-y-1.5">
            <span className="font-bold text-[#274C3D] block uppercase">
              RF-MD-02: Restricción de Capacidad Logística
            </span>
            <p className="text-slate-600">
              El flujo asignado a cada ruta de transporte no excede la capacidad nominal máxima permitida por la flota disponible:
            </p>
            <div className="font-mono bg-white p-2 rounded-xl border border-[#D6E3DC] text-[11px] text-[#274C3D] font-bold">
              0 ≤ f(u, v) ≤ c(u, v) , ∀(u, v) ∈ E
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#F8FAF9] border border-[#D6E3DC] space-y-1.5">
            <span className="font-bold text-[#274C3D] block uppercase">
              RF-MD-03: Teorema de Flujo Máximo / Corte Mínimo
            </span>
            <p className="text-slate-600">
              El valor del flujo máximo alcanzable desde los centros de acopio fuente hacia las plantas finales coincide con la capacidad del corte mínimo (bottleneck limitante).
            </p>
            <div className="font-mono bg-white p-2 rounded-xl border border-[#D6E3DC] text-[11px] text-[#274C3D] font-bold">
              Max Flow |f| = Min Cut Capacity C(S, T)
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#F8FAF9] border border-[#D6E3DC] space-y-1.5">
            <span className="font-bold text-[#274C3D] block uppercase">
              RF-MD-04: Aciclicidad Estricta en Custodia
            </span>
            <p className="text-slate-600">
              Un lote procesado o cerrado no puede regresar a un centro de acopio primario; el grafo logístico preserva un orden topológico acíclico orientado (DAG).
            </p>
            <div className="font-mono bg-white p-2 rounded-xl border border-[#D6E3DC] text-[11px] text-[#274C3D] font-bold">
              Ciclo_Dirigido(G) = ∅ (Acíclico)
            </div>
          </div>
        </div>
      </div>

      {/* MODAL 1: Nuevo Nodo */}
      {modalNodo && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 border border-[#D6E3DC] shadow-xl">
            <h3 className="text-lg font-bold text-[#1F2925]">
              Registrar Nuevo Nodo de Red
            </h3>
            <form onSubmit={handleCrearNodo} className="space-y-4 text-xs">
              <FormField label="Centro Asociado">
                <select
                  value={idCentroNodo}
                  onChange={(e) => setIdCentroNodo(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-white border border-[#D6E3DC] text-slate-800 text-xs rounded-xl focus:border-[#274C3D] outline-none"
                >
                  {grafoData?.nodos?.map((n: any) => (
                    <option key={n.id_nodo} value={n.id_centro}>
                      {n.nombre_centro} ({n.codigo_centro})
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

              <FormField label="Capacidad de Procesamiento (Ton/Semana)">
                <Input
                  type="number"
                  value={capNodo}
                  onChange={(e) => setCapNodo(Number(e.target.value))}
                  required
                />
              </FormField>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-[#EBF2EE]">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setModalNodo(false)}
                >
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
                  onChange={(e) => setAristaOrig(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-white border border-[#D6E3DC] text-slate-800 text-xs rounded-xl focus:border-[#274C3D] outline-none"
                >
                  {grafoData?.nodos?.map((n: any) => (
                    <option key={n.id_nodo} value={n.id_nodo}>
                      {n.nombre_centro} ({n.codigo_centro})
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField label="Nodo Destino (Llegada)">
                <select
                  value={aristaDest}
                  onChange={(e) => setAristaDest(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-white border border-[#D6E3DC] text-slate-800 text-xs rounded-xl focus:border-[#274C3D] outline-none"
                >
                  {grafoData?.nodos?.map((n: any) => (
                    <option key={n.id_nodo} value={n.id_nodo}>
                      {n.nombre_centro} ({n.codigo_centro})
                    </option>
                  ))}
                </select>
              </FormField>

              <div className="grid grid-cols-2 gap-3">
                <FormField label="Capacidad (Ton)">
                  <Input
                    type="number"
                    value={capFlujoTon}
                    onChange={(e) => setCapFlujoTon(Number(e.target.value))}
                    required
                  />
                </FormField>
                <FormField label="Distancia (km)">
                  <Input
                    type="number"
                    value={distKm}
                    onChange={(e) => setDistKm(Number(e.target.value))}
                    required
                  />
                </FormField>
              </div>

              <FormField label="Tiempo Estimado (Minutos)">
                <Input
                  type="number"
                  value={tiempoMin}
                  onChange={(e) => setTiempoMin(Number(e.target.value))}
                  required
                />
              </FormField>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-[#EBF2EE]">
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={() => setModalArista(false)}
                >
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
