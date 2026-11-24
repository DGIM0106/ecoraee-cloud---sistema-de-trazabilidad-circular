import React from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Recycle,
  LayoutDashboard,
  Cpu,
  FolderTree,
  Truck,
  Network,
  Users,
  LogOut,
  ShieldCheck,
} from "lucide-react";
import Avatar from "../atoms/Avatar";
import Button from "../atoms/Button";
import { useAuth } from "../../context/AuthContext";

const NAV_ITEMS = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/catalogos", label: "Catálogos (Obj & Cat)", icon: FolderTree },
  { path: "/dispositivos", label: "Dispositivos", icon: Cpu },
  { path: "/logistica", label: "Solicitudes & Stock", icon: Truck },
  { path: "/red-flujo", label: "Red de Flujo", icon: Network },
  { path: "/usuarios", label: "Actores & Roles", icon: Users },
];

const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-50 bg-white/95 backdrop-blur-md border-b border-[#D6E3DC] px-4 sm:px-6 py-3 shadow-xs">
      <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-2xl bg-[#274C3D] flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-transform">
            <Recycle className="w-5 h-5 text-emerald-300" />
          </div>
          <div>
            <span className="text-lg font-black tracking-tight text-[#1F2925]">
              EcoRAEE <span className="text-[#274C3D]">Cloud</span>
            </span>
            <span className="block text-[10px] font-bold uppercase tracking-wider text-[#527063]">
              AWS Ready · DTOs & UUID
            </span>
          </div>
        </Link>

        <nav className="flex items-center gap-1.5 overflow-x-auto py-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-2 px-3 py-2 rounded-2xl text-xs font-bold whitespace-nowrap transition-all ${
                  isActive
                    ? "bg-[#274C3D] text-white shadow-xs"
                    : "text-[#274C3D] hover:bg-[#EBF2EE] hover:text-[#1E3B2F]"
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? "text-emerald-300" : "text-[#274C3D]"}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          {user ? (
            <div className="flex items-center gap-3 pl-3 border-l border-[#D6E3DC]">
              <Link
                to="/auth"
                title="Cambiar de rol o usuario"
                className="flex items-center gap-2.5 hover:opacity-90 transition-opacity bg-[#F2F7F4] hover:bg-[#EBF2EE] px-3 py-1.5 rounded-2xl border border-[#D6E3DC]"
              >
                <Avatar name={user.nombre} size="sm" />
                <div className="hidden md:block text-left">
                  <p className="text-xs font-bold text-[#1F2925] leading-tight">
                    {user.nombre}
                  </p>
                  <p className="text-[10px] font-semibold text-[#274C3D] flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3 text-[#274C3D]" />
                    {user.nombre_rol}
                  </p>
                </div>
              </Link>
              <button
                onClick={() => {
                  logout();
                  navigate("/auth");
                }}
                title="Cerrar Sesión / Cambiar Usuario"
                className="p-2 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-colors cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <Link to="/auth">
              <Button variant="primary" size="sm">
                Iniciar Sesión
              </Button>
            </Link>
          )}
        </div>
      </div>
    </header>
  );
};

export default Navbar;
