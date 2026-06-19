import React, { useState } from "react";
import { CheckCircle2, ShieldCheck, Zap, ArrowRight, LogOut } from "lucide-react";
import { httpsCallable } from "firebase/functions";
import { functions, signOut, auth } from "../firebase";

export default function Suscripcion({ usuario, setUsuario }) {
  const [cargando, setCargando] = useState(false);

  // Reemplazar con los IDs reales de los precios de Stripe que creaste
  const PRICE_ID_MENSUAL = "price_1Sty..._REEMPLAZAME"; 
  const PRICE_ID_ANUAL = "price_1Sty..._REEMPLAZAME";

  const iniciarCheckout = async (priceId) => {
    setCargando(true);
    try {
      const createCheckoutSession = httpsCallable(functions, 'createCheckoutSession');
      const result = await createCheckoutSession({
        priceId: priceId,
        successUrl: window.location.origin + "?pago=exito",
        cancelUrl: window.location.origin + "?pago=cancelado"
      });
      
      const data = result.data;
      if (data.url) {
        window.location.assign(data.url);
      }
    } catch (error) {
      console.error("Error al iniciar checkout:", error);
      alert("Hubo un problema al conectar con Stripe. Intenta de nuevo.");
      setCargando(false);
    }
  };

  const cerrarSesion = async () => {
    await signOut(auth);
    setUsuario(null);
  };

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#f9fafb", display: "flex", flexDirection: "column" }}>
      <header style={{ backgroundColor: "white", padding: "16px 24px", borderBottom: "1px solid #e5e7eb", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h1 style={{ margin: 0, fontSize: "20px", color: "#111827", display: "flex", alignItems: "center", gap: "8px" }}>
          <ShieldCheck size={24} color="#16a34a" /> Ganadero Ganador
        </h1>
        <button onClick={cerrarSesion} style={{ background: "none", border: "none", cursor: "pointer", color: "#6b7280", display: "flex", alignItems: "center", gap: "6px" }}>
          <LogOut size={16} /> Cerrar sesión
        </button>
      </header>

      <main style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 20px" }}>
        <div style={{ textAlign: "center", maxWidth: "600px", marginBottom: "40px" }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: "6px", backgroundColor: "#fef3c7", color: "#92400e", padding: "6px 12px", borderRadius: "20px", fontSize: "13px", fontWeight: "600", marginBottom: "16px" }}>
            <Zap size={16} /> Tu periodo de prueba ha finalizado
          </div>
          <h2 style={{ fontSize: "32px", color: "#111827", marginBottom: "16px", marginTop: 0 }}>
            Continúa usando Ganadero Ganador
          </h2>
          <p style={{ fontSize: "16px", color: "#4b5563", lineHeight: "1.6", margin: 0 }}>
            Para seguir llevando el control total de tu rancho, elige un plan de suscripción. Todos los datos de tu ganado están guardados de forma segura.
          </p>
        </div>

        <div style={{ display: "flex", gap: "24px", flexWrap: "wrap", justifyContent: "center" }}>
          {/* Plan Mensual */}
          <div style={{ backgroundColor: "white", borderRadius: "12px", padding: "32px", width: "300px", boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)", border: "1px solid #e5e7eb", display: "flex", flexDirection: "column" }}>
            <h3 style={{ margin: "0 0 16px 0", fontSize: "18px", color: "#4b5563" }}>Plan Mensual</h3>
            <div style={{ marginBottom: "24px" }}>
              <span style={{ fontSize: "40px", fontWeight: "bold", color: "#111827" }}>$160</span>
              <span style={{ color: "#6b7280" }}> / mes (MXN)</span>
            </div>
            
            <ul style={{ listStyle: "none", padding: 0, margin: "0 0 32px 0", flex: 1 }}>
              {["Control ilimitado de ganado", "Gestión de potreros", "Reportes y finanzas", "Soporte técnico"].map((item, i) => (
                <li key={i} style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px", color: "#374151" }}>
                  <CheckCircle2 size={18} color="#16a34a" /> {item}
                </li>
              ))}
            </ul>

            <button 
              onClick={() => iniciarCheckout(PRICE_ID_MENSUAL)}
              disabled={cargando}
              style={{ backgroundColor: "white", color: "#16a34a", border: "2px solid #16a34a", padding: "12px", borderRadius: "8px", fontWeight: "600", fontSize: "16px", cursor: "pointer", transition: "all 0.2s" }}
            >
              {cargando ? "Cargando..." : "Elegir Mensual"}
            </button>
          </div>

          {/* Plan Anual */}
          <div style={{ backgroundColor: "#16a34a", borderRadius: "12px", padding: "32px", width: "300px", boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)", border: "2px solid #15803d", display: "flex", flexDirection: "column", position: "relative" }}>
            <div style={{ position: "absolute", top: "-12px", left: "50%", transform: "translateX(-50%)", backgroundColor: "#fcd34d", color: "#92400e", padding: "4px 12px", borderRadius: "20px", fontSize: "12px", fontWeight: "bold" }}>
              Ahorra $420 al año
            </div>
            <h3 style={{ margin: "0 0 16px 0", fontSize: "18px", color: "#dcfce7" }}>Plan Anual</h3>
            <div style={{ marginBottom: "24px", color: "white" }}>
              <span style={{ fontSize: "40px", fontWeight: "bold" }}>$1500</span>
              <span style={{ color: "#dcfce7" }}> / año (MXN)</span>
            </div>
            
            <ul style={{ listStyle: "none", padding: 0, margin: "0 0 32px 0", flex: 1, color: "white" }}>
              {["Todo lo del plan mensual", "2 meses y medio GRATIS", "Acceso prioritario a nuevas funciones"].map((item, i) => (
                <li key={i} style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
                  <CheckCircle2 size={18} color="#dcfce7" /> {item}
                </li>
              ))}
            </ul>

            <button 
              onClick={() => iniciarCheckout(PRICE_ID_ANUAL)}
              disabled={cargando}
              style={{ backgroundColor: "white", color: "#166534", border: "none", padding: "14px", borderRadius: "8px", fontWeight: "bold", fontSize: "16px", cursor: "pointer", display: "flex", justifyContent: "center", alignItems: "center", gap: "8px", boxShadow: "0 4px 6px rgba(0,0,0,0.1)" }}
            >
              {cargando ? "Cargando..." : <>Elegir Anual <ArrowRight size={18} /></>}
            </button>
          </div>
        </div>
        
        <div style={{ marginTop: "40px", color: "#6b7280", fontSize: "13px", display: "flex", alignItems: "center", gap: "6px" }}>
          <ShieldCheck size={16} /> Pagos seguros procesados por Stripe. Cancela en cualquier momento.
        </div>
      </main>
    </div>
  );
}
