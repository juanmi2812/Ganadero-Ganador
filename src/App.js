import React, { useState, useEffect } from "react";
import Login from "./views/Login";
import Suscripcion from "./views/Suscripcion";

import ImportadorMasivo from "./views/ImportadorMasivo";
import DashboardGanado from "./views/DashboardGanado";
import NuevoAnimal from "./views/NuevoAnimal";
import CalendarioAlertas from "./views/CalendarioAlertas";
import ReportesBI from "./views/ReportesBI";
import ConfiguracionFinanciera from "./views/ConfiguracionFinanciera";
import ConfiguracionPotreros from "./views/ConfiguracionPotreros";
import ProduccionLeche from "./views/ProduccionLeche";
import ConfiguracionEquipo from "./views/ConfiguracionEquipo";
import Movilizacion from "./views/Movilizacion";
import { Home, CalendarDays, BarChart3, Settings, LogOut, Plus, Map, CreditCard, Droplets, Users, Truck, Download } from "lucide-react";
import logoConvivet from "./assets/logo_convivet.jpg";
import { auth, db, onAuthStateChanged, signOut, functions } from "./firebase";
import { doc, getDoc } from "firebase/firestore";
import { httpsCallable } from "firebase/functions";
import "./styles.css";

export default function App() {

  // --- MODO MANTENIMIENTO ---
  const MODO_MANTENIMIENTO = false;
  if (MODO_MANTENIMIENTO) {
    return (
      <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", backgroundColor: "#f9fafb", padding: "20px", textAlign: "center" }}>
        <h1 style={{ fontSize: "24px", color: "#111827", marginBottom: "16px" }}>🚧 Sitio en Mantenimiento</h1>
        <p style={{ fontSize: "16px", color: "#4b5563", maxWidth: "400px" }}>
          Estamos realizando algunas mejoras en el sistema. Volveremos a estar en línea muy pronto. Disculpa las molestias.
        </p>
      </div>
    );
  }

  const [usuario, setUsuario] = useState(null);   // null = no auth, objeto = perfil cargado
  const [cargandoAuth, setCargandoAuth] = useState(true);
  const [vistaActiva, setVistaActiva] = useState("dashboard");
  const [abrirModalTratamientoMasivo, setAbrirModalTratamientoMasivo] = useState(false);
  const [forzarPaywall, setForzarPaywall] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  const handleInstallClick = () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('User accepted the install prompt');
        } else {
          console.log('User dismissed the install prompt');
        }
        setDeferredPrompt(null);
      });
    }
  };

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

  const abrirPortalSuscripcion = async () => {
    try {
      const createPortalSession = httpsCallable(functions, 'createPortalSession');
      const result = await createPortalSession({
        returnUrl: window.location.href
      });
      window.location.assign(result.data.url);
    } catch (err) {
      alert("No se pudo abrir el portal de suscripción. Asegúrate de tener una suscripción activa.");
    }
  };

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

  // Lógica de Suscripción / Paywall
  const tieneSuscripcionActiva = usuario.suscripcionActiva === true;
  const hoy = new Date();
  const finPrueba = usuario.fechaFinPrueba ? new Date(usuario.fechaFinPrueba) : new Date(0); // Si no tiene, se venció
  const enPeriodoDePrueba = hoy <= finPrueba;
  const diasRestantesPrueba = Math.ceil((finPrueba - hoy) / (1000 * 60 * 60 * 24));

  if ((!tieneSuscripcionActiva && !enPeriodoDePrueba && usuario.rol !== "admin_super") || forzarPaywall) {
    return <Suscripcion usuario={usuario} setUsuario={setUsuario} onVolver={enPeriodoDePrueba ? () => setForzarPaywall(false) : null} />;
  }

  const tabs = [
    { id: "dashboard", label: "Mi Ganado", icon: Home },
    { id: "leche", label: "Leche", icon: Droplets },
    { id: "rancho", label: "Mi Rancho", icon: Map },
    { id: "calendario", label: "Calendario", icon: CalendarDays },
    { id: "reportes", label: "Reportes", icon: BarChart3 },
    { id: "movilizacion", label: "Movilización", icon: Truck },
  ];

  return (
    <div style={{ backgroundColor: "#f0f2f5", minHeight: "100vh" }}>
      {/* === TOP HEADER === */}
      <header className="top-header">
        <div className="top-header-brand">
          <img src={logoConvivet} alt="Convivet" />
          <span>Ganadero Ganador</span>
        </div>
        
        {/* Espacio para Publicidad */}
        <div style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center", margin: "0 20px" }}>
            <div style={{ width: "100%", maxWidth: "450px", height: "45px", backgroundColor: "#f9fafb", border: "2px dashed #e5e7eb", borderRadius: "8px", display: "flex", justifyContent: "center", alignItems: "center", color: "#9ca3af", fontSize: "12px", fontWeight: "bold" }}>
                ESPACIO PARA PUBLICIDAD
            </div>
        </div>
        <div className="top-header-actions">
          {deferredPrompt && (
            <button
              onClick={handleInstallClick}
              title="Instalar App en el dispositivo"
              style={{ display: "flex", alignItems: "center", gap: "6px", backgroundColor: "#10b981", color: "white", padding: "6px 12px", borderRadius: "8px", fontWeight: "bold" }}
            >
              <Download size={16} /> Instalar App
            </button>
          )}
          {/* Importar solo visible para admin */}
          {usuario.rol === "admin" && (
            <>
              <button title="Mi Equipo" onClick={() => setVistaActiva("equipo")}>
                <Users size={18} />
              </button>
              <button title="Importar Excel" onClick={() => setVistaActiva("importar")}>
                <Settings size={18} />
              </button>
            </>
          )}
          <div style={{ fontSize: "12px", color: "#e5e7eb", lineHeight: 1.2, textAlign: "right", maxWidth: "100px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
            {usuario.nombre || usuario.correo}
          </div>
          {usuario.rol === "admin" && !tieneSuscripcionActiva && (
            <button title="Suscribirme" onClick={() => setForzarPaywall(true)}>
              <CreditCard size={18} />
            </button>
          )}
          {usuario.rol === "admin" && tieneSuscripcionActiva && (
            <button title="Mi Suscripción" onClick={abrirPortalSuscripcion}>
              <CreditCard size={18} />
            </button>
          )}
          <button title="Cerrar sesión" onClick={cerrarSesion}>
            <LogOut size={18} />
          </button>
        </div>
      </header>

      {/* === BANNER DE PRUEBA === */}
      {!tieneSuscripcionActiva && enPeriodoDePrueba && usuario.rol !== "admin_super" && (
        <div style={{ backgroundColor: "#fef3c7", padding: "10px 20px", display: "flex", justifyContent: "center", alignItems: "center", gap: "12px", borderBottom: "1px solid #fde68a" }}>
          <span style={{ color: "#92400e", fontSize: "14px", fontWeight: "500" }}>
            🐄 ¡Bienvenido a tu periodo de prueba! Te quedan <strong>{Math.max(0, diasRestantesPrueba)} días</strong> de acceso gratuito.
          </span>
          <button 
            onClick={() => setForzarPaywall(true)}
            style={{ backgroundColor: "#d97706", color: "white", border: "none", padding: "6px 12px", borderRadius: "6px", fontSize: "13px", fontWeight: "bold", cursor: "pointer", transition: "0.2s" }}
          >
            Suscribirse ahora
          </button>
        </div>
      )}

      {/* === CONTENIDO PRINCIPAL === */}
      <div className="page-wrapper">
        {vistaActiva === "dashboard" && <DashboardGanado usuario={usuario} abrirModalTratamientoMasivo={abrirModalTratamientoMasivo} setAbrirModalTratamientoMasivo={setAbrirModalTratamientoMasivo} />}
        {vistaActiva === "nuevo" && <NuevoAnimal onTerminar={() => setVistaActiva("dashboard")} usuario={usuario} />}
        {vistaActiva === "calendario" && <CalendarioAlertas usuario={usuario} />}
        {vistaActiva === "reportes" && <ReportesBI usuario={usuario} />}
        {vistaActiva === "importar" && <ImportadorMasivo usuario={usuario} />}
        {vistaActiva === "finanzas" && <ConfiguracionFinanciera />}
        {vistaActiva === "rancho" && <ConfiguracionPotreros usuario={usuario} />}
        {vistaActiva === "leche" && <ProduccionLeche usuario={usuario} />}
        {vistaActiva === "equipo" && <ConfiguracionEquipo usuario={usuario} />}
        {vistaActiva === "movilizacion" && <Movilizacion usuario={usuario} />}
      </div>

      {/* === FAB — Registrar Animal === */}
      {vistaActiva === "dashboard" && usuario?.rol !== "tecnico" && (
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
