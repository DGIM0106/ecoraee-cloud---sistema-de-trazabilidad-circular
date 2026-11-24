import React from "react";
import { BrowserRouter, Route, Routes, useLocation, Link } from "react-router-dom";
import { AuthProvider } from "./context/AuthContext";
import Navbar from "./components/organisms/NavBar";
import DashboardPage from "./pages/DashboardPage";
import CatalogosPage from "./pages/CatalogosPage";
import DispositivosPage from "./pages/DispositivosPage";
import SolicitudesLotesPage from "./pages/SolicitudesLotesPage";
import RedFlujoPage from "./pages/RedFlujoPage";
import UsuariosOrgPage from "./pages/UsuariosOrgPage";
import AuthPage from "./pages/AuthPage";
import { Recycle } from "lucide-react";

const LayoutContent: React.FC = () => {
  const location = useLocation();
  const isAuthPage = location.pathname === "/auth";

  return (
    <div className="min-h-screen bg-[#F8FAF9] flex flex-col font-['Plus_Jakarta_Sans',sans-serif] text-[#1F2925] selection:bg-[#EBF2EE] selection:text-[#274C3D]">
      {!isAuthPage && <Navbar />}

      <main className="flex-1">
        <Routes>
          <Route path="/" element={<DashboardPage />} />
          <Route path="/catalogos" element={<CatalogosPage />} />
          <Route path="/dispositivos" element={<DispositivosPage />} />
          <Route path="/logistica" element={<SolicitudesLotesPage />} />
          <Route path="/red-flujo" element={<RedFlujoPage />} />
          <Route path="/usuarios" element={<UsuariosOrgPage />} />
          <Route path="/auth" element={<AuthPage />} />
          <Route path="*" element={<DashboardPage />} />
        </Routes>
      </main>

      {!isAuthPage && (
        <footer className="border-t border-[#D6E3DC] bg-white py-6 px-4 sm:px-6 mt-12">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-500">
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-lg bg-[#274C3D] flex items-center justify-center text-white">
                <Recycle className="w-3.5 h-3.5 text-emerald-300" />
              </div>
              <span className="font-bold text-[#1F2925]">
                EcoRAEE Cloud · Arquitectura DTOs + UUID
              </span>
            </div>
            <div className="flex items-center gap-4 flex-wrap">
              <span>AWS RDS SQL Server</span>
              <span>·</span>
              <span>FastAPI (EC2)</span>
              <span>·</span>
              <span>AWS S3</span>
              <span>·</span>
              <Link to="/catalogos" className="text-[#274C3D] font-bold hover:underline">
                Catálogos BD
              </Link>
              <span>·</span>
              <Link to="/auth" className="text-[#274C3D] font-bold hover:underline">
                Cambiar Rol
              </Link>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <LayoutContent />
      </BrowserRouter>
    </AuthProvider>
  );
}
