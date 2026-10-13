import React, { useState } from 'react';
import { Map, BookOpen, BarChart3, Trophy, Truck, LogOut, Download, ShieldCheck } from 'lucide-react';
import ModalLegal from '../components/ModalLegal';

export default function MenuMas({ setVistaActiva, cerrarSesion }) {
  const [modalLegalAbierto, setModalLegalAbierto] = useState(false);

  const menuItems = [
    { id: "rancho", label: "Mi Rancho", icon: Map, color: "#10b981", desc: "Configura tus potreros y UPPs" },
    { id: "bitacoras", label: "Bitácoras", icon: BookOpen, color: "#f59e0b", desc: "Registro histórico y tratamientos" },
    { id: "reportes", label: "Reportes", icon: BarChart3, color: "#3b82f6", desc: "Análisis y gráficas de tu ganado" },
    { id: "benchmark", label: "Ranking Regional", icon: Trophy, color: "#8b5cf6", desc: "Compara tu rancho con otros" },
    { id: "movilizacion", label: "Movilización", icon: Truck, color: "#0ea5e9", desc: "Guías de tránsito y citas ganaderas" },
    { id: "legal", label: "Legal y Privacidad", icon: ShieldCheck, color: "#6366f1", desc: "Términos del servicio y aviso de privacidad" },
  ];

  return (
    <div className="dashboard-container" style={{ padding: "20px", paddingBottom: "100px", maxWidth: "1200px", margin: "0 auto" }}>
      <h1 style={{ margin: "0 0 20px 0", fontSize: "24px", color: "#111827" }}>Menú Principal</h1>
      
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "16px" }}>
        {menuItems.map(item => {
          const Icon = item.icon;
          return (
            <button 
              key={item.id} 
              className="card" 
              onClick={() => {
                if (item.id === "legal") {
                  setModalLegalAbierto(true);
                } else {
                  setVistaActiva(item.id);
                }
              }}
              style={{ display: "flex", alignItems: "center", gap: "16px", padding: "20px", cursor: "pointer", border: "none", textAlign: "left", width: "100%", background: "white", borderRadius: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}
            >
              <div style={{ padding: "12px", borderRadius: "12px", backgroundColor: `${item.color}15`, color: item.color }}>
                <Icon size={28} />
              </div>
              <div>
                <div style={{ fontWeight: "700", fontSize: "16px", color: "#111827" }}>{item.label}</div>
                <div style={{ fontSize: "13px", color: "#6b7280", marginTop: "2px" }}>{item.desc}</div>
              </div>
            </button>
          )
        })}
      </div>
      
      <div style={{ marginTop: "30px" }}>
        <button 
          onClick={cerrarSesion}
          style={{ display: "flex", alignItems: "center", gap: "10px", padding: "16px", width: "100%", background: "#fee2e2", border: "1px solid #fca5a5", borderRadius: "12px", color: "#b91c1c", fontWeight: "700", cursor: "pointer", justifyContent: "center" }}
        >
          <LogOut size={20} /> Cerrar Sesión
        </button>
      </div>

      <ModalLegal 
        isOpen={modalLegalAbierto} 
        onClose={() => setModalLegalAbierto(false)} 
        tabInicial="terminos" 
      />
    </div>
  )
}
