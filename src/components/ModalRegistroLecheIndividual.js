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
          collection(db, "ganado"),
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
            {!vacaSeleccionada ? (
              <div style={{ marginBottom: "20px" }}>
                <label>Buscar Vaca (Nombre o Arete)</label>
                <div style={{ position: "relative", marginBottom: "12px" }}>
                  <Search size={18} style={{ position: "absolute", left: "10px", top: "10px", color: "#6b7280" }} />
                  <input 
                    type="text" 
                    value={busqueda}
                    onChange={(e) => setBusqueda(e.target.value)}
                    placeholder="Ej. Lola o 1024"
                    style={{ paddingLeft: "36px" }}
                    autoFocus
                  />
                </div>
                
                {cargando ? (
                  <p style={{ color: "#6b7280", fontSize: "14px" }}>Cargando vacas...</p>
                ) : busqueda.length > 0 ? (
                  <div style={{ maxHeight: "150px", overflowY: "auto", border: "1px solid #e5e7eb", borderRadius: "6px" }}>
                    {vacasFiltradas.length > 0 ? (
                      vacasFiltradas.map(v => (
                        <div 
                          key={v.id} 
                          onClick={() => setVacaSeleccionada(v)}
                          style={{ padding: "10px", borderBottom: "1px solid #e5e7eb", cursor: "pointer", display: "flex", justifyContent: "space-between" }}
                        >
                          <strong>{v.nombre || "Sin nombre"}</strong>
                          <span style={{ color: "#6b7280" }}>Arete: {v.numeroArete || "N/A"}</span>
                        </div>
                      ))
                    ) : (
                      <div style={{ padding: "10px", color: "#6b7280" }}>No se encontraron vacas.</div>
                    )}
                  </div>
                ) : (
                  <p style={{ color: "#6b7280", fontSize: "13px" }}>Escribe para buscar una vaca en tu inventario.</p>
                )}
              </div>
            ) : (
              <div style={{ marginBottom: "20px", backgroundColor: "#f0fdf4", border: "1px solid #bbf7d0", padding: "12px", borderRadius: "8px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div>
                  <strong style={{ color: "#166534" }}>Vaca Seleccionada:</strong>
                  <div style={{ fontSize: "15px", color: "#15803d", marginTop: "4px" }}>
                    {vacaSeleccionada.nombre || "Sin nombre"} (Arete: {vacaSeleccionada.numeroArete || "N/A"})
                  </div>
                </div>
                <button 
                  type="button" 
                  onClick={() => { setVacaSeleccionada(null); setBusqueda(""); }}
                  style={{ background: "none", border: "none", color: "#16a34a", textDecoration: "underline", cursor: "pointer", fontSize: "13px" }}
                >
                  Cambiar
                </button>
              </div>
            )}

            <div className="form-row" style={{ display: "flex", gap: "16px", marginBottom: "20px" }}>
              <div style={{ flex: 1 }}>
                <label>Fecha de Producción</label>
                <input 
                  type="date" 
                  value={fecha} 
                  max={new Date().toISOString().split("T")[0]}
                  onChange={e => setFecha(e.target.value)} 
                  required 
                />
              </div>
              <div style={{ flex: 1 }}>
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
              <button type="button" className="btn-secondary" onClick={onClose} disabled={guardando}>Cancelar</button>
              <button type="submit" className="btn-primary" disabled={guardando || !vacaSeleccionada || !litros}>
                {guardando ? "Guardando..." : <><Save size={18} /> Guardar Registro</>}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
