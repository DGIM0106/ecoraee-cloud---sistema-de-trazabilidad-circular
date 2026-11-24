import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Recycle, ShieldCheck, UserPlus, LogIn, ArrowRight } from "lucide-react";
import apiClient from "../api/client";
import { useAuth, DEMO_USERS } from "../context/AuthContext";
import { User, Rol, Organizacion } from "../types";
import Button from "../components/atoms/Button";
import Input from "../components/atoms/Input";
import FormField from "../components/molecules/FormField";
import Avatar from "../components/atoms/Avatar";

const AuthPage: React.FC = () => {
  const { user, login } = useAuth();
  const navigate = useNavigate();

  const [mode, setMode] = useState<"login" | "register">("login");
  const [correoLogin, setCorreoLogin] = useState(user?.correo || "anthony.romo@ecoraee.ec");
  const [nombreReg, setNombreReg] = useState("");
  const [correoReg, setCorreoReg] = useState("");
  const [idOrgReg, setIdOrgReg] = useState<number>(1);
  const [idRolReg, setIdRolReg] = useState<number>(2);

  const [usersList, setUsersList] = useState<User[]>(DEMO_USERS);
  const [roles, setRoles] = useState<Rol[]>([]);
  const [organizaciones, setOrganizaciones] = useState<Organizacion[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [uRes, catRes] = await Promise.all([
          apiClient.get<User[]>("/auth/users"),
          apiClient.get("/catalogos/resumen"),
        ]);
        if (uRes.data && uRes.data.length > 0) setUsersList(uRes.data);
        setRoles(catRes.data.roles || []);
        setOrganizaciones(catRes.data.organizaciones || []);
      } catch (err) {
        console.error("Error cargando usuarios:", err);
      }
    };
    loadData();
  }, []);

  const handleSelectDemoUser = (u: User) => {
    login(u);
    navigate("/");
  };

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const found = usersList.find(
      (u) => u.correo.toLowerCase() === correoLogin.trim().toLowerCase()
    );
    if (found) {
      login(found);
      navigate("/");
    } else {
      setError(
        "Correo no encontrado en la base de datos de EcoRAEE. Selecciona un actor de la lista."
      );
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!nombreReg.trim() || !correoReg.trim()) {
      setError("Por favor completa todos los campos del registro.");
      return;
    }
    try {
      setLoading(true);
      const res = await apiClient.post<User>("/auth/users", {
        nombre: nombreReg.trim(),
        correo: correoReg.trim(),
        id_organizacion: idOrgReg,
        id_rol: idRolReg,
      });
      login(res.data);
      navigate("/");
    } catch (err: any) {
      setError(err.response?.data?.detail || "Error al crear el usuario.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAF9] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-3">
        <div className="w-14 h-14 rounded-3xl bg-[#274C3D] flex items-center justify-center text-white shadow-md mx-auto">
          <Recycle className="w-8 h-8 text-emerald-300" />
        </div>
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-[#1F2925] tracking-tight">
            EcoRAEE <span className="text-[#274C3D]">Cloud</span>
          </h1>
          <p className="text-xs text-slate-500 font-medium mt-1">
            Plataforma Universitaria de Trazabilidad Circular RAEE · Parte II Local
          </p>
        </div>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-4xl space-y-8">
        {/* Selector Rápido de los 5 Roles / Personas */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#D6E3DC] shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold uppercase tracking-wider text-[#274C3D] bg-[#EBF2EE] px-2.5 py-0.5 rounded-lg border border-[#C5D8CF]">
                Demostración & Evaluación de Roles
              </span>
              <h2 className="text-base font-bold text-[#1F2925] mt-1">
                Selecciona un Actor de Prueba para Iniciar Sesión Directa
              </h2>
            </div>
            <ShieldCheck className="w-5 h-5 text-[#274C3D]" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
            {usersList.slice(0, 5).map((u) => {
              const isSelected = user?.id_usuario === u.id_usuario;
              return (
                <button
                  key={u.id_usuario}
                  onClick={() => handleSelectDemoUser(u)}
                  className={`p-4 rounded-2xl text-left border transition-all cursor-pointer space-y-2 ${
                    isSelected
                      ? "bg-[#EBF2EE] border-[#274C3D] ring-2 ring-[#274C3D]/20 shadow-xs"
                      : "bg-[#F8FAF9] border-[#D6E3DC] hover:border-[#274C3D] hover:bg-white"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Avatar name={u.nombre} size="sm" />
                    <div>
                      <h3 className="text-xs font-bold text-[#1F2925] leading-tight">
                        {u.nombre}
                      </h3>
                      <p className="text-[10px] text-slate-500 font-mono truncate max-w-[150px]">
                        {u.correo}
                      </p>
                    </div>
                  </div>
                  <div className="pt-1 border-t border-[#D6E3DC]/60 flex items-center justify-between">
                    <span className="text-[10px] font-bold text-[#274C3D] truncate">
                      {u.nombre_rol}
                    </span>
                    <ArrowRight className="w-3.5 h-3.5 text-[#274C3D] shrink-0" />
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Formulario de Login / Registro Manual */}
        <div className="bg-white rounded-3xl p-6 sm:p-8 border border-[#D6E3DC] shadow-xs max-w-lg mx-auto space-y-6">
          <div className="flex items-center justify-center gap-2 border-b border-[#EBF2EE] pb-4">
            <button
              onClick={() => setMode("login")}
              className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                mode === "login"
                  ? "bg-[#274C3D] text-white shadow-xs"
                  : "text-slate-600 hover:text-[#274C3D]"
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Ingresar por Correo</span>
            </button>
            <button
              onClick={() => setMode("register")}
              className={`px-4 py-2 rounded-2xl text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 ${
                mode === "register"
                  ? "bg-[#274C3D] text-white shadow-xs"
                  : "text-slate-600 hover:text-[#274C3D]"
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Registrar Nuevo Usuario</span>
            </button>
          </div>

          {error && (
            <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-700">
              {error}
            </div>
          )}

          {mode === "login" ? (
            <form onSubmit={handleLoginSubmit} className="space-y-4 text-xs">
              <FormField label="Correo Electrónico Institucional">
                <Input
                  type="email"
                  value={correoLogin}
                  onChange={(e) => setCorreoLogin(e.target.value)}
                  placeholder="ejemplo@ecoraee.ec"
                  required
                />
              </FormField>

              <Button type="submit" variant="primary" size="md" className="w-full">
                Iniciar Sesión
              </Button>
            </form>
          ) : (
            <form onSubmit={handleRegisterSubmit} className="space-y-4 text-xs">
              <FormField label="Nombre Completo">
                <Input
                  value={nombreReg}
                  onChange={(e) => setNombreReg(e.target.value)}
                  placeholder="Ej: Anthony Romo"
                  required
                />
              </FormField>

              <FormField label="Correo Electrónico">
                <Input
                  type="email"
                  value={correoReg}
                  onChange={(e) => setCorreoReg(e.target.value)}
                  placeholder="anthony.romo@ecoraee.ec"
                  required
                />
              </FormField>

              <FormField label="Organización Jurídica">
                <select
                  value={idOrgReg}
                  onChange={(e) => setIdOrgReg(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-white border border-[#D6E3DC] text-slate-800 text-xs rounded-xl focus:border-[#274C3D] outline-none"
                >
                  {organizaciones.map((o) => (
                    <option key={o.id_organizacion} value={o.id_organizacion}>
                      {o.razon_social} (RUC: {o.ruc})
                    </option>
                  ))}
                </select>
              </FormField>

              <FormField label="Rol Funcional">
                <select
                  value={idRolReg}
                  onChange={(e) => setIdRolReg(Number(e.target.value))}
                  className="w-full px-3.5 py-2.5 bg-white border border-[#D6E3DC] text-slate-800 text-xs rounded-xl focus:border-[#274C3D] outline-none"
                >
                  {roles.map((r) => (
                    <option key={r.id_rol} value={r.id_rol}>
                      {r.nombre_rol}
                    </option>
                  ))}
                </select>
              </FormField>

              <Button
                type="submit"
                variant="primary"
                size="md"
                isLoading={loading}
                className="w-full"
              >
                Crear e Iniciar Sesión
              </Button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
