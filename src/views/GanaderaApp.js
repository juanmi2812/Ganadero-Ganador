import React, { useState } from "react";
import { LogOut, CalendarDays, Settings, Users, Inbox } from "lucide-react";
import logoConvivet from "../assets/logo_convivet.jpg";

import GanaderaConfiguracion from "./Ganadera/GanaderaConfiguracion";
import GanaderaEmpleados from "./Ganadera/GanaderaEmpleados";
import GanaderaCitas from "./Ganadera/GanaderaCitas";
import GanaderaHistorial from "./Ganadera/GanaderaHistorial";

export default function GanaderaApp({ usuario, cerrarSesion }) {
  const [vistaActiva, setVistaActiva] = useState("citas");

  const tabs = [
    { id: "citas", label: "Citas", icon: Inbox },
    { id: "historial", label: "Historial", icon: CalendarDays },
  ];

  if (usuario.rol === "admin_ganadera") {
    tabs.push({ id: "empleados", label: "Empleados", icon: Users });
    tabs.push({ id: "configuracion", label: "Configuración", icon: Settings });
  }

  return (
    <div style={{ backgroundColor: "#f0f2f5", minHeight: "100vh" }}>
      {/* === TOP HEADER === */}
      <header className="top-header" style={{ borderBottomColor: "#2563eb" }}>
        <div className="top-header-brand">
          <img src={logoConvivet} alt="Convivet" />
          <span>Portal Ganadera</span>
        </div>
        
        <div className="publicidad-wrapper" style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center", margin: "0 20px" }}>
            <div style={{ width: "100%", maxWidth: "450px", height: "45px", backgroundColor: "#f9fafb", border: "2px dashed #93c5fd", borderRadius: "8px", display: "flex", justifyContent: "center", alignItems: "center", color: "#3b82f6", fontSize: "12px", fontWeight: "bold" }}>
                ASOCIACIÓN GANADERA
            </div>
        </div>
        <div className="top-header-actions">
          <button title="Cerrar Sesión" onClick={cerrarSesion} style={{ color: "#ef4444" }}>
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* === CONTENIDO PRINCIPAL === */}
      <main className="main-content" style={{ paddingBottom: "70px", paddingTop: "80px", maxWidth: "900px", margin: "0 auto" }}>
        {vistaActiva === "citas" && <GanaderaCitas usuario={usuario} />}
        {vistaActiva === "historial" && <GanaderaHistorial usuario={usuario} />}

        {vistaActiva === "empleados" && <GanaderaEmpleados usuario={usuario} />}
        {vistaActiva === "configuracion" && <GanaderaConfiguracion usuario={usuario} />}
      </main>

      {/* === BOTTOM NAV === */}
      <nav className="bottom-nav">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              className={`bottom-nav-item ${vistaActiva === tab.id ? "active" : ""}`}
              onClick={() => setVistaActiva(tab.id)}
              style={vistaActiva === tab.id ? { color: "#2563eb" } : {}}
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
