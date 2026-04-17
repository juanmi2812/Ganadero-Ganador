import React, { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, Map, ShieldAlert } from "lucide-react";
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc } from "firebase/firestore";
import { db } from "../firebase";

export default function ConfiguracionPotreros() {
  const [potreros, setPotreros] = useState([]);
  const [formActivo, setFormActivo] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  
  const [datosForm, setDatosForm] = useState({
    nombre: "",
    hectareas: ""
  });

  // Leer potreros
  useEffect(() => {
    const unsub = onSnapshot(collection(db, "potreros"), (snap) => {
      setPotreros(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsub();
  }, []);

  const guardarPotrero = async (e) => {
    e.preventDefault();
    try {
      const potreroData = {
        nombre: datosForm.nombre,
        hectareas: Number(datosForm.hectareas) || 0
      };

      if (editandoId) {
        await updateDoc(doc(db, "potreros", editandoId), potreroData);
      } else {
        await addDoc(collection(db, "potreros"), potreroData);
      }

      setFormActivo(false);
      setEditandoId(null);
      setDatosForm({ nombre: "", hectareas: "" });
    } catch (error) {
      console.error("Error guardando potrero:", error);
    }
  };

  const editarPotrero = (pot) => {
    setDatosForm({ nombre: pot.nombre, hectareas: pot.hectareas });
    setEditandoId(pot.id);
    setFormActivo(true);
  };

  const borrarPotrero = async (id) => {
    if (window.confirm("¿Seguro que deseas eliminar este potrero? Los animales en él quedarán 'Sin Asignar' la próxima vez que se actualicen.")) {
      try {
        await deleteDoc(doc(db, "potreros", id));
      } catch (error) {
        console.error("Error borrando potrero:", error);
      }
    }
  };

  const getTotalHectareas = () => potreros.reduce((total, p) => total + (p.hectareas || 0), 0);

  return (
    <div className="dashboard-container">
      <div className="header" style={{ marginBottom: "20px" }}>
        <h1 style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <Map size={28} color="var(--verde-medio)" />
          Configuración del Rancho
        </h1>
        <p>Administra las extensiones de tierra (Potreros/Lotes) para controlar tu Carga Animal.</p>
      </div>

      <div className="card" style={{ padding: "20px", marginBottom: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: "18px" }}>Mis Potreros</h2>
            <div style={{ fontSize: "13px", color: "var(--gris-400)", marginTop: "4px" }}>
              Total de superficie registrada: <strong style={{ color: "var(--verde-oscuro)" }}>{getTotalHectareas()} Has</strong>
            </div>
          </div>
          {!formActivo && (
            <button className="btn-primary" onClick={() => { setFormActivo(true); setEditandoId(null); setDatosForm({ nombre: "", hectareas: "" }); }}>
              <Plus size={18} /> Nuevo Potrero
            </button>
          )}
        </div>

        {formActivo && (
          <form onSubmit={guardarPotrero} style={{ backgroundColor: "#f9fafb", padding: "15px", borderRadius: "8px", border: "1px solid #e5e7eb", marginBottom: "20px" }}>
            <h3 style={{ fontSize: "15px", marginTop: 0, marginBottom: "15px", color: "#374151" }}>
              {editandoId ? "Editar Potrero" : "Crear Nuevo Potrero"}
            </h3>
            
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "15px" }}>
              <div style={{ flex: "1 1 200px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "bold", marginBottom: "4px", color: "#4b5563" }}>Nombre del Potrero</label>
                <input 
                  type="text" 
                  placeholder="Ej: Potrero Norte, Lote 4..." 
                  value={datosForm.nombre} 
                  onChange={e => setDatosForm({...datosForm, nombre: e.target.value})}
                  required
                  style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #d1d5db", boxSizing: "border-box" }}
                />
              </div>
              <div style={{ flex: "1 1 200px" }}>
                <label style={{ display: "block", fontSize: "12px", fontWeight: "bold", marginBottom: "4px", color: "#4b5563" }}>Extensión en Hectáreas</label>
                <input 
                  type="number" 
                  step="0.01"
                  placeholder="Ej: 50.5" 
                  value={datosForm.hectareas} 
                  onChange={e => setDatosForm({...datosForm, hectareas: e.target.value})}
                  required
                  style={{ width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #d1d5db", boxSizing: "border-box" }}
                />
              </div>
            </div>
            
            <div style={{ display: "flex", gap: "10px" }}>
              <button type="submit" className="btn-primary" style={{ margin: 0 }}>Guardar Potrero</button>
              <button type="button" className="btn-outline" style={{ margin: 0 }} onClick={() => { setFormActivo(false); setEditandoId(null); }}>Cancelar</button>
            </div>
          </form>
        )}

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px", textAlign: "left" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #e5e7eb", color: "#6b7280" }}>
                <th style={{ padding: "12px 8px" }}>Nombre del Potrero</th>
                <th style={{ padding: "12px 8px" }}>Capacidad (Hectáreas)</th>
                <th style={{ padding: "12px 8px", width: "100px", textAlign: "center" }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {potreros.length === 0 ? (
                <tr><td colSpan="3" style={{ padding: "20px", textAlign: "center", color: "#9ca3af" }}>No hay potreros registrados.</td></tr>
              ) : (
                potreros.map(pot => (
                  <tr key={pot.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                    <td style={{ padding: "12px 8px", fontWeight: "500", color: "#111827" }}>{pot.nombre}</td>
                    <td style={{ padding: "12px 8px", color: "#4b5563" }}>{pot.hectareas} has</td>
                    <td style={{ padding: "12px 8px", textAlign: "center", display: "flex", justifyContent: "center", gap: "8px" }}>
                      <button onClick={() => editarPotrero(pot)} style={{ background: "none", border: "none", cursor: "pointer", color: "#3b82f6" }} title="Editar">
                        <Edit2 size={18} />
                      </button>
                      <button onClick={() => borrarPotrero(pot.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444" }} title="Eliminar">
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      
      <div className="card" style={{ padding: "20px", backgroundColor: "#fefce8", border: "1px solid #fef08a" }}>
        <h3 style={{ margin: "0 0 10px 0", color: "#854d0e", display: "flex", alignItems: "center", gap: "6px" }}>
          <ShieldAlert size={20} /> Nota sobre Asignaciones
        </h3>
        <p style={{ margin: 0, fontSize: "13px", color: "#713f12", lineHeight: "1.5" }}>
          Al modificar un Potrero, los animales que ya estaban ubicados allí automáticamente mantendrán su relación si modificas la capacidad. 
          Si borras un Potrero, los animales figurarán como "Sin Asignar" o mantendrán el registro heredado si usas el Importador Masivo.
        </p>
      </div>

    </div>
  );
}
