import React, { useEffect, useState, useCallback } from "react";
import { Users, Building2, Shield, Plus, ShieldAlert } from "lucide-react";
import apiClient from "../api/client";
import { UserDTO, OrganizacionDTO, RolDTO, UUID } from "../types";
import Button from "../components/atoms/Button";
import Input from "../components/atoms/Input";
import FormField from "../components/molecules/FormField";
import Avatar from "../components/atoms/Avatar";

const UsuariosOrgPage: React.FC = () => {
  const [usuarios, setUsuarios] = useState<UserDTO[]>([]);
  const [organizaciones, setOrganizaciones] = useState<OrganizacionDTO[]>([]);
  const [roles, setRoles] = useState<RolDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [modalOrg, setModalOrg] = useState(false);
  const [modalUser, setModalUser] = useState(false);

  const [ruc, setRuc] = useState("");
  const [razonSocial, setRazonSocial] = useState("");
  const [direccionOrg, setDireccionOrg] = useState("");

  const [nombreUser, setNombreUser] = useState("");
  const [correoUser, setCorreoUser] = useState("");
  const [idOrgUser, setIdOrgUser] = useState<UUID>("");
  const [idRolUser, setIdRolUser] = useState<UUID>("");

  const cargarTodo = useCallback(async () => {
    try {
      setLoading(true);
      setErrorMsg(null);
      const [uRes, oRes, rRes] = await Promise.all([
        apiClient.get<UserDTO[]>("/auth/users"),
        apiClient.get<OrganizacionDTO[]>("/auth/organizaciones"),
        apiClient.get<RolDTO[]>("/auth/roles"),
      ]);
      setUsuarios(uRes.data);
      setOrganizaciones(oRes.data);
      setRoles(rRes.data);
      if (oRes.data.length > 0) setIdOrgUser((p) => p || oRes.data[0].id_organizacion);
      if (rRes.data.length > 0) setIdRolUser((p) => p || rRes.data[0].id_rol);
    } catch (err) {
      console.error(err);
      setErrorMsg("Error cargando el directorio de usuarios y organizaciones desde la BD.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    cargarTodo();
  }, [cargarTodo]);

  const handleCrearOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (ruc.trim().length !== 13 || !/^\d+$/.test(ruc.trim())) {
      alert("El RUC en Ecuador debe contener exactamente 13 dígitos numéricos válidos.");
      return;
    }
    if (!razonSocial.trim()) {
      alert("La razón social es obligatoria.");
      return;
    }
    try {
      await apiClient.post("/auth/organizaciones", {
        ruc: ruc.trim(),
        razon_social: razonSocial.trim(),
        direccion: direccionOrg.trim() || "Quito, Ecuador",
      });
      setModalOrg(false);
      setRuc("");
      setRazonSocial("");
      setDireccionOrg("");
      await cargarTodo();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Error al registrar la organización.");
    }
  };

  const handleCrearUsuario = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombreUser.trim() || !correoUser.trim() || !idOrgUser || !idRolUser) {
      alert("Todos los campos son obligatorios.");
      return;
    }
    try {
      await apiClient.post("/auth/users", {
        nombre: nombreUser.trim(),
        correo: correoUser.trim(),
        id_organizacion: idOrgUser,
        id_rol: idRolUser,
      });
      setModalUser(false);
      setNombreUser("");
      setCorreoUser("");
      await cargarTodo();
    } catch (err: any) {
      alert(err.response?.data?.detail || "Error al registrar el usuario.");
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8 space-y-8">
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#D6E3DC] shadow-xs flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-xl bg-[#EBF2EE] text-[#274C3D] text-xs font-bold uppercase tracking-wider mb-2 border border-[#C5D8CF]">
            <Shield className="w-3.5 h-3.5 text-[#274C3D]" />
            Seguridad RBAC · Actores, Organizaciones & Roles (UUID)
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#1F2925] tracking-tight">
            Directorio de Actores y Organizaciones
          </h1>
          <p className="text-sm text-slate-600 mt-1 max-w-2xl">
            Control de identidades, perfiles de acceso basados en rol (RBAC) y entidades jurídicas participantes en la cadena de economía circular.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <Button variant="outline" size="sm" onClick={() => setModalOrg(true)} className="flex items-center gap-1.5">
            <Plus className="w-4 h-4" />
            Nueva Organización
          </Button>
          <Button variant="primary" size="sm" onClick={() => setModalUser(true)} className="flex items-center gap-1.5">
            <Plus className="w-4 h-4" />
            Nuevo Usuario
          </Button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-700 flex items-center gap-2">
          <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {loading && usuarios.length === 0 ? (
        <div className="bg-white rounded-3xl border border-[#D6E3DC] p-12 text-center">
          <div className="w-8 h-8 rounded-full border-3 border-[#274C3D] border-t-transparent animate-spin mx-auto" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 bg-white rounded-3xl border border-[#D6E3DC] shadow-xs p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-[#274C3D]" />
                  <h2 className="text-base font-bold text-[#1F2925]">
                    Usuarios y Perfiles de Acceso (USUARIO)
                  </h2>
                </div>
                <span className="text-xs font-bold text-[#274C3D] bg-[#EBF2EE] px-2.5 py-0.5 rounded-lg border border-[#C5D8CF]">
                  {usuarios.length} Activos
                </span>
              </div>

              <div className="divide-y divide-[#EBF2EE]">
                {usuarios.map((u) => (
                  <div
                    key={u.id_usuario}
                    className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#F9FCFA] px-2 rounded-2xl transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <Avatar name={u.nombre} size="md" />
                      <div>
                        <h3 className="text-xs sm:text-sm font-bold text-[#1F2925]">{u.nombre}</h3>
                        <p className="text-xs text-slate-500 font-mono">{u.correo}</p>
                        <p className="text-[11px] text-slate-600 mt-0.5">{u.razon_social}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 sm:self-center">
                      <span className="px-3 py-1 rounded-xl bg-[#EBF2EE] text-[#274C3D] font-bold text-xs border border-[#C5D8CF]">
                        {u.nombre_rol}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-[#D6E3DC] shadow-xs p-6 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-[#274C3D]" />
                  <h2 className="text-base font-bold text-[#1F2925]">Organizaciones</h2>
                </div>
                <span className="text-xs font-bold text-[#274C3D] bg-[#EBF2EE] px-2.5 py-0.5 rounded-lg border border-[#C5D8CF]">
                  {organizaciones.length}
                </span>
              </div>

              <div className="space-y-3">
                {organizaciones.map((org) => (
                  <div
                    key={org.id_organizacion}
                    className="p-4 rounded-2xl bg-[#F8FAF9] border border-[#D6E3DC] space-y-1.5"
                  >
                    <span className="font-mono text-xs font-bold text-[#274C3D] bg-white px-2 py-0.5 rounded-lg border border-[#D6E3DC]">
                      RUC: {org.ruc}
                    </span>
                    <h3 className="text-xs font-bold text-[#1F2925]">{org.razon_social}</h3>
                    {org.direccion && <p className="text-[11px] text-slate-500">{org.direccion}</p>}
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-3xl border border-[#D6E3DC] shadow-xs p-6 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-[#274C3D]" />
                <h2 className="text-base font-bold text-[#1F2925]">
                  Matriz de Roles y Privilegios del Sistema (ROL)
                </h2>
              </div>
              <span className="text-xs text-slate-500">{roles.length} Roles Registrados</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {roles.map((r) => (
                <div
                  key={r.id_rol}
                  className="p-4 rounded-2xl bg-[#F8FAF9] border border-[#D6E3DC] space-y-1"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full bg-[#274C3D]" />
                    <h3 className="text-xs font-bold text-[#1F2925]">{r.nombre_rol}</h3>
                  </div>
                  <p className="text-xs text-slate-600 pl-4">{r.descripcion}</p>
                </div>
              ))}
            </div>
          </div>
        </>
      )}

      {/* MODAL 1: Nueva Organización */}
      {modalOrg && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 border border-[#D6E3DC] shadow-xl">
            <h3 className="text-lg font-bold text-[#1F2925]">Registrar Nueva Organización</h3>
            <form onSubmit={handleCrearOrg} className="space-y-4 text-xs">
              <FormField label="Número de RUC (13 Dígitos)" hint="Normativa SRI Ecuador: 13 números">
                <Input
                  value={ruc}
                  onChange={(e) => setRuc(e.target.value)}
                  placeholder="1790012345001"
                  maxLength={13}
                  required
                />
              </FormField>
              <FormField label="Razón Social Oficial">
                <Input
                  value={razonSocial}
                  onChange={(e) => setRazonSocial(e.target.value)}
                  placeholder="Ej: EcoLogística Integral S.A."
                  required
                />
              </FormField>
              <FormField label="Dirección / Sede Principal">
                <Input
                  value={direccionOrg}
                  onChange={(e) => setDireccionOrg(e.target.value)}
                  placeholder="Ej: Av. Galo Plaza Lasso, Quito"
                />
              </FormField>
              <div className="flex justify-end gap-2.5 pt-3 border-t border-[#EBF2EE]">
                <Button type="button" variant="secondary" size="sm" onClick={() => setModalOrg(false)}>
                  Cancelar
                </Button>
                <Button type="submit" variant="primary" size="sm">
                  Registrar Organización
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Nuevo Usuario */}
      {modalUser && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 space-y-5 border border-[#D6E3DC] shadow-xl">
            <h3 className="text-lg font-bold text-[#1F2925]">Registrar Nuevo Usuario</h3>
            <form onSubmit={handleCrearUsuario} className="space-y-4 text-xs">
              <FormField label="Nombre Completo">
                <Input
                  value={nombreUser}
                  onChange={(e) => setNombreUser(e.target.value)}
                  placeholder="Ej: Anthony Romo"
                  required
                />
              </FormField>
              <FormField label="Correo Electrónico">
                <Input
                  type="email"
                  value={correoUser}
                  onChange={(e) => setCorreoUser(e.target.value)}
                  placeholder="ejemplo@ecoraee.ec"
                  required
                />
              </FormField>
              <FormField label="Organización">
                <select
                  value={idOrgUser}
                  onChange={(e) => setIdOrgUser(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 bg-white border border-[#D6E3DC] text-slate-800 text-xs rounded-xl focus:border-[#274C3D] outline-none"
                >
                  {organizaciones.map((o) => (
                    <option key={o.id_organizacion} value={o.id_organizacion}>
                      {o.razon_social} (RUC: {o.ruc})
                    </option>
                  ))}
                </select>
              </FormField>
              <FormField label="Rol de Seguridad RBAC">
                <select
                  value={idRolUser}
                  onChange={(e) => setIdRolUser(e.target.value)}
                  required
                  className="w-full px-3.5 py-2.5 bg-white border border-[#D6E3DC] text-slate-800 text-xs rounded-xl focus:border-[#274C3D] outline-none"
                >
                  {roles.map((r) => (
                    <option key={r.id_rol} value={r.id_rol}>
                      {r.nombre_rol}
                    </option>
                  ))}
                </select>
              </FormField>
              <div className="flex justify-end gap-2.5 pt-3 border-t border-[#EBF2EE]">
                <Button type="button" variant="secondary" size="sm" onClick={() => setModalUser(false)}>
                  Cancelar
                </Button>
                <Button type="submit" variant="primary" size="sm">
                  Crear Usuario
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UsuariosOrgPage;
