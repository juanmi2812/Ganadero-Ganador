import React, { useState } from "react";
import { X, Save } from "lucide-react";
import { collection, addDoc } from "firebase/firestore";
import { db } from "../firebase";

export default function ModalRegistroLecheTanque({ onClose, usuario, onExito }) {
  const [fecha, setFecha] = useState(new Date().toISOString().split("T")[0]);
  const [litrosTotales, setLitrosTotales] = useState("");
  const [litrosCrias, setLitrosCrias] = useState("");
  const [litrosAutoconsumo, setLitrosAutoconsumo] = useState("");
  
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  const handleGuardar = async (e) => {
    e.preventDefault();
    if (!fecha || !litrosTotales) {
      setError("La fecha y los litros totales son obligatorios.");
      return;
    }

    const totales = parseFloat(litrosTotales) || 0;
    const crias = parseFloat(litrosCrias) || 0;
    const autoconsumo = parseFloat(litrosAutoconsumo) || 0;
    const venta = totales - crias - autoconsumo;

    if (venta < 0) {
      setError("La suma de leche para crías y autoconsumo no puede ser mayor a la producción total.");
      return;
    }

    setGuardando(true);
    setError("");

    try {
      await addDoc(collection(db, "produccion_leche_tanque"), {
        ranchoId: usuario.ranchoId,
        fecha: fecha,
        litrosTotales: totales,
        litrosCrias: crias,
        litrosAutoconsumo: autoconsumo,
        litrosVenta: venta,
        fechaRegistro: new Date().toISOString()
      });
      onExito();
    } catch (err) {
      console.error(err);
      setError("Error al guardar el registro en tanque.");
      setGuardando(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: "500px" }}>
        <div className="modal-header">
          <h2>Registro en Tanque (Diario)</h2>
          <button className="close-btn" onClick={onClose}><X size={24} /></button>
        </div>

        <div className="modal-body">
          {error && <div style={{ color: "#dc2626", backgroundColor: "#fee2e2", padding: "10px", borderRadius: "6px", marginBottom: "16px", fontSize: "14px" }}>{error}</div>}
          
          <form onSubmit={handleGuardar}>
            <div className="input-group" style={{ marginBottom: "20px" }}>
              <label>Fecha de Producción</label>
              <input 
                type="date" 
                value={fecha} 
                max={new Date().toISOString().split("T")[0]}
                onChange={e => setFecha(e.target.value)} 
                required 
              />
            </div>

            <div className="input-group" style={{ backgroundColor: "#f0f9ff", padding: "16px", borderRadius: "8px", border: "1px solid #bae6fd", marginBottom: "20px" }}>
              <label style={{ color: "#0369a1", fontWeight: "bold" }}>Litros Totales Producidos</label>
              <input 
                type="number" 
                step="0.01"
                value={litrosTotales} 
                onChange={e => setLitrosTotales(e.target.value)} 
                placeholder="Ej. 150"
                style={{ borderColor: "#7dd3fc" }}
                required 
              />
            </div>

            <div className="form-row" style={{ display: "flex", gap: "16px", marginBottom: "20px" }}>
              <div className="input-group" style={{ flex: 1, marginBottom: 0 }}>
                <label>Leche para Crías (L)</label>
                <input 
                  type="number" 
                  step="0.01"
                  value={litrosCrias} 
                  onChange={e => setLitrosCrias(e.target.value)} 
                  placeholder="Ej. 20"
                />
              </div>
              <div className="input-group" style={{ flex: 1, marginBottom: 0 }}>
                <label>Autoconsumo (L)</label>
                <input 
                  type="number" 
                  step="0.01"
                  value={litrosAutoconsumo} 
                  onChange={e => setLitrosAutoconsumo(e.target.value)} 
                  placeholder="Ej. 5"
                />
              </div>
            </div>

            <div style={{ backgroundColor: "#f0fdf4", padding: "12px", borderRadius: "6px", border: "1px solid #bbf7d0", fontSize: "14px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ color: "#166534", fontWeight: "600" }}>Total Destinado a Venta:</span>
              <strong style={{ fontSize: "18px", color: "#15803d" }}>
                {Math.max(0, (parseFloat(litrosTotales) || 0) - (parseFloat(litrosCrias) || 0) - (parseFloat(litrosAutoconsumo) || 0)).toFixed(2)} L
              </strong>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "24px" }}>
              <button type="button" className="btn-outline" onClick={onClose} disabled={guardando}>Cancelar</button>
              <button type="submit" className="btn-primary" style={{ width: "auto" }} disabled={guardando || !litrosTotales}>
                {guardando ? "Guardando..." : <><Save size={18} /> Guardar Registro</>}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
