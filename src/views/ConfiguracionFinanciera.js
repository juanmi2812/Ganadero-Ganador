import React, { useState, useEffect } from "react";
import { CheckCircle2, Settings, DollarSign } from "lucide-react";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { db } from "../firebase";
import Header from "../components/Header";

export default function ConfiguracionFinanciera() {
  const [exito, setExito] = useState(false);
  const [cargando, setCargando] = useState(true);
  
  const [config, setConfig] = useState({
    costoDiario: {
      "Lactante": 15,
      "Becerro": 30,
      "Becerra": 30,
      "Becerro/a": 30,
      "Novillona": 40,
      "Vaca": 60,
      "Torete": 50,
      "Semental": 80
    },
    precioKiloMercado: 55,
    pesoPromedioVentaTorete: 450
  });

  useEffect(() => {
    const cargarConfig = async () => {
      try {
        const docRef = doc(db, "configuracion", "financiera");
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          setConfig(docSnap.data());
        } else {
          await setDoc(docRef, config); // Sube los defaults si es la primera vez
        }
      } catch (error) {
        console.error("Error al cargar configuración", error);
      } finally {
        setCargando(false);
      }
    };
    cargarConfig();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const manejarCambioCosto = (categoria, valor) => {
    setConfig({
      ...config,
      costoDiario: { ...config.costoDiario, [categoria]: Number(valor) }
    });
  };

  const guardarConfiguracion = async (e) => {
    e.preventDefault();
    try {
      await setDoc(doc(db, "configuracion", "financiera"), config);
      setExito(true);
      setTimeout(() => setExito(false), 3000);
    } catch (error) {
      console.error(error);
    }
  };

  if (cargando) return <div style={{ padding: "20px", textAlign: "center" }}>Cargando configuración...</div>;

  return (
    <div className="dashboard-container" style={{ padding: "0 16px", maxWidth: "800px", margin: "0 auto" }}>
      <Header subtitle="Ajusta los parámetros financieros para los reportes de BI y Rentabilidad." />

      <div className="login-card" style={{ maxWidth: "100%", margin: "0", textAlign: "left" }}>
        {exito && (
          <div className="file-status status-success" style={{ marginBottom: "20px" }}>
            <CheckCircle2 size={20} />
            <span>¡Configuración financiera guardada exitosamente en la nube!</span>
          </div>
        )}

        <form onSubmit={guardarConfiguracion}>
          <h3 style={{ borderBottom: "1px solid #e5e7eb", paddingBottom: "10px", color: "#374151", display: "flex", alignItems: "center", gap: "8px" }}>
            <DollarSign color="#10b981" size={20} />
            Costo Diario de Mantenimiento (Dieta y Gastos Fijos)
          </h3>
          <p style={{ fontSize: "14px", color: "#6b7280", marginBottom: "16px" }}>Calcula de forma automática (días totales x costo) cuánto has invertido en cada animal desde su registro o nacimiento.</p>
          
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "30px" }}>
            {Object.keys(config.costoDiario).map(categoria => (
              <div className="input-group" key={categoria}>
                <label>Costo Diario - {categoria} ($)</label>
                <input 
                  type="number" 
                  step="0.5"
                  value={config.costoDiario[categoria]} 
                  onChange={(e) => manejarCambioCosto(categoria, e.target.value)} 
                  required 
                />
              </div>
            ))}
          </div>

          <h3 style={{ borderBottom: "1px solid #e5e7eb", paddingBottom: "10px", color: "#374151" }}>Proyección de Venta Comercial (Machos)</h3>
          <p style={{ fontSize: "14px", color: "#6b7280", marginBottom: "16px" }}>Variables predictivas para calcular tu nivel de Utilidad/Retorno en los toretes enviados al stock "En Venta".</p>
          
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "30px" }}>
            <div className="input-group">
              <label>Precio Actual del Mercado por Kg en Pie ($)</label>
              <input 
                type="number" 
                step="0.5"
                value={config.precioKiloMercado} 
                onChange={(e) => setConfig({...config, precioKiloMercado: Number(e.target.value)})} 
                required 
              />
            </div>
            <div className="input-group">
              <label>Peso Promedio de Destete/Venta Estimado (Kg)</label>
              <input 
                type="number" 
                value={config.pesoPromedioVentaTorete} 
                onChange={(e) => setConfig({...config, pesoPromedioVentaTorete: Number(e.target.value)})} 
                required 
              />
            </div>
          </div>

          <button type="submit" className="btn-primary" style={{ width: "100%", marginTop: "10px" }}>
            Actualizar Algoritmo de Costos
          </button>
        </form>
      </div>
    </div>
  );
}
