import React from "react";
// Importamos tu logo Convivet (formato JPG)
import logoConvivet from "../assets/logo_convivet.jpg"; 

export default function Header({ subtitle }) {
  return (
    <div
      className="header-bar"
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "16px 24px",
        backgroundColor: "white",
        borderBottom: "1px solid #e5e7eb",
        marginBottom: "24px",
        borderRadius: "12px",
        boxShadow: "0 1px 2px 0 rgba(0, 0, 0, 0.05)"
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        {/* El Logo Adaptado: Controlamos la altura para claridad y elegancia */}
        <img
          src={logoConvivet}
          alt="Convivet Logo"
          style={{
            height: "40px", // Un tamaño perfecto que destaca sin abrumar
            width: "auto",
            display: "block"
          }}
        />
        
        {/* El Título de la App: Lo alineamos con el logo */}
        <div style={{ borderLeft: "1px solid #e5e7eb", paddingLeft: "16px" }}>
          <h1
            style={{
              margin: 0,
              fontSize: "20px",
              fontWeight: "bold",
              color: "#111827",
              lineHeight: "1.2"
            }}
          >
            Control Ganadero
          </h1>
          {subtitle && (
            <p
              style={{
                margin: "2px 0 0 0",
                fontSize: "13px",
                color: "#6b7280"
              }}
            >
              {subtitle}
            </p>
          )}
        </div>
      </div>
      
      {/* Espacio para elementos a la derecha, como perfil o notificaciones */}
      <div></div>
    </div>
  );
}