import React, { useState, useEffect } from "react";
import { X, TrendingUp, List, BarChart2, Calendar } from "lucide-react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

export default function ModalGraficaVaca({ onClose, usuario, animalId, animalArete }) {
  const [datosGrafica, setDatosGrafica] = useState([]);
  const [datosLista, setDatosLista] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [vistaActiva, setVistaActiva] = useState("grafica"); // 'grafica' o 'lista'

  useEffect(() => {
    const cargarDatos = async () => {
      try {
        const q = query(
          collection(db, "produccion_leche_individual"),
          where("ranchoId", "==", usuario.ranchoId),
          where("animalId", "==", animalId)
        );
        const snap = await getDocs(q);
        const records = snap.docs.map(d => ({ id: d.id, ...d.data() }));

        // Filtrar últimos 10 meses
        const hace10Meses = new Date();
        hace10Meses.setMonth(hace10Meses.getMonth() - 10);

        const filtrados = records.filter(r => new Date(r.fecha) >= hace10Meses);
        
        // Ordenar cronológicamente ascendente para la gráfica
        const paraGrafica = [...filtrados].sort((a, b) => new Date(a.fecha) - new Date(b.fecha));
        const chartData = paraGrafica.map(r => ({
          fecha: r.fecha.substring(5), // Muestra MM-DD
          Litros: r.litros
        }));

        // Ordenar cronológicamente descendente para la lista
        const paraLista = [...records].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

        setDatosGrafica(chartData);
        setDatosLista(paraLista);
      } catch (err) {
        console.error("Error cargando gráfica de vaca:", err);
      }
      setCargando(false);
    };

    if (animalId) {
      cargarDatos();
    }
  }, [usuario.ranchoId, animalId]);

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: "800px", width: "100%" }}>
        <div className="modal-header">
          <h2 style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <TrendingUp size={24} color="#9333ea" /> 
            Historial de Producción: {animalArete}
          </h2>
          <button className="close-btn" onClick={onClose}><X size={24} /></button>
        </div>

        <div className="modal-body">
          <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
            <button 
              onClick={() => setVistaActiva("grafica")}
              style={{ flex: 1, padding: "10px", backgroundColor: vistaActiva === "grafica" ? "#9333ea" : "#f3f4f6", color: vistaActiva === "grafica" ? "white" : "#4b5563", border: "none", borderRadius: "8px", fontWeight: "bold", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", transition: "0.2s" }}
            >
               <BarChart2 size={18}/> Gráfica (Últimos 10 meses)
            </button>
            <button 
              onClick={() => setVistaActiva("lista")}
              style={{ flex: 1, padding: "10px", backgroundColor: vistaActiva === "lista" ? "#9333ea" : "#f3f4f6", color: vistaActiva === "lista" ? "white" : "#4b5563", border: "none", borderRadius: "8px", fontWeight: "bold", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", transition: "0.2s" }}
            >
               <List size={18}/> Lista Detallada
            </button>
          </div>

          {cargando ? (
            <p style={{ textAlign: "center", color: "#6b7280", padding: "40px 0" }}>Cargando datos...</p>
          ) : vistaActiva === "grafica" ? (
            datosGrafica.length > 0 ? (
              <div style={{ width: "100%", height: "400px" }}>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={datosGrafica}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="fecha" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="Litros" stroke="#9333ea" strokeWidth={3} activeDot={{ r: 8 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p style={{ textAlign: "center", color: "#6b7280", padding: "40px 0" }}>
                No hay registros de producción para esta vaca en los últimos 10 meses.
              </p>
            )
          ) : (
            <div style={{ maxHeight: "400px", overflowY: "auto", border: "1px solid #e5e7eb", borderRadius: "8px" }}>
              {datosLista.length > 0 ? (
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
                  <thead style={{ position: "sticky", top: 0, backgroundColor: "#f3f4f6", zIndex: 1 }}>
                    <tr style={{ color: "#4b5563", textAlign: "left" }}>
                      <th style={{ padding: "12px", borderBottom: "1px solid #e5e7eb" }}>Fecha</th>
                      <th style={{ padding: "12px", borderBottom: "1px solid #e5e7eb" }}>Periodo</th>
                      <th style={{ padding: "12px", borderBottom: "1px solid #e5e7eb" }}>Litros</th>
                    </tr>
                  </thead>
                  <tbody>
                    {datosLista.map(r => (
                      <tr key={r.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                        <td style={{ padding: "12px", color: "#111827", display: "flex", alignItems: "center", gap: "6px" }}><Calendar size={14} color="#6b7280"/> {r.fecha}</td>
                        <td style={{ padding: "12px" }}>
                          <span style={{ backgroundColor: r.periodo && r.periodo !== "Diario" ? "#fef3c7" : "#f3f4f6", color: r.periodo && r.periodo !== "Diario" ? "#92400e" : "#4b5563", padding: "4px 8px", borderRadius: "4px", fontSize: "12px", fontWeight: "500" }}>
                            {r.periodo || "Diario"}
                          </span>
                        </td>
                        <td style={{ padding: "12px", fontWeight: "600", color: "#9333ea" }}>{r.litros} L</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p style={{ textAlign: "center", color: "#6b7280", padding: "40px 0" }}>
                  No hay registros de producción para esta vaca.
                </p>
              )}
            </div>
          )}
          
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "24px" }}>
            <button className="btn-primary" onClick={onClose}>Cerrar</button>
          </div>
        </div>
      </div>
    </div>
  );
}
