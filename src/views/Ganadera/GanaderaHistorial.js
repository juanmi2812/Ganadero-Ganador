import React, { useState, useEffect } from "react";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { db } from "../../firebase";
import { format } from "date-fns";

export default function GanaderaHistorial({ usuario }) {
  const [historial, setHistorial] = useState([]);
  const [cargando, setCargando] = useState(true);

  // Permiso para ver historial
  const puedeVer = usuario.rol === "admin_ganadera" || usuario.permisos?.verHistorial === true;

  useEffect(() => {
    if (!usuario?.ganaderaId) return;
    if (!puedeVer) {
      setCargando(false);
      return;
    }
    
    // Escuchar citas aprobadas o rechazadas (Historial)
    const q = query(
      collection(db, "citas_movilizacion"), 
      where("ganaderaId", "==", usuario.ganaderaId)
    );

    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .filter(c => c.estado === "Aprobada" || c.estado === "Rechazada"); // Solo historial
      
      // Ordenar localmente por fecha de actualización o de cita
      data.sort((a, b) => new Date(b.fechaActualizacion || b.fechaCreacion) - new Date(a.fechaActualizacion || a.fechaCreacion));
      setHistorial(data);
      setCargando(false);
    });

    return () => unsub();
  }, [usuario.ganaderaId, puedeVer]);

  if (!puedeVer) {
    return (
      <div className="card" style={{ padding: "40px", textAlign: "center", color: "#991b1b", backgroundColor: "#fee2e2" }}>
        <h3>Acceso Denegado</h3>
        <p>No tienes permiso para ver el historial de movimientos.</p>
      </div>
    );
  }

  if (cargando) return <div style={{ textAlign: "center", padding: "20px" }}>Cargando historial...</div>;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h2 style={{ margin: 0, color: "#111827" }}>Historial de Movimientos</h2>
        <div style={{ background: "#e5e7eb", color: "#374151", padding: "5px 12px", borderRadius: "20px", fontWeight: "bold", fontSize: "14px" }}>
          {historial.length} Registros
        </div>
      </div>

      {historial.length === 0 ? (
        <div className="card" style={{ padding: "40px", textAlign: "center", color: "#6b7280" }}>
          <h3>El historial está vacío</h3>
          <p>Aún no se han procesado (aprobado o rechazado) citas de movilización.</p>
        </div>
      ) : (
        <div className="card" style={{ padding: "0", overflow: "hidden" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px", textAlign: "left" }}>
            <thead>
              <tr style={{ backgroundColor: "#f3f4f6", borderBottom: "1px solid #d1d5db", color: "#374151" }}>
                <th style={{ padding: "12px 15px" }}>Fecha de Cita</th>
                <th style={{ padding: "12px 15px" }}>Rancho Origen</th>
                <th style={{ padding: "12px 15px" }}>Estatus</th>
                <th style={{ padding: "12px 15px" }}>Cabezas</th>
                <th style={{ padding: "12px 15px" }}>Procesado Por</th>
              </tr>
            </thead>
            <tbody>
              {historial.map(cita => (
                <tr key={cita.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                  <td style={{ padding: "12px 15px" }}>{format(new Date(`${cita.fechaCita}T00:00:00`), "dd/MM/yyyy")} {cita.horaCita}</td>
                  <td style={{ padding: "12px 15px", fontWeight: "bold", color: "#111827" }}>{cita.ranchoNombre}</td>
                  <td style={{ padding: "12px 15px" }}>
                    <span style={{ 
                      padding: "4px 8px", borderRadius: "12px", fontSize: "12px", fontWeight: "bold",
                      backgroundColor: cita.estado === "Aprobada" ? "#dcfce7" : "#fee2e2",
                      color: cita.estado === "Aprobada" ? "#166534" : "#991b1b"
                    }}>
                      {cita.estado}
                    </span>
                  </td>
                  <td style={{ padding: "12px 15px" }}>{cita.animales?.length || 0}</td>
                  <td style={{ padding: "12px 15px", color: "#6b7280" }}>{cita.actualizadoPor || "N/A"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
