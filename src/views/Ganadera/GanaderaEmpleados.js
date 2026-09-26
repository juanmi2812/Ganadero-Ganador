import React, { useState, useEffect } from "react";
import { collection, query, where, getDocs, doc, setDoc } from "firebase/firestore";
import { db, crearCuentaEmpleadoSecundario } from "../../firebase";

export default function GanaderaEmpleados({ usuario }) {
  const [empleados, setEmpleados] = useState([]);
  const [cargando, setCargando] = useState(true);

  // Formulario
  const [mostrarFormulario, setMostrarFormulario] = useState(false);
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  
  // Permisos (roles)
  const [permisoAprobar, setPermisoAprobar] = useState(false);
  const [permisoHistorial, setPermisoHistorial] = useState(false);

  const [creando, setCreando] = useState(false);
  const [error, setError] = useState("");

  const cargarEmpleados = async () => {
    setCargando(true);
    try {
      const q = query(collection(db, "usuarios"), where("ganaderaId", "==", usuario.ganaderaId));
      const snap = await getDocs(q);
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setEmpleados(data);
    } catch (err) {
      console.error(err);
    } finally {
      setCargando(false);
    }
  };

  useEffect(() => {
    cargarEmpleados();
  }, [usuario.ganaderaId]);

  const crearEmpleado = async (e) => {
    e.preventDefault();
    if (password.length < 6) {
      setError("La contraseña debe tener al menos 6 caracteres.");
      return;
    }
    setError("");
    setCreando(true);

    let appSecundaria;
    try {
      // 1. Crear usuario en Auth con la app secundaria
      const cred = await crearCuentaEmpleadoSecundario(correo, password);
      const nuevoUid = cred.user.uid;

      // 2. Crear perfil en Firestore
      await setDoc(doc(db, "usuarios", nuevoUid), {
        nombre,
        correo,
        rol: "empleado_ganadera",
        tipoEntidad: "ganadera",
        ganaderaId: usuario.ganaderaId,
        ganaderaNombre: usuario.ganaderaNombre,
        permisos: {
          aprobarCitas: permisoAprobar,
          verHistorial: permisoHistorial
        },
        fechaCreacion: new Date().toISOString()
      });

      alert("Empleado creado exitosamente. Ya puede iniciar sesión con ese correo y contraseña.");
      setMostrarFormulario(false);
      setNombre(""); setCorreo(""); setPassword("");
      setPermisoAprobar(false); setPermisoHistorial(false);
      cargarEmpleados();
    } catch (err) {
      setError("Error al crear empleado: " + err.message);
    } finally {
      setCreando(false);
    }
  };

  return (
    <div style={{ maxWidth: "800px", margin: "0 auto" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
        <h2 style={{ margin: 0, color: "#111827" }}>Empleados y Personal</h2>
        {!mostrarFormulario && (
          <button className="btn-primary" onClick={() => setMostrarFormulario(true)} style={{ backgroundColor: "#2563eb", borderColor: "#2563eb" }}>
            + Nuevo Empleado
          </button>
        )}
      </div>

      {mostrarFormulario && (
        <div className="card" style={{ padding: "25px", marginBottom: "30px", backgroundColor: "#eff6ff", border: "1px solid #bfdbfe" }}>
          <h3 style={{ margin: "0 0 15px 0", color: "#1d4ed8" }}>Registrar Nuevo Empleado</h3>
          {error && <div style={{ color: "#b91c1c", backgroundColor: "#fee2e2", padding: "10px", borderRadius: "8px", marginBottom: "15px", fontSize: "14px" }}>{error}</div>}
          <form onSubmit={crearEmpleado}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "15px", marginBottom: "15px" }}>
              <div>
                <label style={{ display: "block", fontSize: "14px", fontWeight: "bold", marginBottom: "5px" }}>Nombre Completo</label>
                <input required type="text" value={nombre} onChange={e => setNombre(e.target.value)} style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #d1d5db" }} />
              </div>
              <div>
                <label style={{ display: "block", fontSize: "14px", fontWeight: "bold", marginBottom: "5px" }}>Correo Electrónico</label>
                <input required type="email" value={correo} onChange={e => setCorreo(e.target.value)} style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #d1d5db" }} />
              </div>
            </div>

            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "block", fontSize: "14px", fontWeight: "bold", marginBottom: "5px" }}>Contraseña (Tú se la darás)</label>
              <input required type="text" value={password} onChange={e => setPassword(e.target.value)} style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #d1d5db" }} placeholder="Mínimo 6 caracteres" />
            </div>

            <div style={{ marginBottom: "20px" }}>
              <label style={{ display: "block", fontSize: "14px", fontWeight: "bold", marginBottom: "10px" }}>Permisos del Empleado</label>
              <label style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px", cursor: "pointer" }}>
                <input type="checkbox" checked={permisoAprobar} onChange={e => setPermisoAprobar(e.target.checked)} />
                <span>Puede Aprobar o Rechazar Citas de Ranchos</span>
              </label>
              <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer" }}>
                <input type="checkbox" checked={permisoHistorial} onChange={e => setPermisoHistorial(e.target.checked)} />
                <span>Puede ver el Historial General y Bitácoras</span>
              </label>
            </div>

            <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end" }}>
              <button type="button" onClick={() => setMostrarFormulario(false)} style={{ padding: "10px 20px", borderRadius: "8px", border: "1px solid #d1d5db", background: "white", cursor: "pointer" }}>Cancelar</button>
              <button type="submit" disabled={creando} style={{ padding: "10px 20px", borderRadius: "8px", border: "none", backgroundColor: "#2563eb", color: "white", fontWeight: "bold", cursor: "pointer" }}>
                {creando ? "Creando..." : "Crear Empleado"}
              </button>
            </div>
          </form>
        </div>
      )}

      {cargando ? (
        <div>Cargando empleados...</div>
      ) : (
        <div style={{ display: "grid", gap: "15px" }}>
          {empleados.map(emp => (
            <div key={emp.id} className="card" style={{ padding: "15px 20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontWeight: "bold", color: "#111827", fontSize: "16px" }}>{emp.nombre} {emp.rol === "admin_ganadera" && <span style={{ fontSize: "12px", background: "#2563eb", color: "white", padding: "2px 8px", borderRadius: "12px", marginLeft: "10px" }}>Admin</span>}</div>
                <div style={{ color: "#6b7280", fontSize: "14px" }}>{emp.correo}</div>
                {emp.rol !== "admin_ganadera" && (
                  <div style={{ fontSize: "12px", marginTop: "5px", color: "#4b5563" }}>
                    Permisos: {emp.permisos?.aprobarCitas ? "✅ Aprobar" : "❌ Aprobar"} | {emp.permisos?.verHistorial ? "✅ Historial" : "❌ Historial"}
                  </div>
                )}
              </div>
              {emp.rol !== "admin_ganadera" && (
                <button style={{ color: "#ef4444", background: "none", border: "none", fontSize: "14px", fontWeight: "bold", cursor: "pointer" }}>Eliminar</button>
              )}
            </div>
          ))}
          {empleados.length === 0 && <div style={{ textAlign: "center", color: "#9ca3af", padding: "20px" }}>No hay empleados registrados.</div>}
        </div>
      )}
    </div>
  );
}
