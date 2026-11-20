import React, { useState } from "react";
import { LogOut, CalendarDays, Settings, Users, Inbox } from "lucide-react";
import logoUnionGanadera from "../assets/logo_union_ganadera.jpg";

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
        <div className="top-header-brand" style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <img src={logoUnionGanadera} alt="UGR del Norte de Veracruz" style={{ height: "54px", width: "auto", borderRadius: "8px", backgroundColor: "#ffffff", padding: "3px", objectFit: "contain" }} />
          <span>Portal Ganadera</span>
        </div>

        <div className="top-header-actions">
          <a
            href="https://wa.me/5217461022162?text=Hola,%20tengo%20una%20duda%20en%20el%20Portal%20Ganadera"
            target="_blank"
            rel="noopener noreferrer"
            title="Contacto y Soporte (+52 1 746 102 2162)"
            style={{
              display: "flex",
              alignItems: "center",
              gap: "6px",
              backgroundColor: "#16a34a",
              color: "white",
              padding: "6px 12px",
              borderRadius: "20px",
              fontWeight: "600",
              fontSize: "13px",
              textDecoration: "none",
              marginRight: "8px"
            }}
          >
            <MessageCircle size={15} />
            <span>Contacto</span>
          </a>
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
