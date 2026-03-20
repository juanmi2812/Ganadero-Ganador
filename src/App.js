import React, { useState } from "react";
import Login from "./views/Login";
import ImportadorMasivo from "./views/ImportadorMasivo";
import DashboardGanado from "./views/DashboardGanado";
import NuevoAnimal from "./views/NuevoAnimal";
import CalendarioAlertas from "./views/CalendarioAlertas";
import ReportesBI from "./views/ReportesBI"; // <-- 1. IMPORTAMOS EL MÓDULO BI
import { LogOut } from "lucide-react";
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

  return (
    <div style={{ backgroundColor: "#f3f4f6", minHeight: "100vh" }}>
      <nav
        className="navbar"
        style={{ overflowX: "auto", whiteSpace: "nowrap" }}
      >
        <div
          style={{ fontWeight: "bold", fontSize: "18px", marginRight: "16px" }}
        >
          🐮 Control Ganadero
        </div>

        <button
          className={`nav-btn ${vistaActiva === "dashboard" ? "active" : ""}`}
          onClick={() => setVistaActiva("dashboard")}
        >
          Mi Ganado
        </button>
        <button
          className={`nav-btn ${vistaActiva === "nuevo" ? "active" : ""}`}
          onClick={() => setVistaActiva("nuevo")}
        >
          + Registrar
        </button>
        <button
          className={`nav-btn ${vistaActiva === "calendario" ? "active" : ""}`}
          onClick={() => setVistaActiva("calendario")}
        >
          Calendario
        </button>

        {/* <-- 2. BOTÓN DE REPORTES --> */}
        <button
          className={`nav-btn ${vistaActiva === "reportes" ? "active" : ""}`}
          onClick={() => setVistaActiva("reportes")}
        >
          Reportes BI
        </button>

        <button
          className={`nav-btn ${vistaActiva === "importar" ? "active" : ""}`}
          onClick={() => setVistaActiva("importar")}
        >
          Excel
        </button>
        <button
          className="nav-btn"
          onClick={cerrarSesion}
          style={{
            marginLeft: "auto",
            display: "flex",
            alignItems: "center",
            gap: "8px",
          }}
        >
          <LogOut size={18} /> Salir
        </button>
      </nav>

      <div>
        {vistaActiva === "dashboard" && <DashboardGanado />}
        {vistaActiva === "importar" && <ImportadorMasivo />}
        {vistaActiva === "nuevo" && <NuevoAnimal />}
        {vistaActiva === "calendario" && <CalendarioAlertas />}
        {vistaActiva === "reportes" && <ReportesBI />}{" "}
        {/* <-- 3. MOSTRAMOS LA VISTA --> */}
      </div>
    </div>
  );
}
