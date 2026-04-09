import React from "react";

export default function Header({ subtitle }) {
  return (
    <div style={{ marginBottom: "20px", paddingBottom: "16px" }}>
      <h1 style={{
        margin: 0,
        fontSize: "22px",
        fontWeight: 800,
        color: "#111827",
        letterSpacing: "-0.3px",
      }}>
        Mi Ganado
      </h1>
      {subtitle && (
        <p style={{
          margin: "4px 0 0 0",
          fontSize: "14px",
          color: "#9ca3af",
        }}>
          {subtitle}
        </p>
      )}
    </div>
  );
}