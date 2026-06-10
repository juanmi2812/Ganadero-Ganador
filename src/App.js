import React, { useState, useEffect } from "react";
import Login from "./views/Login";

import ImportadorMasivo from "./views/ImportadorMasivo";
import DashboardGanado from "./views/DashboardGanado";
import NuevoAnimal from "./views/NuevoAnimal";
import CalendarioAlertas from "./views/CalendarioAlertas";
import ReportesBI from "./views/ReportesBI";
import ConfiguracionFinanciera from "./views/ConfiguracionFinanciera";
import ConfiguracionPotreros from "./views/ConfiguracionPotreros";
import { Home, CalendarDays, BarChart3, Settings, LogOut, Plus, Map } from "lucide-react";
import logoConvivet from "./assets/logo_convivet.jpg";
import { auth, db, onAuthStateChanged, signOut } from "./firebase";
import { doc, getDoc } from "firebase/firestore";
import "./styles.css";

export default function App() {
  // --- MODO MANTENIMIENTO ---
  // Cambiar a false cuando queramos volver a encender la app
  const MODO_MANTENIMIENTO = true; 

  if (MODO_MANTENIMIENTO) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", backgroundColor: "#f0f2f5", padding: "20px", textAlign: "center" }}>
        <div style={{ fontSize: "64px", marginBottom: "16px" }}>🚧</div>
        <h1 style={{ color: "#111827", marginBottom: "8px", fontSize: "28px" }}>Sitio en Mantenimiento</h1>
        <p style={{ color: "#4b5563", maxWidth: "450px", lineHeight: "1.6" }}>
          Estamos realizando algunas mejoras rápidas en el sistema para ofrecerte un mejor servicio. Volveremos a estar en línea en un momento. ¡Gracias por tu paciencia!
        </p>
      </div>
    );
  }

  const [usuario, setUsuario] = useState(null);   // null = no auth, objeto = perfil cargado
  const [cargandoAuth, setCargandoAuth] = useState(true);
  const [vistaActiva, setVistaActiva] = useState("dashboard");
  const [abrirModalTratamientoMasivo, setAbrirModalTratamientoMasivo] = useState(false);

  // Detecta sesión activa al arrancar (persistencia automática de Firebase)
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        try {
          const perfil = await getDoc(doc(db, "usuarios", firebaseUser.uid));
          if (perfil.exists()) {
            setUsuario({ uid: firebaseUser.uid, ...perfil.data() });
          } else {
            // Perfil no existe todavía (puede estar en medio del registro) → solo mostrar Login
            setUsuario(null);
          }
        } catch {
          setUsuario(null);
        }
      } else {
        setUsuario(null);
      }
      setCargandoAuth(false);
    });
    return () => unsub();
  }, []);

  const cerrarSesion = async () => {
    await signOut(auth);
    setUsuario(null);
    setVistaActiva("dashboard");
  };

  // Spinner mientras se verifica la sesión
  if (cargandoAuth) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", backgroundColor: "#f0f2f5" }}>
        <div style={{ textAlign: "center", color: "#6b7280" }}>
          <div style={{ fontSize: "24px", marginBottom: "8px" }}>🐄</div>
          <div style={{ fontSize: "14px" }}>Cargando...</div>
        </div>
      </div>
    );
  }

  if (!usuario) {
    return <Login alIniciarSesion={setUsuario} />;
  }

  const tabs = [
    { id: "dashboard", label: "Mi Ganado", icon: Home },
    { id: "rancho", label: "Mi Rancho", icon: Map },
    { id: "calendario", label: "Calendario", icon: CalendarDays },
    { id: "reportes", label: "Reportes", icon: BarChart3 },
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
          {/* Importar solo visible para admin */}
          {usuario.rol === "admin" && (
            <button title="Importar Excel" onClick={() => setVistaActiva("importar")}>
              <Settings size={18} />
            </button>
          )}
          <div style={{ fontSize: "12px", color: "#e5e7eb", lineHeight: 1.2, textAlign: "right", maxWidth: "100px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {usuario.nombre || usuario.correo}
          </div>
          <button title="Cerrar sesión" onClick={cerrarSesion}>
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* === PAGE CONTENT === */}
      <div className="page-wrapper">
        {vistaActiva === "dashboard" && <DashboardGanado usuario={usuario} abrirModalTratamientoMasivo={abrirModalTratamientoMasivo} setAbrirModalTratamientoMasivo={setAbrirModalTratamientoMasivo} />}
        {vistaActiva === "nuevo" && <NuevoAnimal onTerminar={() => setVistaActiva("dashboard")} usuario={usuario} />}
        {vistaActiva === "calendario" && <CalendarioAlertas usuario={usuario} />}
        {vistaActiva === "reportes" && <ReportesBI usuario={usuario} />}
        {vistaActiva === "importar" && <ImportadorMasivo usuario={usuario} />}
        {vistaActiva === "finanzas" && <ConfiguracionFinanciera />}
        {vistaActiva === "rancho" && <ConfiguracionPotreros usuario={usuario} />}
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
