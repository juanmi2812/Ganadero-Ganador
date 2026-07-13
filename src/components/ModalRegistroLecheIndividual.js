import React, { useState, useEffect } from "react";
import { X, Save, Search } from "lucide-react";
import { collection, query, where, getDocs, addDoc } from "firebase/firestore";
import { db } from "../firebase";

export default function ModalRegistroLecheIndividual({ onClose, usuario, onExito }) {
  const [inventario, setInventario] = useState([]);
  const [cargando, setCargando] = useState(true);
  
  const [busqueda, setBusqueda] = useState("");
  const [vacaSeleccionada, setVacaSeleccionada] = useState(null);
  const [fecha, setFecha] = useState(new Date().toISOString().split("T")[0]);
  const [litros, setLitros] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    const fetchVacas = async () => {
      try {
        const q = query(
          collection(db, "animales"),
          where("ranchoId", "==", usuario.ranchoId),
          where("sexo", "==", "Hembra")
        );
        const snap = await getDocs(q);
        const hembras = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        
        // Filtrar vacas activas
        const vacas = hembras.filter(h => !h.estado?.includes("Baja"));
        setInventario(vacas);
      } catch (err) {
        console.error(err);
        setError("Error al cargar las vacas");
      }
      setCargando(false);
    };
    fetchVacas();
  }, [usuario.ranchoId]);

  const vacasFiltradas = busqueda
    ? inventario.filter(v => 
        (v.nombre && v.nombre.toLowerCase().includes(busqueda.toLowerCase())) ||
        (v.numeroArete && String(v.numeroArete).includes(busqueda))
      )
    : [];

  const handleGuardar = async (e) => {
    e.preventDefault();
    if (!vacaSeleccionada || !fecha || !litros) {
      setError("Por favor completa todos los campos.");
      return;
    }
    
    setGuardando(true);
    setError("");
    
    try {
      await addDoc(collection(db, "produccion_leche_individual"), {
        ranchoId: usuario.ranchoId,
        animalId: vacaSeleccionada.id,
        animalNombre: vacaSeleccionada.nombre || "",
        animalArete: vacaSeleccionada.numeroArete || "",
        fecha: fecha,
        litros: parseFloat(litros),
        fechaRegistro: new Date().toISOString()
      });
      onExito();
    } catch (err) {
      console.error(err);
      setError("Error al guardar el registro.");
      setGuardando(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: "500px" }}>
        <div className="modal-header">
          <h2>Registro Individual de Leche</h2>
          <button className="close-btn" onClick={onClose}><X size={24} /></button>
        </div>

        <div className="modal-body">
          {error && <div style={{ color: "#dc2626", backgroundColor: "#fee2e2", padding: "10px", borderRadius: "6px", marginBottom: "16px", fontSize: "14px" }}>{error}</div>}
          
          <form onSubmit={handleGuardar}>
            <div className="input-group" style={{ marginBottom: "20px" }}>
              <label>Seleccionar Vaca</label>
              {cargando ? (
                <p style={{ color: "#6b7280", fontSize: "14px", margin: "10px 0" }}>Cargando vacas...</p>
              ) : (
                <select 
                  value={vacaSeleccionada ? vacaSeleccionada.id : ""}
                  onChange={(e) => {
                    const id = e.target.value;
                    if (!id) {
                      setVacaSeleccionada(null);
                    } else {
                      const vaca = inventario.find(v => v.id === id);
                      setVacaSeleccionada(vaca);
                    }
                  }}
                  required
                >
                  <option value="">-- Elige una vaca --</option>
                  {inventario.map(v => (
                    <option key={v.id} value={v.id}>
                      {v.nombre || "Sin nombre"} (Arete: {v.numeroArete || "N/A"})
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="form-row" style={{ display: "flex", gap: "16px", marginBottom: "20px" }}>
              <div className="input-group" style={{ flex: 1, marginBottom: 0 }}>
                <label>Fecha de Producción</label>
                <input 
                  type="date" 
                  value={fecha} 
                  max={new Date().toISOString().split("T")[0]}
                  onChange={e => setFecha(e.target.value)} 
                  required 
                />
              </div>
              <div className="input-group" style={{ flex: 1, marginBottom: 0 }}>
                <label>Litros Producidos</label>
                <input 
                  type="number" 
                  step="0.01"
                  value={litros} 
                  onChange={e => setLitros(e.target.value)} 
                  placeholder="Ej. 12.5"
                  required 
                />
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", marginTop: "24px" }}>
              <button type="button" className="btn-outline" onClick={onClose} disabled={guardando}>Cancelar</button>
              <button type="submit" className="btn-primary" style={{ width: "auto" }} disabled={guardando || !vacaSeleccionada || !litros}>
                {guardando ? "Guardando..." : <><Save size={18} /> Guardar Registro</>}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
