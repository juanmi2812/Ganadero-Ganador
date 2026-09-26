import React, { useState, useEffect } from "react";
import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase";

export default function GanaderaConfiguracion({ usuario }) {
  const [config, setConfig] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [guardando, setGuardando] = useState(false);

  const diasSemana = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

  useEffect(() => {
    const fetchConfig = async () => {
      try {
        const docSnap = await getDoc(doc(db, "ganaderas", usuario.ganaderaId));
        if (docSnap.exists()) {
          setConfig(docSnap.data());
        }
      } catch (err) {
        console.error(err);
      } finally {
        setCargando(false);
      }
    };
    fetchConfig();
  }, [usuario]);

  const toggleDia = (dia) => {
    setConfig(prev => {
      const dias = prev.horariosAtencion?.dias || [];
      if (dias.includes(dia)) {
        return { ...prev, horariosAtencion: { ...prev.horariosAtencion, dias: dias.filter(d => d !== dia) } };
      } else {
        return { ...prev, horariosAtencion: { ...prev.horariosAtencion, dias: [...dias, dia] } };
      }
    });
  };

  const guardarCambios = async () => {
    setGuardando(true);
    try {
      await updateDoc(doc(db, "ganaderas", usuario.ganaderaId), {
        horariosAtencion: config.horariosAtencion,
        duracionCitaMinutos: Number(config.duracionCitaMinutos)
      });
      alert("Configuración guardada exitosamente");
    } catch (err) {
      alert("Error al guardar: " + err.message);
    } finally {
      setGuardando(false);
    }
  };

  if (cargando) return <div style={{ textAlign: "center", padding: "20px" }}>Cargando configuración...</div>;
  if (!config) return <div style={{ textAlign: "center", padding: "20px" }}>Error al cargar configuración.</div>;

  return (
    <div className="card" style={{ padding: "30px", maxWidth: "600px", margin: "0 auto" }}>
      <h2 style={{ margin: "0 0 20px 0", color: "#111827" }}>Configuración de Citas</h2>
      
      <div style={{ marginBottom: "20px" }}>
        <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: "#374151" }}>Días Laborables</label>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "10px" }}>
          {diasSemana.map(dia => {
            const activo = config.horariosAtencion?.dias?.includes(dia);
            return (
              <button 
                key={dia}
                onClick={() => toggleDia(dia)}
                style={{
                  padding: "8px 12px", borderRadius: "20px", border: "1px solid",
                  backgroundColor: activo ? "#2563eb" : "#f9fafb",
                  borderColor: activo ? "#2563eb" : "#d1d5db",
                  color: activo ? "#fff" : "#4b5563",
                  cursor: "pointer", fontWeight: "600", fontSize: "13px"
                }}
              >
                {dia}
              </button>
            )
          })}
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" }}>
        <div>
          <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: "#374151", fontSize: "14px" }}>Hora de Apertura</label>
          <input 
            type="time" 
            value={config.horariosAtencion?.inicio || "09:00"}
            onChange={(e) => setConfig({ ...config, horariosAtencion: { ...config.horariosAtencion, inicio: e.target.value }})}
            style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #d1d5db" }}
          />
        </div>
        <div>
          <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: "#374151", fontSize: "14px" }}>Hora de Cierre</label>
          <input 
            type="time" 
            value={config.horariosAtencion?.fin || "14:00"}
            onChange={(e) => setConfig({ ...config, horariosAtencion: { ...config.horariosAtencion, fin: e.target.value }})}
            style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #d1d5db" }}
          />
        </div>
      </div>

      <div style={{ marginBottom: "30px" }}>
        <label style={{ display: "block", marginBottom: "8px", fontWeight: "600", color: "#374151", fontSize: "14px" }}>Duración de cada cita (Minutos)</label>
        <select 
          value={config.duracionCitaMinutos || 60}
          onChange={(e) => setConfig({ ...config, duracionCitaMinutos: e.target.value })}
          style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #d1d5db" }}
        >
          <option value="15">15 minutos</option>
          <option value="30">30 minutos</option>
          <option value="45">45 minutos</option>
          <option value="60">1 hora</option>
          <option value="90">1 hora y media</option>
          <option value="120">2 horas</option>
        </select>
        <p style={{ fontSize: "12px", color: "#6b7280", marginTop: "6px" }}>Este intervalo se usará para mostrar los horarios disponibles a los ganaderos.</p>
      </div>

      <button onClick={guardarCambios} disabled={guardando} className="btn-primary" style={{ width: "100%", backgroundColor: "#2563eb", borderColor: "#2563eb" }}>
        {guardando ? "Guardando..." : "Guardar Configuración"}
      </button>

    </div>
  );
}
