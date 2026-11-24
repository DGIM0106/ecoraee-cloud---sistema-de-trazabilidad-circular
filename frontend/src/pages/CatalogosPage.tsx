import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  FolderTree,
  PackageCheck,
  Plus,
  Pencil,
  Trash2,
  X,
  Search,
  Database,
  ShieldAlert,
  Tag,
  Cpu,
} from "lucide-react";
import apiClient from "../api/client";
import { CategoriaDTO, ObjetoDTO, UUID } from "../types";
import Button from "../components/atoms/Button";
import Input from "../components/atoms/Input";
import FormField from "../components/molecules/FormField";

const CatalogosPage: React.FC = () => {
  const [tab, setTab] = useState<"objetos" | "categorias">("objetos");
  const [categorias, setCategorias] = useState<CategoriaDTO[]>([]);
  const [objetos, setObjetos] = useState<ObjetoDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState<string | null>(null);

  // Filtros
  const [search, setSearch] = useState("");
  const [filterCat, setFilterCat] = useState<string>("");

  // Modal Categoría
  const [modalCat, setModalCat] = useState<CategoriaDTO | "NEW" | null>(null);
  const [codigoCat, setCodigoCat] = useState("");
  const [nombreCat, setNombreCat] = useState("");
  const [descCat, setDescCat] = useState("");

  // Modal Objeto
  const [modalObj, setModalObj] = useState<ObjetoDTO | "NEW" | null>(null);
  const [codigoObj, setCodigoObj] = useState("");
  const [nombreObj, setNombreObj] = useState("");
  const [marcaObj, setMarcaObj] = useState("");
  const [modeloObj, setModeloObj] = useState("");
  const [pesoObj, setPesoObj] = useState("");
  const [descObj, setDescObj] = useState("");
  const [idCatObj, setIdCatObj] = useState<UUID>("");

  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const cargarCatalogos = useCallback(async () => {
    try {
      setLoading(true);
      setPageError(null);
      const [catRes, objRes] = await Promise.all([
        apiClient.get<CategoriaDTO[]>("/catalogos/categorias"),
        apiClient.get<ObjetoDTO[]>("/catalogos/objetos"),
      ]);
      setCategorias(catRes.data);
      setObjetos(objRes.data);
    } catch (err: any) {
      console.error("Error cargando catálogos:", err);
      setPageError(
        err.response?.data?.detail ||
          "No se pudo conectar con la base de datos para cargar categorías y objetos."
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarCatalogos();
  }, [cargarCatalogos]);

  const objetosFiltrados = useMemo(() => {
    return objetos.filter((o) => {
      if (filterCat && o.id_categoria !== filterCat) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        return (
          o.codigo_objeto.toLowerCase().includes(q) ||
          o.nombre_objeto.toLowerCase().includes(q) ||
          o.marca.toLowerCase().includes(q) ||
          o.modelo.toLowerCase().includes(q) ||
          o.nombre_categoria.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [objetos, filterCat, search]);

  const categoriasFiltradas = useMemo(() => {
    if (!search.trim()) return categorias;
    const q = search.toLowerCase();
    return categorias.filter(
      (c) =>
        c.codigo_categoria.toLowerCase().includes(q) ||
        c.nombre_categoria.toLowerCase().includes(q) ||
        (c.descripcion || "").toLowerCase().includes(q)
    );
  }, [categorias, search]);

  // --- Handlers Categoría ---
  const abrirNuevaCategoria = () => {
    setFormError(null);
    setCodigoCat("");
    setNombreCat("");
    setDescCat("");
    setModalCat("NEW");
  };

  const abrirEditarCategoria = (cat: CategoriaDTO) => {
    setFormError(null);
    setCodigoCat(cat.codigo_categoria);
    setNombreCat(cat.nombre_categoria);
    setDescCat(cat.descripcion || "");
    setModalCat(cat);
  };

  const handleGuardarCategoria = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!codigoCat.trim() || !nombreCat.trim()) {
      setFormError("Código y nombre de categoría son obligatorios.");
      return;
    }
    try {
      setSubmitting(true);
      const payload = {
        codigo_categoria: codigoCat.trim().toUpperCase(),
        nombre_categoria: nombreCat.trim(),
        descripcion: descCat.trim() || null,
      };
      if (modalCat === "NEW") {
        await apiClient.post("/catalogos/categorias", payload);
      } else if (modalCat) {
        await apiClient.put(`/catalogos/categorias/${modalCat.id_categoria}`, payload);
      }
      setModalCat(null);
      await cargarCatalogos();
    } catch (err: any) {
      setFormError(err.response?.data?.detail || "Error al guardar la categoría.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEliminarCategoria = async (cat: CategoriaDTO) => {
    if (!window.confirm(`¿Eliminar la categoría "${cat.nombre_categoria}"?`)) return;
    try {
      await apiClient.delete(`/catalogos/categorias/${cat.id_categoria}`);
      await cargarCatalogos();
    } catch (err: any) {
      alert(err.response?.data?.detail || "No se pudo eliminar la categoría.");
    }
  };

  // --- Handlers Objeto ---
  const abrirNuevoObjeto = () => {
    setFormError(null);
    setCodigoObj("");
    setNombreObj("");
    setMarcaObj("");
    setModeloObj("");
    setPesoObj("");
    setDescObj("");
    setIdCatObj(categorias[0]?.id_categoria || "");
    setModalObj("NEW");
  };

  const abrirEditarObjeto = (obj: ObjetoDTO) => {
    setFormError(null);
    setCodigoObj(obj.codigo_objeto);
    setNombreObj(obj.nombre_objeto);
    setMarcaObj(obj.marca);
    setModeloObj(obj.modelo);
    setPesoObj(obj.peso_estimado_kg != null ? String(obj.peso_estimado_kg) : "");
    setDescObj(obj.descripcion || "");
    setIdCatObj(obj.id_categoria);
    setModalObj(obj);
  };

  const handleGuardarObjeto = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!codigoObj.trim() || !nombreObj.trim() || !marcaObj.trim() || !modeloObj.trim() || !idCatObj) {
      setFormError("Todos los campos principales y la categoría de BD son obligatorios.");
      return;
    }
    try {
      setSubmitting(true);
      const payload = {
        codigo_objeto: codigoObj.trim().toUpperCase(),
        nombre_objeto: nombreObj.trim(),
        marca: marcaObj.trim(),
        modelo: modeloObj.trim(),
        descripcion: descObj.trim() || null,
        peso_estimado_kg: pesoObj.trim() ? Number(pesoObj) : null,
        id_categoria: idCatObj,
      };
      if (modalObj === "NEW") {
        await apiClient.post("/catalogos/objetos", payload);
      } else if (modalObj) {
        await apiClient.put(`/catalogos/objetos/${modalObj.id_objeto}`, payload);
      }
      setModalObj(null);
      await cargarCatalogos();
    } catch (err: any) {
      setFormError(err.response?.data?.detail || "Error al guardar el objeto.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEliminarObjeto = async (obj: ObjetoDTO) => {
    if (!window.confirm(`¿Eliminar el objeto "${obj.nombre_objeto}" del catálogo?`)) return;
    try {
      await apiClient.delete(`/catalogos/objetos/${obj.id_objeto}`);
      await cargarCatalogos();
    } catch (err: any) {
      alert(err.response?.data?.detail || "No se pudo eliminar el objeto.");
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-6">
      {/* Cabecera */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#D6E3DC] shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-[#EBF2EE] text-[#274C3D] text-xs font-bold uppercase tracking-wider mb-2 border border-[#C5D8CF]">
            <Database className="w-3.5 h-3.5 text-[#274C3D]" />
            Catálogo Maestro en Base de Datos · UUID & DTOs
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#1F2925] tracking-tight">
            Gestión de Categorías y Objetos RAEE
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-2xl">
            Crea y administra aquí las categorías y los objetos electrónicos permitidos. Al registrar dispositivos RAEE solo podrán seleccionarse categorías y objetos existentes en la base de datos.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <Button
            variant="outline"
            size="sm"
            onClick={abrirNuevaCategoria}
            className="flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Nueva Categoría
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={abrirNuevoObjeto}
            disabled={categorias.length === 0}
            className="flex items-center gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Nuevo Objeto
          </Button>
        </div>
      </div>

      {pageError && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 shrink-0" />
          <span>{pageError}</span>
        </div>
      )}

      {/* Pestañas + Buscador */}
      <div className="bg-white rounded-3xl p-5 border border-[#D6E3DC] shadow-xs flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button
            onClick={() => setTab("objetos")}
            className={`px-4 py-2 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              tab === "objetos"
                ? "bg-[#274C3D] text-white shadow-xs"
                : "bg-[#F8FAF9] text-[#274C3D] border border-[#D6E3DC] hover:bg-[#EBF2EE]"
            }`}
          >
            <PackageCheck className="w-4 h-4" />
            <span>Objetos RAEE ({objetos.length})</span>
          </button>
          <button
            onClick={() => setTab("categorias")}
            className={`px-4 py-2 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer ${
              tab === "categorias"
                ? "bg-[#274C3D] text-white shadow-xs"
                : "bg-[#F8FAF9] text-[#274C3D] border border-[#D6E3DC] hover:bg-[#EBF2EE]"
            }`}
          >
            <FolderTree className="w-4 h-4" />
            <span>Categorías ({categorias.length})</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-3 flex-1 justify-end min-w-[240px]">
          <div className="relative flex-1 max-w-xs">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={
                tab === "objetos"
                  ? "Buscar objeto, marca, modelo..."
                  : "Buscar código o nombre de categoría..."
              }
              className="w-full pl-10 pr-4 py-2 bg-[#F8FAF9] border border-[#D6E3DC] text-slate-800 placeholder-slate-400 text-xs rounded-2xl outline-none focus:border-[#274C3D] focus:bg-white"
            />
          </div>

          {tab === "objetos" && (
            <select
              value={filterCat}
              onChange={(e) => setFilterCat(e.target.value)}
              className="px-3 py-2 bg-[#F8FAF9] border border-[#D6E3DC] text-slate-800 text-xs rounded-2xl outline-none focus:border-[#274C3D]"
            >
              <option value="">Todas las categorías</option>
              {categorias.map((c) => (
                <option key={c.id_categoria} value={c.id_categoria}>
                  {c.nombre_categoria}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {/* Contenido de Pestañas */}
      {loading ? (
        <div className="bg-white rounded-3xl border border-[#D6E3DC] p-12 text-center space-y-3">
          <div className="w-8 h-8 rounded-full border-3 border-[#274C3D] border-t-transparent animate-spin mx-auto" />
          <p className="text-xs font-semibold text-[#274C3D]">
            Consultando catálogos en la base de datos...
          </p>
        </div>
      ) : tab === "objetos" ? (
        <div className="bg-white rounded-3xl border border-[#D6E3DC] shadow-xs overflow-hidden">
          <div className="p-5 border-b border-[#EBF2EE] flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#1F2925] flex items-center gap-2">
              <Cpu className="w-4 h-4 text-[#274C3D]" />
              <span>Catálogo de Objetos Registrados en BD (Tabla OBJETO)</span>
            </h2>
            <span className="text-xs text-slate-500">
              {objetosFiltrados.length} objetos disponibles para selección
            </span>
          </div>

          {objetosFiltrados.length === 0 ? (
            <div className="p-12 text-center space-y-3 text-slate-500 text-xs">
              <p>No hay objetos registrados con los filtros actuales.</p>
              {categorias.length > 0 && (
                <Button variant="primary" size="sm" onClick={abrirNuevoObjeto}>
                  Crear primer objeto en BD
                </Button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#F2F7F4] text-[#274C3D] uppercase text-[10px] tracking-wider font-bold">
                  <tr>
                    <th className="py-3 px-4">Código & UUID</th>
                    <th className="py-3 px-4">Objeto</th>
                    <th className="py-3 px-4">Marca / Modelo</th>
                    <th className="py-3 px-4">Categoría (BD)</th>
                    <th className="py-3 px-4 text-right">Peso Est.</th>
                    <th className="py-3 px-4 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EBF2EE]">
                  {objetosFiltrados.map((obj) => (
                    <tr key={obj.id_objeto} className="hover:bg-[#F9FCFA]">
                      <td className="py-3 px-4">
                        <div className="font-mono font-bold text-[#274C3D]">
                          {obj.codigo_objeto}
                        </div>
                        <div className="font-mono text-[10px] text-slate-400">
                          {obj.id_objeto.slice(0, 8)}...
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-[#1F2925]">{obj.nombre_objeto}</div>
                        {obj.descripcion && (
                          <div className="text-[11px] text-slate-500 line-clamp-1 max-w-xs">
                            {obj.descripcion}
                          </div>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-700 font-medium">
                        {obj.marca} · <span className="text-slate-500">{obj.modelo}</span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-[#EBF2EE] text-[#274C3D] font-bold text-[10px] border border-[#C5D8CF]">
                          <Tag className="w-3 h-3" />
                          {obj.nombre_categoria}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-slate-600">
                        {obj.peso_estimado_kg != null ? `${obj.peso_estimado_kg} kg` : "—"}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => abrirEditarObjeto(obj)}
                            title="Editar Objeto"
                            className="p-1.5 rounded-xl text-slate-500 hover:bg-slate-100 cursor-pointer"
                          >
                            <Pencil className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleEliminarObjeto(obj)}
                            title="Eliminar Objeto"
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
      ) : (
        <div className="bg-white rounded-3xl border border-[#D6E3DC] shadow-xs overflow-hidden">
          <div className="p-5 border-b border-[#EBF2EE] flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#1F2925] flex items-center gap-2">
              <FolderTree className="w-4 h-4 text-[#274C3D]" />
              <span>Categorías RAEE Registradas en BD (Tabla CATEGORIA)</span>
            </h2>
            <span className="text-xs text-slate-500">
              {categoriasFiltradas.length} categorías activas
            </span>
          </div>

          {categoriasFiltradas.length === 0 ? (
            <div className="p-12 text-center space-y-3 text-slate-500 text-xs">
              <p>No existen categorías registradas aún.</p>
              <Button variant="primary" size="sm" onClick={abrirNuevaCategoria}>
                Crear primera categoría en BD
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-5">
              {categoriasFiltradas.map((cat) => (
                <div
                  key={cat.id_categoria}
                  className="p-5 rounded-3xl bg-[#F8FAF9] border border-[#D6E3DC] flex flex-col justify-between space-y-3 hover:border-[#274C3D] transition-all"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-bold text-[#274C3D] bg-[#EBF2EE] px-2.5 py-0.5 rounded-lg border border-[#C5D8CF]">
                        {cat.codigo_categoria}
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        UUID: {cat.id_categoria.slice(0, 8)}...
                      </span>
                    </div>
                    <h3 className="text-sm font-bold text-[#1F2925]">
                      {cat.nombre_categoria}
                    </h3>
                    <p className="text-xs text-slate-600">
                      {cat.descripcion || "Sin descripción registrada."}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-[#D6E3DC] flex items-center justify-between">
                    <span className="text-xs font-bold text-[#274C3D]">
                      {cat.total_objetos} objeto(s) asociados
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => abrirEditarCategoria(cat)}
                        title="Editar Categoría"
                        className="p-1.5 rounded-xl text-slate-500 hover:bg-white cursor-pointer"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleEliminarCategoria(cat)}
                        title="Eliminar Categoría"
                        className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL CATEGORÍA */}
      {modalCat && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 border border-[#D6E3DC] shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-[#1F2925]">
                {modalCat === "NEW" ? "Nueva Categoría en BD" : "Editar Categoría"}
              </h3>
              <button
                onClick={() => setModalCat(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
                {formError}
              </div>
            )}

            <form onSubmit={handleGuardarCategoria} className="space-y-4 text-xs">
              <FormField label="Código de Categoría (Único)">
                <Input
                  value={codigoCat}
                  onChange={(e) => setCodigoCat(e.target.value)}
                  placeholder="Ej: CAT-TIC, CAT-MED"
                  required
                />
              </FormField>

              <FormField label="Nombre de Categoría">
                <Input
                  value={nombreCat}
                  onChange={(e) => setNombreCat(e.target.value)}
                  placeholder="Ej: Equipos Informáticos y Telecomunicaciones"
                  required
                />
              </FormField>

              <FormField label="Descripción (Opcional)">
                <textarea
                  value={descCat}
                  onChange={(e) => setDescCat(e.target.value)}
                  rows={3}
                  placeholder="Detalle los tipos de residuos incluidos en esta categoría..."
                  className="w-full px-3.5 py-2.5 bg-white border border-[#D6E3DC] text-slate-800 text-xs rounded-xl focus:border-[#274C3D] outline-none"
                />
              </FormField>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-[#EBF2EE]">
                <Button type="button" variant="secondary" size="sm" onClick={() => setModalCat(null)}>
                  Cancelar
                </Button>
                <Button type="submit" variant="primary" size="sm" isLoading={submitting}>
                  Guardar Categoría
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL OBJETO */}
      {modalObj && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-5 border border-[#D6E3DC] shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-[#1F2925]">
                {modalObj === "NEW" ? "Nuevo Objeto RAEE en BD" : "Editar Objeto del Catálogo"}
              </h3>
              <button
                onClick={() => setModalObj(null)}
                className="p-1.5 text-slate-400 hover:text-slate-700 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {formError && (
              <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
                {formError}
              </div>
            )}

            <form onSubmit={handleGuardarObjeto} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <FormField label="Código de Objeto">
                  <Input
                    value={codigoObj}
                    onChange={(e) => setCodigoObj(e.target.value)}
                    placeholder="Ej: OBJ-LAP-HP840"
                    required
                  />
                </FormField>
                <FormField label="Categoría (desde BD)">
                  <select
                    value={idCatObj}
                    onChange={(e) => setIdCatObj(e.target.value)}
                    required
                    className="w-full px-3.5 py-2.5 bg-white border border-[#D6E3DC] text-slate-800 text-xs rounded-xl focus:border-[#274C3D] outline-none"
                  >
                    <option value="">Selecciona una categoría...</option>
                    {categorias.map((c) => (
                      <option key={c.id_categoria} value={c.id_categoria}>
                        {c.nombre_categoria}
                      </option>
                    ))}
                  </select>
                </FormField>
              </div>

              <FormField label="Nombre del Objeto">
                <Input
                  value={nombreObj}
                  onChange={(e) => setNombreObj(e.target.value)}
                  placeholder="Ej: Laptop HP EliteBook 840 G7"
                  required
                />
              </FormField>

              <div className="grid grid-cols-3 gap-3">
                <FormField label="Marca">
                  <Input
                    value={marcaObj}
                    onChange={(e) => setMarcaObj(e.target.value)}
                    placeholder="HP, Dell..."
                    required
                  />
                </FormField>
                <FormField label="Modelo">
                  <Input
                    value={modeloObj}
                    onChange={(e) => setModeloObj(e.target.value)}
                    placeholder="EliteBook 840"
                    required
                  />
                </FormField>
                <FormField label="Peso Est. (kg)">
                  <Input
                    type="number"
                    step="0.01"
                    min="0.01"
                    value={pesoObj}
                    onChange={(e) => setPesoObj(e.target.value)}
                    placeholder="1.50"
                  />
                </FormField>
              </div>

              <FormField label="Descripción Técnica (Opcional)">
                <textarea
                  value={descObj}
                  onChange={(e) => setDescObj(e.target.value)}
                  rows={2}
                  placeholder="Especificaciones generales del equipo..."
                  className="w-full px-3.5 py-2.5 bg-white border border-[#D6E3DC] text-slate-800 text-xs rounded-xl focus:border-[#274C3D] outline-none"
                />
              </FormField>

              <div className="flex justify-end gap-2.5 pt-3 border-t border-[#EBF2EE]">
                <Button type="button" variant="secondary" size="sm" onClick={() => setModalObj(null)}>
                  Cancelar
                </Button>
                <Button type="submit" variant="primary" size="sm" isLoading={submitting}>
                  Guardar Objeto en BD
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default CatalogosPage;
