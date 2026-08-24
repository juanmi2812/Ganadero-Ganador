import React from "react";

export default function Header({ subtitle, title = "Mi Ganado", children, logo }) {
  return (
    <div style={{ marginBottom: "20px", paddingBottom: "16px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
        {logo && <img src={logo} alt={title} style={{ width: "64px", height: "64px", objectFit: "contain", borderRadius: "12px", border: "1px solid #e5e7eb", backgroundColor: "white" }} />}
        <div>
          <h1 style={{
            margin: 0,
            fontSize: "22px",
            fontWeight: 800,
            color: "#111827",
            letterSpacing: "-0.3px",
          }}>
            {title}
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
      </div>
      {children && (
        <div>
          {children}
        </div>
      )}
    </div>
  );
}