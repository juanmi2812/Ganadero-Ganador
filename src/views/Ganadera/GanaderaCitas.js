import React, { useState, useEffect } from "react";
import { collection, query, where, onSnapshot, doc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase";
import { CheckCircle, XCircle, Clock, Eye } from "lucide-react";
import { format } from "date-fns";

export default function GanaderaCitas({ usuario }) {
  const [citas, setCitas] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [citaSeleccionada, setCitaSeleccionada] = useState(null);

  // Permiso para aprobar (admin o empleado con permiso)
  const puedeAprobar = usuario.rol === "admin_ganadera" || usuario.permisos?.aprobarCitas === true;

  useEffect(() => {
    if (!usuario?.ganaderaId) return;
    
    // Escuchar citas pendientes de esta ganadera
    const q = query(
      collection(db, "citas_movilizacion"), 
      where("ganaderaId", "==", usuario.ganaderaId),
      where("estado", "==", "Pendiente")
    );

    const unsub = onSnapshot(q, (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      // Ordenar localmente por fecha
      data.sort((a, b) => new Date(`${a.fechaCita}T${a.horaCita}`) - new Date(`${b.fechaCita}T${b.horaCita}`));
      setCitas(data);
      setCargando(false);
    });

    return () => unsub();
  }, [usuario.ganaderaId]);

  const cambiarEstadoCita = async (id, nuevoEstado) => {
    if (!puedeAprobar) {
      alert("No tienes permiso para aprobar o rechazar citas.");
      return;
    }

    try {
      await updateDoc(doc(db, "citas_movilizacion", id), {
        estado: nuevoEstado,
        fechaActualizacion: new Date().toISOString(),
        actualizadoPor: usuario.nombre
      });
      if (citaSeleccionada?.id === id) {
        setCitaSeleccionada(null);
      }
    } catch (err) {
      alert("Error al actualizar la cita: " + err.message);
    }
  };

  if (cargando) return <div style={{ textAlign: "center", padding: "20px" }}>Cargando bandeja de citas...</div>;

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h2 style={{ margin: 0, color: "#111827" }}>Bandeja de Citas Pendientes</h2>
        <div style={{ background: "#fef3c7", color: "#d97706", padding: "5px 12px", borderRadius: "20px", fontWeight: "bold", fontSize: "14px" }}>
          {citas.length} {citas.length === 1 ? "Solicitud" : "Solicitudes"}
        </div>
      </div>

      {!puedeAprobar && (
        <div style={{ backgroundColor: "#fee2e2", color: "#991b1b", padding: "10px", borderRadius: "8px", marginBottom: "15px", fontSize: "13px" }}>
          Modo Solo Lectura: No tienes permiso para aprobar o rechazar citas.
        </div>
      )}

      {citas.length === 0 ? (
        <div className="card" style={{ padding: "40px", textAlign: "center", color: "#6b7280" }}>
          <Clock size={48} color="#d1d5db" style={{ margin: "0 auto 15px" }} />
          <h3>No hay citas pendientes</h3>
          <p>Todas las solicitudes de movilización han sido procesadas.</p>
        </div>
      ) : (
        <div style={{ display: "grid", gap: "15px" }}>
          {citas.map(cita => (
            <div key={cita.id} className="card" style={{ padding: "0", overflow: "hidden", borderLeft: "4px solid #f59e0b" }}>
              <div style={{ padding: "15px 20px", display: "flex", justifyContent: "space-between", alignItems: "center", backgroundColor: "white" }}>
                <div>
                  <div style={{ fontWeight: "bold", color: "#111827", fontSize: "16px", marginBottom: "4px" }}>
                    {cita.ranchoNombre}
                  </div>
                  <div style={{ color: "#4b5563", fontSize: "14px", display: "flex", gap: "15px" }}>
                    <span>📅 {format(new Date(`${cita.fechaCita}T00:00:00`), "dd/MM/yyyy")} a las {cita.horaCita}</span>
                    <span>🐄 {cita.animales?.length || 0} cabezas ({cita.tipoMovimiento})</span>
                  </div>
                </div>
                <div style={{ display: "flex", gap: "10px" }}>
                  <button onClick={() => setCitaSeleccionada(citaSeleccionada?.id === cita.id ? null : cita)} style={{ display: "flex", alignItems: "center", gap: "5px", padding: "8px 12px", borderRadius: "8px", border: "1px solid #d1d5db", background: "white", cursor: "pointer", fontWeight: "600", color: "#374151" }}>
                    <Eye size={16} /> Ver Detalles
                  </button>
                  {puedeAprobar && (
                    <>
                      <button onClick={() => cambiarEstadoCita(cita.id, "Aprobada")} style={{ display: "flex", alignItems: "center", gap: "5px", padding: "8px 12px", borderRadius: "8px", border: "none", background: "#10b981", color: "white", cursor: "pointer", fontWeight: "600" }}>
                        <CheckCircle size={16} /> Aprobar
                      </button>
                      <button onClick={() => cambiarEstadoCita(cita.id, "Rechazada")} style={{ display: "flex", alignItems: "center", gap: "5px", padding: "8px 12px", borderRadius: "8px", border: "none", background: "#ef4444", color: "white", cursor: "pointer", fontWeight: "600" }}>
                        <XCircle size={16} /> Rechazar
                      </button>
                    </>
                  )}
                </div>
              </div>

              {citaSeleccionada?.id === cita.id && (
                <div style={{ padding: "20px", backgroundColor: "#f9fafb", borderTop: "1px solid #e5e7eb" }}>
                  <h4 style={{ margin: "0 0 10px 0", color: "#374151" }}>Información del Movimiento</h4>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px", marginBottom: "20px", fontSize: "14px" }}>
                    <div><strong>Destino:</strong> {cita.destinoNombre}</div>
                    <div><strong>UPP Destino:</strong> {cita.destinoUPP}</div>
                    <div><strong>Chofer:</strong> {cita.chofer}</div>
                    <div><strong>Placas:</strong> {cita.placas}</div>
                  </div>
                  
                  <h4 style={{ margin: "0 0 10px 0", color: "#374151" }}>Animales ({cita.animales?.length})</h4>
                  <div style={{ maxHeight: "200px", overflowY: "auto", border: "1px solid #d1d5db", borderRadius: "8px", backgroundColor: "white" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px" }}>
                      <thead>
                        <tr style={{ backgroundColor: "#f3f4f6", borderBottom: "1px solid #d1d5db" }}>
                          <th style={{ padding: "8px", textAlign: "left" }}>Arete</th>
                          <th style={{ padding: "8px", textAlign: "left" }}>Categoría</th>
                          <th style={{ padding: "8px", textAlign: "left" }}>Sexo</th>
                          <th style={{ padding: "8px", textAlign: "left" }}>Peso</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cita.animales?.map((a, i) => (
                          <tr key={i} style={{ borderBottom: "1px solid #e5e7eb" }}>
                            <td style={{ padding: "8px" }}>{a.arete}</td>
                            <td style={{ padding: "8px" }}>{a.tipo}</td>
                            <td style={{ padding: "8px" }}>{a.sexo}</td>
                            <td style={{ padding: "8px" }}>{a.pesoActual} kg</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
