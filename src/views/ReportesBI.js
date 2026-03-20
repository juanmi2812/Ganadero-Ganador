import React, { useState, useEffect } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

const COLORES = ["#3b82f6", "#ec4899", "#10b981", "#f59e0b", "#8b5cf6"];

export default function ReportesBI() {
  const [datosTipo, setDatosTipo] = useState([]);
  const [datosRaza, setDatosRaza] = useState([]);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const cancelarSuscripcion = onSnapshot(
      collection(db, "animales"),
      (snapshot) => {
        const animales = snapshot.docs.map((doc) => doc.data());
        setTotal(animales.length);

        // --- Procesamiento de datos para las gráficas ---

        // 1. Agrupar por Tipo (Vientre, Semental, Desarrollo)
        const conteoTipos = animales.reduce((acc, animal) => {
          const tipo = animal.tipo || "Desconocido";
          acc[tipo] = (acc[tipo] || 0) + 1;
          return acc;
        }, {});

        setDatosTipo(
          Object.keys(conteoTipos).map((key) => ({
            name: key,
            value: conteoTipos[key],
          }))
        );

        // 2. Agrupar por Raza
        const conteoRazas = animales.reduce((acc, animal) => {
          const raza = animal.raza || "Otra";
          acc[raza] = (acc[raza] || 0) + 1;
          return acc;
        }, {});

        setDatosRaza(
          Object.keys(conteoRazas).map((key) => ({
            name: key,
            cantidad: conteoRazas[key],
          }))
        );
      }
    );

    return () => cancelarSuscripcion();
  }, []);

  return (
    <div className="dashboard-container" style={{ padding: "0 16px" }}>
      <div className="header">
        <h1>Indicadores de Productividad</h1>
        <p>Análisis de la distribución y rendimiento del hato ganadero.</p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
          gap: "24px",
          marginTop: "24px",
        }}
      >
        {/* Gráfica de Pastel: Distribución por Tipo */}
        <div
          className="login-card"
          style={{
            margin: 0,
            width: "100%",
            boxSizing: "border-box",
            padding: "24px",
          }}
        >
          <h3 style={{ marginTop: 0, color: "#374151" }}>
            Distribución por Categoría
          </h3>
          <div style={{ height: "300px", width: "100%" }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie
                  data={datosTipo}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {datosTipo.map((entry, index) => (
                    <Cell
                      key={`cell-${index}`}
                      fill={COLORES[index % COLORES.length]}
                    />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfica de Barras: Distribución por Raza */}
        <div
          className="login-card"
          style={{
            margin: 0,
            width: "100%",
            boxSizing: "border-box",
            padding: "24px",
          }}
        >
          <h3 style={{ marginTop: 0, color: "#374151" }}>
            Inventario por Raza
          </h3>
          <div style={{ height: "300px", width: "100%" }}>
            <ResponsiveContainer>
              <BarChart
                data={datosRaza}
                margin={{ top: 20, right: 30, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <Tooltip cursor={{ fill: "transparent" }} />
                <Bar dataKey="cantidad" fill="#3b82f6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
}
