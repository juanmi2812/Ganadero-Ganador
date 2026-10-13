import React, { useState, useEffect } from "react";
import { X, ShieldCheck, FileText, Lock, ChevronRight } from "lucide-react";
import { TERMINOS_Y_CONDICIONES, AVISO_DE_PRIVACIDAD } from "../legal/textosLegales";

export default function ModalLegal({ isOpen, onClose, tabInicial = "terminos" }) {
  const [tabActiva, setTabActiva] = useState(tabInicial);

  useEffect(() => {
    if (tabInicial) {
      setTabActiva(tabInicial);
    }
  }, [tabInicial, isOpen]);

  if (!isOpen) return null;

  const dataActual = tabActiva === "terminos" ? TERMINOS_Y_CONDICIONES : AVISO_DE_PRIVACIDAD;

  return (
    <div 
      className="modal-overlay" 
      onClick={onClose}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: "rgba(0, 0, 0, 0.65)",
        backdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        zIndex: 9999,
        padding: "16px"
      }}
    >
      <div 
        className="modal-content" 
        onClick={(e) => e.stopPropagation()}
        style={{
          backgroundColor: "#ffffff",
          borderRadius: "16px",
          width: "100%",
          maxWidth: "760px",
          maxHeight: "88vh",
          display: "flex",
          flexDirection: "column",
          boxShadow: "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
          overflow: "hidden"
        }}
      >
        {/* Header con tabs */}
        <div style={{ padding: "20px 24px 12px 24px", borderBottom: "1px solid #e5e7eb", backgroundColor: "#f9fafb" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div style={{ padding: "8px", backgroundColor: "#dcfce7", borderRadius: "10px", color: "#16a34a" }}>
                <ShieldCheck size={22} />
              </div>
              <div>
                <h3 style={{ margin: 0, fontSize: "18px", color: "#111827", fontWeight: "700" }}>
                  Marco Legal y de Privacidad
                </h3>
                <span style={{ fontSize: "12px", color: "#6b7280" }}>
                  Ganadero Ganador • Convivet
                </span>
              </div>
            </div>
            <button 
              onClick={onClose}
              style={{
                background: "#f3f4f6",
                border: "none",
                borderRadius: "50%",
                width: "36px",
                height: "36px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                cursor: "pointer",
                color: "#4b5563"
              }}
              title="Cerrar ventana"
            >
              <X size={20} />
            </button>
          </div>

          {/* Switch de pestañas */}
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={() => setTabActiva("terminos")}
              style={{
                flex: 1,
                padding: "10px 14px",
                borderRadius: "8px",
                border: "none",
                cursor: "pointer",
                fontWeight: "600",
                fontSize: "13px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                backgroundColor: tabActiva === "terminos" ? "#16a34a" : "#ffffff",
                color: tabActiva === "terminos" ? "#ffffff" : "#4b5563",
                boxShadow: tabActiva === "terminos" ? "0 2px 4px rgba(22, 163, 74, 0.2)" : "0 1px 2px rgba(0,0,0,0.05)",
                transition: "all 0.2s"
              }}
            >
              <FileText size={16} /> Términos y Condiciones
            </button>
            <button
              onClick={() => setTabActiva("privacidad")}
              style={{
                flex: 1,
                padding: "10px 14px",
                borderRadius: "8px",
                border: "none",
                cursor: "pointer",
                fontWeight: "600",
                fontSize: "13px",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: "8px",
                backgroundColor: tabActiva === "privacidad" ? "#16a34a" : "#ffffff",
                color: tabActiva === "privacidad" ? "#ffffff" : "#4b5563",
                boxShadow: tabActiva === "privacidad" ? "0 2px 4px rgba(22, 163, 74, 0.2)" : "0 1px 2px rgba(0,0,0,0.05)",
                transition: "all 0.2s"
              }}
            >
              <Lock size={16} /> Aviso de Privacidad
            </button>
          </div>
        </div>

        {/* Contenido con scroll */}
        <div style={{ padding: "24px", overflowY: "auto", flex: 1, lineHeight: "1.6", color: "#374151", fontSize: "14px" }}>
          <div style={{ marginBottom: "20px", borderBottom: "1px solid #f3f4f6", paddingBottom: "12px" }}>
            <h2 style={{ fontSize: "20px", color: "#111827", margin: "0 0 6px 0", fontWeight: "700" }}>
              {dataActual.titulo}
            </h2>
            <div style={{ fontSize: "12px", color: "#9ca3af" }}>
              Última actualización: {dataActual.ultimaActualizacion}
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
            {dataActual.secciones.map((sec) => (
              <div 
                key={sec.numero}
                style={{
                  backgroundColor: "#f9fafb",
                  padding: "16px 18px",
                  borderRadius: "10px",
                  border: "1px solid #e5e7eb"
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px" }}>
                  <span style={{ 
                    backgroundColor: "#16a34a", 
                    color: "white", 
                    borderRadius: "6px", 
                    fontSize: "11px", 
                    fontWeight: "bold", 
                    padding: "2px 8px" 
                  }}>
                    {sec.numero}
                  </span>
                  <h4 style={{ margin: 0, fontSize: "15px", color: "#111827", fontWeight: "700" }}>
                    {sec.titulo}
                  </h4>
                </div>
                <div style={{ fontSize: "13px", color: "#4b5563", whiteSpace: "pre-line" }}>
                  {sec.contenido}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Footer del Modal */}
        <div style={{ padding: "14px 24px", borderTop: "1px solid #e5e7eb", backgroundColor: "#f9fafb", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontSize: "12px", color: "#6b7280" }}>
            Contacto oficial: <strong>contacto.ganadero.ganador@gmail.com</strong>
          </span>
          <button 
            onClick={onClose}
            className="btn-primary"
            style={{ 
              margin: 0, 
              padding: "8px 22px", 
              fontSize: "14px", 
              backgroundColor: "#16a34a",
              borderColor: "#16a34a",
              cursor: "pointer" 
            }}
          >
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}
