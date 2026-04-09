import React, { useState } from "react";
import Login from "./views/Login";
import ImportadorMasivo from "./views/ImportadorMasivo";
import DashboardGanado from "./views/DashboardGanado";
import NuevoAnimal from "./views/NuevoAnimal";
import CalendarioAlertas from "./views/CalendarioAlertas";
import ReportesBI from "./views/ReportesBI";
import ConfiguracionFinanciera from "./views/ConfiguracionFinanciera";
import { Home, CalendarDays, BarChart3, Settings, LogOut, Plus } from "lucide-react";
import logoConvivet from "./assets/logo_convivet.jpg";
import "./styles.css";

export default function App() {
  const [estaAutenticado, setEstaAutenticado] = useState(false);
  const [vistaActiva, setVistaActiva] = useState("dashboard");

  const cerrarSesion = () => {
    setEstaAutenticado(false);
    setVistaActiva("dashboard");
  };

  if (!estaAutenticado) {
    return <Login alIniciarSesion={setEstaAutenticado} />;
  }

  const tabs = [
    { id: "dashboard", label: "Mi Ganado", icon: Home },
    { id: "calendario", label: "Calendario", icon: CalendarDays },
    { id: "reportes", label: "Reportes", icon: BarChart3 },
    { id: "finanzas", label: "Ajustes", icon: Settings },
  ];

  return (
    <div style={{ backgroundColor: "#f0f2f5", minHeight: "100vh" }}>
      {/* === TOP HEADER === */}
      <header className="top-header">
        <div className="top-header-brand">
          <img src={logoConvivet} alt="Convivet" />
          <span>Ganadero Ganador</span>
        </div>
        <div className="top-header-actions">
          <button title="Importar Excel" onClick={() => setVistaActiva("importar")}>
            <Settings size={18} />
          </button>
          <button title="Cerrar sesión" onClick={cerrarSesion}>
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* === PAGE CONTENT === */}
      <div className="page-wrapper">
        {vistaActiva === "dashboard" && <DashboardGanado />}
        {vistaActiva === "nuevo" && <NuevoAnimal onTerminar={() => setVistaActiva("dashboard")} />}
        {vistaActiva === "calendario" && <CalendarioAlertas />}
        {vistaActiva === "reportes" && <ReportesBI />}
        {vistaActiva === "importar" && <ImportadorMasivo />}
        {vistaActiva === "finanzas" && <ConfiguracionFinanciera />}
      </div>

      {/* === FAB — Registrar Animal === */}
      {vistaActiva === "dashboard" && (
        <button className="fab" onClick={() => setVistaActiva("nuevo")} title="Registrar animal">
          <Plus size={26} strokeWidth={2.5} />
        </button>
      )}

      {/* === BOTTOM NAVIGATION === */}
      <nav className="bottom-nav">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              className={`bottom-nav-item ${vistaActiva === tab.id ? "active" : ""}`}
              onClick={() => setVistaActiva(tab.id)}
            >
              <Icon size={22} strokeWidth={vistaActiva === tab.id ? 2.5 : 1.8} />
              {tab.label}
            </button>
          );
        })}
      </nav>
    </div>
  );
}