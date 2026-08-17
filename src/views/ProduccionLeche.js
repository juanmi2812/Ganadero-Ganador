import React, { useState, useEffect } from "react";
import { Droplet, Plus, List, BarChart2, Calendar } from "lucide-react";
import { collection, query, where, orderBy, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from "recharts";

import ModalRegistroLecheIndividual from "../components/ModalRegistroLecheIndividual";
import ModalRegistroLecheTanque from "../components/ModalRegistroLecheTanque";
import ModalGraficaVaca from "../components/ModalGraficaVaca";

export default function ProduccionLeche({ usuario }) {
  const [modalIndividual, setModalIndividual] = useState(false);
  const [modalTanque, setModalTanque] = useState(false);
  const [vacaGrafica, setVacaGrafica] = useState(null);
  
  const [registrosTanque, setRegistrosTanque] = useState([]);
  const [registrosIndividuales, setRegistrosIndividuales] = useState([]);
  const [cargando, setCargando] = useState(true);
  
  const [pestanaHistorial, setPestanaHistorial] = useState("tanque");

  const cargarDatos = async () => {
    setCargando(true);
    try {
      // Cargar Tanque
      const qTanque = query(
        collection(db, "produccion_leche_tanque"),
        where("ranchoId", "==", usuario.ranchoId)
      );
      const snapTanque = await getDocs(qTanque);
      const dataTanque = snapTanque.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));

      // Calcular variación porcentual
      dataTanque.forEach((record, index) => {
        if (index < dataTanque.length - 1) {
          const prev = dataTanque[index + 1];
          const diff = record.litrosTotales - prev.litrosTotales;
          record.variacion = prev.litrosTotales > 0 ? (diff / prev.litrosTotales) * 100 : 0;
        } else {
          record.variacion = null;
        }
      });
      
      setRegistrosTanque(dataTanque);

      // Cargar Individuales
      const qIndiv = query(
        collection(db, "produccion_leche_individual"),
        where("ranchoId", "==", usuario.ranchoId)
      );
      const snapIndiv = await getDocs(qIndiv);
      const dataIndiv = snapIndiv.docs
        .map(d => ({ id: d.id, ...d.data() }))
        .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
      setRegistrosIndividuales(dataIndiv);
      
    } catch (err) {
      console.error("Error al cargar producción de leche:", err);
    }
    setCargando(false);
  };

  useEffect(() => {
    cargarDatos();
  }, [usuario.ranchoId]);

  // Preparar datos para gráfica (Últimos 10 registros de tanque)
  const datosGrafica = registrosTanque
    .slice(0, 10)
    .reverse()
    .map(r => ({
      fecha: r.fecha.substring(5), // Muestra MM-DD
      "Venta": r.litrosVenta || 0,
      "Crías": r.litrosCrias || 0,
      "Autoconsumo": r.litrosAutoconsumo || 0
    }));

  // Preparar historial individual agrupado
  const vacasAgrupadasMap = {};
  registrosIndividuales.forEach(r => {
    const arete = r.animalArete || "N/A";
    if (!vacasAgrupadasMap[arete]) {
      vacasAgrupadasMap[arete] = {
        animalId: r.animalId,
        animalArete: arete,
        animalAreteRancho: r.animalAreteRancho,
        ultimoRegistro: r.fecha,
        ultimoLitros: r.litros,
        totalLitros: 0,
        conteo: 0
      };
    }
    vacasAgrupadasMap[arete].totalLitros += Number(r.litros) || 0;
    vacasAgrupadasMap[arete].conteo += 1;
    
    // Asumimos que están ordenados por fecha desc, así que el primero que entra es el último registro, pero por si acaso:
    if (new Date(r.fecha) > new Date(vacasAgrupadasMap[arete].ultimoRegistro)) {
       vacasAgrupadasMap[arete].ultimoRegistro = r.fecha;
       vacasAgrupadasMap[arete].ultimoLitros = r.litros;
    }
  });

  const vacasAgrupadas = Object.values(vacasAgrupadasMap).sort((a, b) => new Date(b.ultimoRegistro) - new Date(a.ultimoRegistro));

  return (
    <div className="dashboard-container" style={{ padding: "20px", paddingBottom: "100px", maxWidth: "1200px", margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "30px" }}>
        <div style={{ backgroundColor: "#e0f2fe", padding: "12px", borderRadius: "12px" }}>
          <Droplet size={28} color="#0284c7" />
        </div>
        <div>
          <h1 style={{ margin: 0, fontSize: "24px", color: "#111827" }}>Producción de Leche</h1>
          <p style={{ margin: 0, color: "#6b7280", fontSize: "14px" }}>Control y registro lechero de tu rancho</p>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "20px", marginBottom: "40px" }}>
        <button 
          onClick={() => setModalTanque(true)}
          style={{ backgroundColor: "white", padding: "24px", borderRadius: "12px", border: "1px solid #e5e7eb", display: "flex", flexDirection: "column", alignItems: "center", gap: "12px", cursor: "pointer", transition: "all 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}
          className="hover-card"
        >
          <div style={{ backgroundColor: "#dbeafe", padding: "16px", borderRadius: "50%" }}>
            <BarChart2 size={32} color="#2563eb" />
          </div>
          <h3 style={{ margin: 0, color: "#1f2937", fontSize: "18px" }}>Registro en Tanque</h3>
          <p style={{ margin: 0, color: "#6b7280", fontSize: "13px", textAlign: "center" }}>Registra la producción diaria global, crías y autoconsumo.</p>
        </button>

        <button 
          onClick={() => setModalIndividual(true)}
          style={{ backgroundColor: "white", padding: "24px", borderRadius: "12px", border: "1px solid #e5e7eb", display: "flex", flexDirection: "column", alignItems: "center", gap: "12px", cursor: "pointer", transition: "all 0.2s", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}
          className="hover-card"
        >
          <div style={{ backgroundColor: "#f3e8ff", padding: "16px", borderRadius: "50%" }}>
            <List size={32} color="#9333ea" />
          </div>
          <h3 style={{ margin: 0, color: "#1f2937", fontSize: "18px" }}>Registro Individual</h3>
          <p style={{ margin: 0, color: "#6b7280", fontSize: "13px", textAlign: "center" }}>Anota cuántos litros dio una vaca específica hoy.</p>
        </button>
      </div>

      {datosGrafica.length > 0 && (
        <div className="card" style={{ padding: "24px", marginBottom: "30px", backgroundColor: "white", borderRadius: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", border: "1px solid #e5e7eb" }}>
          <h3 style={{ margin: "0 0 20px 0", color: "#111827", display: "flex", alignItems: "center", gap: "8px" }}>
            <BarChart2 size={20} /> Producción de los últimos {datosGrafica.length} registros (Tanque)
          </h3>
          <div style={{ width: "100%", height: "300px" }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={datosGrafica}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="fecha" />
                <YAxis />
                <Tooltip />
                <Legend />
                <Bar dataKey="Venta" stackId="a" fill="#10b981" name="Venta" />
                <Bar dataKey="Crías" stackId="a" fill="#f59e0b" name="Crías" />
                <Bar dataKey="Autoconsumo" stackId="a" fill="#3b82f6" name="Autoconsumo" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      <div className="card" style={{ backgroundColor: "white", borderRadius: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", border: "1px solid #e5e7eb", overflow: "hidden" }}>
        <div style={{ display: "flex", borderBottom: "1px solid #e5e7eb" }}>
          <button 
            onClick={() => setPestanaHistorial("tanque")}
            style={{ flex: 1, padding: "16px", backgroundColor: pestanaHistorial === "tanque" ? "white" : "#f9fafb", border: "none", borderBottom: pestanaHistorial === "tanque" ? "2px solid #2563eb" : "2px solid transparent", fontWeight: pestanaHistorial === "tanque" ? "600" : "400", color: pestanaHistorial === "tanque" ? "#2563eb" : "#6b7280", cursor: "pointer", transition: "0.2s" }}
          >
            Historial de Tanque
          </button>
          <button 
            onClick={() => setPestanaHistorial("individual")}
            style={{ flex: 1, padding: "16px", backgroundColor: pestanaHistorial === "individual" ? "white" : "#f9fafb", border: "none", borderBottom: pestanaHistorial === "individual" ? "2px solid #9333ea" : "2px solid transparent", fontWeight: pestanaHistorial === "individual" ? "600" : "400", color: pestanaHistorial === "individual" ? "#9333ea" : "#6b7280", cursor: "pointer", transition: "0.2s" }}
          >
            Historial Individual
          </button>
        </div>

        <div style={{ padding: "20px" }}>
          {cargando ? (
            <p style={{ textAlign: "center", color: "#6b7280" }}>Cargando registros...</p>
          ) : pestanaHistorial === "tanque" ? (
            registrosTanque.length > 0 ? (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
                  <thead>
                    <tr style={{ backgroundColor: "#f3f4f6", color: "#4b5563", textAlign: "left" }}>
                      <th style={{ padding: "12px", borderBottom: "1px solid #e5e7eb" }}>Fecha</th>
                      <th style={{ padding: "12px", borderBottom: "1px solid #e5e7eb" }}>Totales</th>
                      <th style={{ padding: "12px", borderBottom: "1px solid #e5e7eb" }}>Variación</th>
                      <th style={{ padding: "12px", borderBottom: "1px solid #e5e7eb" }}>Venta</th>
                      <th style={{ padding: "12px", borderBottom: "1px solid #e5e7eb" }}>Crías</th>
                      <th style={{ padding: "12px", borderBottom: "1px solid #e5e7eb" }}>Autoconsumo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {registrosTanque.map(r => (
                      <tr key={r.id} style={{ borderBottom: "1px solid #e5e7eb" }}>
                        <td style={{ padding: "12px", color: "#111827", display: "flex", alignItems: "center", gap: "6px" }}><Calendar size={14} color="#6b7280"/> {r.fecha}</td>
                        <td style={{ padding: "12px", fontWeight: "600" }}>{r.litrosTotales} L</td>
                        <td style={{ padding: "12px", fontWeight: "600", color: r.variacion !== null ? (r.variacion >= 10 ? "#dc2626" : (r.variacion > 0 ? "#16a34a" : (r.variacion < 0 ? "#ea580c" : "#6b7280"))) : "#6b7280" }}>
                          {r.variacion !== null ? (
                            <span style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                              {r.variacion >= 10 && <span title="¡Alerta! Variación superior al 10%">⚠️</span>}
                              {r.variacion > 0 ? "▲" : (r.variacion < 0 ? "▼" : "-")} {Math.abs(r.variacion).toFixed(1)}%
                            </span>
                          ) : "-"}
                        </td>
                        <td style={{ padding: "12px", color: "#16a34a" }}>{r.litrosVenta} L</td>
                        <td style={{ padding: "12px", color: "#d97706" }}>{r.litrosCrias} L</td>
                        <td style={{ padding: "12px", color: "#2563eb" }}>{r.litrosAutoconsumo} L</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p style={{ textAlign: "center", color: "#6b7280", padding: "20px 0" }}>No hay registros de tanque aún.</p>
            )
          ) : (
            registrosIndividuales.length > 0 ? (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
                  <thead>
                    <tr style={{ backgroundColor: "#f3f4f6", color: "#4b5563", textAlign: "left" }}>
                      <th style={{ padding: "12px", borderBottom: "1px solid #e5e7eb" }}>Vaca (Arete)</th>
                      <th style={{ padding: "12px", borderBottom: "1px solid #e5e7eb" }}>Último Registro</th>
                      <th style={{ padding: "12px", borderBottom: "1px solid #e5e7eb" }}>Últimos Litros</th>
                      <th style={{ padding: "12px", borderBottom: "1px solid #e5e7eb" }}>Promedio Histórico</th>
                      <th style={{ padding: "12px", borderBottom: "1px solid #e5e7eb", textAlign: "right" }}>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {vacasAgrupadas.map(v => (
                      <tr key={v.animalId || v.animalArete} style={{ borderBottom: "1px solid #e5e7eb" }}>
                        <td style={{ padding: "12px" }}>
                          <strong>Arete: {v.animalArete}</strong> 
                          {v.animalAreteRancho && <span style={{ color: "#6b7280", marginLeft: "6px", fontSize: "12px" }}>(Rancho: {v.animalAreteRancho})</span>}
                        </td>
                        <td style={{ padding: "12px", color: "#111827", display: "flex", alignItems: "center", gap: "6px" }}><Calendar size={14} color="#6b7280"/> {v.ultimoRegistro}</td>
                        <td style={{ padding: "12px", fontWeight: "600", color: "#9333ea" }}>{v.ultimoLitros} L</td>
                        <td style={{ padding: "12px", fontWeight: "600", color: "#4b5563" }}>{(v.totalLitros / v.conteo).toFixed(1)} L</td>
                        <td style={{ padding: "12px", textAlign: "right" }}>
                          <button 
                            onClick={() => setVacaGrafica({ animalId: v.animalId, animalArete: v.animalArete })}
                            style={{ backgroundColor: "#f3e8ff", color: "#9333ea", border: "1px solid #d8b4fe", padding: "6px 12px", borderRadius: "6px", fontSize: "12px", fontWeight: "bold", cursor: "pointer", transition: "0.2s" }}
                          >
                            Ver Vaca
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p style={{ textAlign: "center", color: "#6b7280", padding: "20px 0" }}>No hay registros individuales aún.</p>
            )
          )}
        </div>
      </div>

      {modalIndividual && (
        <ModalRegistroLecheIndividual 
          usuario={usuario}
          onClose={() => setModalIndividual(false)}
          onExito={() => { setModalIndividual(false); cargarDatos(); }}
        />
      )}

      {modalTanque && (
        <ModalRegistroLecheTanque 
          usuario={usuario}
          onClose={() => setModalTanque(false)}
          onExito={() => { setModalTanque(false); cargarDatos(); }}
        />
      )}

      {vacaGrafica && (
        <ModalGraficaVaca 
          usuario={usuario}
          animalId={vacaGrafica.animalId}
          animalArete={vacaGrafica.animalArete}
          onClose={() => setVacaGrafica(null)}
        />
      )}

      <style>{`
        .hover-card:hover {
          border-color: #2563eb !important;
          transform: translateY(-2px);
        }
      `}</style>
    </div>
  );
}
