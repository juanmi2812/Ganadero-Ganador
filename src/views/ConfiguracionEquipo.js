import React, { useState, useEffect } from "react";
import { Users, Plus, Shield, User, Trash2, Key } from "lucide-react";
import { collection, query, where, onSnapshot, doc, setDoc, deleteDoc, updateDoc } from "firebase/firestore";
import { db, crearCuentaEmpleadoSecundario } from "../firebase";

const inputStyle = { width: "100%", padding: "10px 12px", borderRadius: "8px", border: "1px solid #d1d5db", boxSizing: "border-box", outline: "none", fontSize: "14px" };
const labelStyle = { display: "block", fontSize: "12px", fontWeight: "bold", marginBottom: "4px", color: "#4b5563" };

const ROLES = [
  { id: "mayoral", nombre: "Mayoral", desc: "Manejo completo del rancho (ganado, lotes, leche). No ve costos." },
  { id: "veterinario", nombre: "Veterinario", desc: "Registra eventos de salud y palpaciones. No mueve ganado." },
  { id: "vaquero", nombre: "Vaquero", desc: "Captura básica (leche diaria). No modifica catálogos." }
];

export default function ConfiguracionEquipo({ usuario }) {
  const [equipo, setEquipo] = useState([]);
  const [modalActivo, setModalActivo] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [exito, setExito] = useState("");

  const [nuevo, setNuevo] = useState({ nombre: "", correo: "", password: "", rol: "vaquero" });

  useEffect(() => {
    if (!usuario?.ranchoId) return;
    const q = query(collection(db, "usuarios"), where("ranchoId", "==", usuario.ranchoId));
    const unsub = onSnapshot(q, (snap) => {
      setEquipo(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [usuario]);

  const agregarEmpleado = async (e) => {
    e.preventDefault();
    setError("");
    setExito("");
    
    if (nuevo.password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }

    setCargando(true);
    try {
      // 1. Creamos la cuenta en Firebase Auth con la instancia secundaria (sin desloguear al admin)
      const cred = await crearCuentaEmpleadoSecundario(nuevo.correo.trim(), nuevo.password);
      
      // 2. Guardamos el perfil en Firestore
      await setDoc(doc(db, "usuarios", cred.user.uid), {
        nombre: nuevo.nombre.trim(),
        correo: nuevo.correo.trim(),
        rol: nuevo.rol,
        ranchoId: usuario.ranchoId,
        ranchoNombre: usuario.ranchoNombre || "",
        fechaCreacion: new Date().toISOString()
      });

      setExito(`Usuario ${nuevo.nombre} creado exitosamente.`);
      setNuevo({ nombre: "", correo: "", password: "", rol: "vaquero" });
      setModalActivo(false);
    } catch (err) {
      console.error(err);
      if (err.code === "auth/email-already-in-use") {
        setError("Este correo ya está registrado en el sistema. Usa uno distinto.");
      } else {
        setError("Error al crear usuario: " + (err.message || "Intenta de nuevo."));
      }
    }
    setCargando(false);
  };

  const eliminarEmpleado = async (emp) => {
    if (emp.id === usuario.uid) {
      alert("No puedes eliminar tu propia cuenta de Administrador.");
      return;
    }
    if (window.confirm(`¿Estás seguro de eliminar el acceso a ${emp.nombre}? Perderá entrada al sistema de inmediato.`)) {
      try {
        await deleteDoc(doc(db, "usuarios", emp.id));
        // Nota: Esto borra el perfil, lo cual revoca el acceso a la base de datos por reglas de Firestore,
        // aunque su Auth quede vivo, ya no podrá leer ni escribir en el rancho.
      } catch (e) {
        console.error(e);
      }
    }
  };

  const cambiarRol = async (id, nuevoRol) => {
    if (id === usuario.uid) {
      alert("No puedes cambiar tu rol de Administrador.");
      return;
    }
    try {
      await updateDoc(doc(db, "usuarios", id), { rol: nuevoRol });
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="dashboard-container">
      <div style={{ marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ margin: 0, fontSize: "24px", color: "#111827", display: "flex", alignItems: "center", gap: "8px" }}>
            <Users size={28} color="#2563eb" /> Mi Equipo de Trabajo
          </h1>
          <p style={{ margin: "4px 0 0", color: "#6b7280" }}>
            Gestiona los accesos y permisos de tu personal para el rancho.
          </p>
        </div>
        <button className="btn-primary" onClick={() => { setModalActivo(true); setExito(""); setError(""); }} style={{ display: "flex", alignItems: "center", gap: "6px", backgroundColor: "#16a34a", borderColor: "#16a34a" }}>
          <Plus size={18} /> Agregar Empleado
        </button>
      </div>

      {exito && <div style={{ backgroundColor: "#dcfce7", color: "#166534", padding: "12px", borderRadius: "8px", marginBottom: "20px", fontWeight: "bold" }}>✅ {exito}</div>}

      <div style={{ backgroundColor: "white", borderRadius: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead style={{ backgroundColor: "#f9fafb", borderBottom: "1px solid #e5e7eb" }}>
            <tr>
              <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "12px", color: "#6b7280", textTransform: "uppercase" }}>Nombre y Correo</th>
              <th style={{ padding: "12px 16px", textAlign: "left", fontSize: "12px", color: "#6b7280", textTransform: "uppercase" }}>Rol Asignado</th>
              <th style={{ padding: "12px 16px", textAlign: "right", fontSize: "12px", color: "#6b7280", textTransform: "uppercase" }}>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {equipo.map((emp) => (
              <tr key={emp.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                <td style={{ padding: "16px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                    <div style={{ backgroundColor: emp.rol === "admin" ? "#dbeafe" : "#f3f4f6", padding: "10px", borderRadius: "50%" }}>
                      {emp.rol === "admin" ? <Shield size={20} color="#2563eb" /> : <User size={20} color="#6b7280" />}
                    </div>
                    <div>
                      <div style={{ fontWeight: "bold", color: "#111827" }}>{emp.nombre} {emp.id === usuario.uid && "(Tú)"}</div>
                      <div style={{ fontSize: "13px", color: "#6b7280" }}>{emp.correo}</div>
                    </div>
                  </div>
                </td>
                <td style={{ padding: "16px" }}>
                  {emp.id === usuario.uid ? (
                    <span style={{ backgroundColor: "#dbeafe", color: "#1e40af", padding: "4px 10px", borderRadius: "20px", fontSize: "12px", fontWeight: "bold" }}>
                      Administrador (Dueño)
                    </span>
                  ) : (
                    <select 
                      value={emp.rol} 
                      onChange={(e) => cambiarRol(emp.id, e.target.value)}
                      style={{ padding: "6px 12px", borderRadius: "6px", border: "1px solid #d1d5db", backgroundColor: "#f9fafb", cursor: "pointer", fontSize: "13px", fontWeight: "600", color: "#374151" }}
                    >
                      <option value="empleado">Empleado Antiguo (General)</option>
                      {ROLES.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                    </select>
                  )}
                </td>
                <td style={{ padding: "16px", textAlign: "right" }}>
                  {emp.id !== usuario.uid && (
                    <button onClick={() => eliminarEmpleado(emp)} style={{ background: "none", border: "none", color: "#ef4444", cursor: "pointer", padding: "8px", borderRadius: "6px", display: "inline-flex", alignItems: "center", justifyContent: "center" }} title="Revocar Acceso">
                      <Trash2 size={18} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {equipo.length === 1 && (
              <tr>
                <td colSpan="3" style={{ padding: "40px", textAlign: "center", color: "#9ca3af" }}>
                  <Users size={40} style={{ margin: "0 auto 10px", opacity: 0.5 }} />
                  <p>Aún no tienes empleados registrados.</p>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {modalActivo && (
        <div className="modal-overlay" onClick={() => !cargando && setModalActivo(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: "450px" }}>
            <div className="modal-header">
              <h2>Agregar Nuevo Empleado</h2>
              <button className="close-btn" onClick={() => !cargando && setModalActivo(false)}>&times;</button>
            </div>
            
            <p style={{ fontSize: "13px", color: "#6b7280", marginBottom: "20px" }}>
              Crea las credenciales que tu empleado usará para iniciar sesión. Si no tiene correo, puedes inventar uno (ej. <strong>juan@michoacan.com</strong>).
            </p>

            {error && <div style={{ backgroundColor: "#fee2e2", color: "#991b1b", padding: "10px", borderRadius: "6px", marginBottom: "15px", fontSize: "13px" }}>{error}</div>}

            <form onSubmit={agregarEmpleado}>
              <div style={{ marginBottom: "15px" }}>
                <label style={labelStyle}>Nombre del Empleado</label>
                <input style={inputStyle} type="text" placeholder="Ej. Juan Pérez" value={nuevo.nombre} onChange={e => setNuevo({...nuevo, nombre: e.target.value})} required />
              </div>
              
              <div style={{ marginBottom: "15px" }}>
                <label style={labelStyle}>Correo de Acceso (Usuario)</label>
                <input style={inputStyle} type="email" placeholder="juan@rancho.com" value={nuevo.correo} onChange={e => setNuevo({...nuevo, correo: e.target.value})} required />
              </div>

              <div style={{ marginBottom: "15px" }}>
                <label style={labelStyle}>Contraseña Temporal</label>
                <div style={{ position: "relative" }}>
                  <Key size={18} color="#9ca3af" style={{ position: "absolute", left: "12px", top: "11px" }} />
                  <input style={{ ...inputStyle, paddingLeft: "38px" }} type="text" placeholder="Mínimo 6 caracteres" value={nuevo.password} onChange={e => setNuevo({...nuevo, password: e.target.value})} required minLength={6} />
                </div>
              </div>

              <div style={{ marginBottom: "25px" }}>
                <label style={labelStyle}>Rol y Permisos</label>
                <select style={inputStyle} value={nuevo.rol} onChange={e => setNuevo({...nuevo, rol: e.target.value})}>
                  {ROLES.map(r => (
                    <option key={r.id} value={r.id}>{r.nombre} - {r.desc}</option>
                  ))}
                </select>
              </div>

              <button type="submit" className="btn-primary" style={{ width: "100%", backgroundColor: "#16a34a", borderColor: "#16a34a" }} disabled={cargando}>
                {cargando ? "Creando Credenciales..." : "Guardar Empleado"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
