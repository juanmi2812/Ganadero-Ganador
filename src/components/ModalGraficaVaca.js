import React, { useState, useEffect } from "react";
import { X, TrendingUp } from "lucide-react";
import { collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

export default function ModalGraficaVaca({ onClose, usuario, animalId, animalArete }) {
  const [datosGrafica, setDatosGrafica] = useState([]);
  const [cargando, setCargando] = useState(true);

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

        // Filtrar últimos 300 días
        const hace300Dias = new Date();
        hace300Dias.setDate(hace300Dias.getDate() - 300);

        const filtrados = records.filter(r => new Date(r.fecha) >= hace300Dias);
        
        // Ordenar cronológicamente ascendente para la gráfica
        filtrados.sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

        const chartData = filtrados.map(r => ({
          fecha: r.fecha.substring(5), // Muestra MM-DD
          Litros: r.litros
        }));

        setDatosGrafica(chartData);
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
            Producción últimos 300 días: {animalArete}
          </h2>
          <button className="close-btn" onClick={onClose}><X size={24} /></button>
        </div>

        <div className="modal-body">
          {cargando ? (
            <p style={{ textAlign: "center", color: "#6b7280", padding: "40px 0" }}>Cargando datos...</p>
          ) : datosGrafica.length > 0 ? (
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
              No hay registros de producción para esta vaca en los últimos 300 días.
            </p>
          )}
          
          <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "24px" }}>
            <button className="btn-primary" onClick={onClose}>Cerrar</button>
          </div>
        </div>
      </div>
    </div>
  );
}
