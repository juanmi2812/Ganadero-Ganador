import { useState, useEffect } from "react";
import { ArrowLeft, Plus, Users } from "lucide-react";
import logoConvivet from "../assets/logo_convivet.jpg";
import {
  db,
  iniciarSesionCorreo,
  registrarCorreo,
  iniciarSesionGoogle,
} from "../firebase";
import {
  doc, setDoc, getDoc, collection, query, getDocs, orderBy,
} from "firebase/firestore";

// pantalla: "login" | "elegir-registro" | "registro-admin" | "registro-empleado"
export default function Login({ alIniciarSesion }) {
  const [pantalla, setPantalla] = useState("login");
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState("");
  const [ranchos, setRanchos] = useState([]);

  // Campos comunes
  const [nombre, setNombre] = useState("");
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");

  // Admin
  const [nombreRancho, setNombreRancho] = useState("");

  // Empleado
  const [ranchoSeleccionado, setRanchoSeleccionado] = useState("");

  // Usuario Firebase de Google (guardado en state para el flujo de registro con Google)
  const [googleUser, setGoogleUser] = useState(null);

  // Carga lista de ranchos al entrar a pantallas de empleado
  useEffect(() => {
    if (pantalla === "registro-empleado" || pantalla === "google-empleado") {
      getDocs(query(collection(db, "ranchos"), orderBy("nombre"))).then(snap => {
        setRanchos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
      }).catch(() => {});
    }
  }, [pantalla]);

  const reset = () => {
    setError("");
    setNombre("");
    setCorreo("");
    setPassword("");
    setNombreRancho("");
    setRanchoSeleccionado("");
  };

  const ir = (p) => { reset(); setPantalla(p); };

  // ─── Login correo ─────────────────────────────────────────────────────────
  const manejarLogin = async (e) => {
    e.preventDefault();
    setError("");
    setCargando(true);
    try {
      const cred = await iniciarSesionCorreo(correo, password);
      const perfil = await getDoc(doc(db, "usuarios", cred.user.uid));
      if (!perfil.exists()) throw new Error("No se encontró perfil de usuario.");
      alIniciarSesion({ uid: cred.user.uid, ...perfil.data() });
    } catch (err) {
      setError(mensajeError(err.code || err.message));
    } finally {
      setCargando(false);
    }
  };

  // ─── Registro Admin ───────────────────────────────────────────────────────
  const manejarRegistroAdmin = async (e) => {
    e.preventDefault();
    if (!nombre.trim()) { setError("El nombre es obligatorio."); return; }
    if (!nombreRancho.trim()) { setError("El nombre del rancho es obligatorio."); return; }
    setError("");
    setCargando(true);
    try {
      const cred = await registrarCorreo(correo, password);
      const ranchoRef = doc(collection(db, "ranchos"));
      await setDoc(ranchoRef, {
        nombre: nombreRancho.trim(),
        adminUid: cred.user.uid,
        fechaCreacion: new Date().toISOString(),
      });
      const hoy = new Date();
      hoy.setDate(hoy.getDate() + 30);
      
      await setDoc(doc(db, "usuarios", cred.user.uid), {
        nombre: nombre.trim(),
        correo: correo.trim(),
        rol: "admin",
        ranchoId: ranchoRef.id,
        ranchoNombre: nombreRancho.trim(),
        fechaFinPrueba: hoy.toISOString(),
      });
      alIniciarSesion({
        uid: cred.user.uid,
        nombre: nombre.trim(),
        correo: correo.trim(),
        rol: "admin",
        ranchoId: ranchoRef.id,
        ranchoNombre: nombreRancho.trim(),
        fechaFinPrueba: hoy.toISOString(),
      });
    } catch (err) {
      setError(mensajeError(err.code || err.message));
    } finally {
      setCargando(false);
    }
  };

  // ─── Registro Empleado ────────────────────────────────────────────────────
  const manejarRegistroEmpleado = async (e) => {
    e.preventDefault();
    if (!nombre.trim()) { setError("El nombre es obligatorio."); return; }
    if (!ranchoSeleccionado) { setError("Selecciona el rancho al que perteneces."); return; }
    setError("");
    setCargando(true);
    try {
      const rancho = ranchos.find(r => r.id === ranchoSeleccionado);
      const cred = await registrarCorreo(correo, password);
      await setDoc(doc(db, "usuarios", cred.user.uid), {
        nombre: nombre.trim(),
        correo: correo.trim(),
        rol: "empleado",
        ranchoId: ranchoSeleccionado,
        ranchoNombre: rancho?.nombre || "",
      });
      alIniciarSesion({
        uid: cred.user.uid,
        nombre: nombre.trim(),
        correo: correo.trim(),
        rol: "empleado",
        ranchoId: ranchoSeleccionado,
        ranchoNombre: rancho?.nombre || "",
      });
    } catch (err) {
      setError(mensajeError(err.code || err.message));
    } finally {
      setCargando(false);
    }
  };

  // ─── Google ───────────────────────────────────────────────────────────────
  const loginGoogle = async () => {
    setError("");
    setCargando(true);
    try {
      const cred = await iniciarSesionGoogle();
      const perfilRef = doc(db, "usuarios", cred.user.uid);
      const perfil = await getDoc(perfilRef);
      if (perfil.exists()) {
        alIniciarSesion({ uid: cred.user.uid, ...perfil.data() });
      } else {
        // Usuario nuevo con Google → guardar en state y elegir perfil
        setGoogleUser(cred.user);
        setNombre(cred.user.displayName || "");
        setPantalla("elegir-registro-google");
      }
    } catch (err) {
      setError(mensajeError(err.code || err.message));
    } finally {
      setCargando(false);
    }
  };

  // ─── Completar registro Google como Admin ─────────────────────────────────
  const completarGoogleAdmin = async (e) => {
    e.preventDefault();
    if (!nombreRancho.trim()) { setError("El nombre del rancho es obligatorio."); return; }
    if (!googleUser) { setError("Error: sesión de Google perdida. Intenta de nuevo."); return; }
    setCargando(true);
    try {
      const uid = googleUser.uid;
      const ranchoRef = doc(collection(db, "ranchos"));
      await setDoc(ranchoRef, {
        nombre: nombreRancho.trim(),
        adminUid: uid,
        fechaCreacion: new Date().toISOString(),
      });
      const hoy = new Date();
      hoy.setDate(hoy.getDate() + 30);

      const perfil = {
        nombre: nombre || googleUser.displayName || "",
        correo: googleUser.email || "",
        rol: "admin",
        ranchoId: ranchoRef.id,
        ranchoNombre: nombreRancho.trim(),
        fechaFinPrueba: hoy.toISOString(),
      };
      await setDoc(doc(db, "usuarios", uid), perfil);
      alIniciarSesion({ uid, ...perfil });
    } catch (err) {
      setError(mensajeError(err.code || err.message));
    } finally {
      setCargando(false);
    }
  };

  const completarGoogleEmpleado = async (e) => {
    e.preventDefault();
    if (!ranchoSeleccionado) { setError("Selecciona el rancho."); return; }
    if (!googleUser) { setError("Error: sesión de Google perdida. Intenta de nuevo."); return; }
    setCargando(true);
    try {
      const uid = googleUser.uid;
      const rancho = ranchos.find(r => r.id === ranchoSeleccionado);
      const perfil = {
        nombre: nombre || googleUser.displayName || "",
        correo: googleUser.email || "",
        rol: "empleado",
        ranchoId: ranchoSeleccionado,
        ranchoNombre: rancho?.nombre || "",
      };
      await setDoc(doc(db, "usuarios", uid), perfil);
      alIniciarSesion({ uid, ...perfil });
    } catch (err) {
      setError(mensajeError(err.code || err.message));
    } finally {
      setCargando(false);
    }
  };

  // ─── Helpers ──────────────────────────────────────────────────────────────
  const mensajeError = (code) => {
    const m = {
      "auth/email-already-in-use": "Este correo ya está registrado. Inicia sesión.",
      "auth/invalid-email": "Correo no válido.",
      "auth/weak-password": "La contraseña debe tener al menos 6 caracteres.",
      "auth/user-not-found": "No existe cuenta con ese correo.",
      "auth/wrong-password": "Contraseña incorrecta.",
      "auth/invalid-credential": "Correo o contraseña incorrectos.",
      "auth/popup-closed-by-user": "Se cerró la ventana de Google.",
      "auth/popup-blocked": "El navegador bloqueó la ventana de Google. Permite popups e intenta de nuevo.",
      "permission-denied": "Firestore bloqueó la escritura. Actualiza las reglas de seguridad (ver instrucciones).",
    };
    return m[code] || `Error: ${code}`;
  };

  const inputStyle = {
    width: "100%", padding: "10px 12px", borderRadius: "8px",
    border: "1px solid #d1d5db", fontSize: "14px", boxSizing: "border-box",
    outline: "none", marginTop: "4px",
  };
  const labelStyle = { fontSize: "13px", fontWeight: "600", color: "#374151", display: "block" };
  const groupStyle = { marginBottom: "14px" };

  return (
    <div className="login-wrapper">
      <div className="login-card">
        <img src={logoConvivet} alt="Convivet Logo"
          style={{ height: "55px", width: "auto", margin: "0 auto 16px auto", display: "block" }} />

        {/* ══════════ PANTALLA: LOGIN ══════════ */}
        {pantalla === "login" && (
          <>
            <h2 style={{ margin: "0 0 4px 0", color: "#111827", textAlign: "center" }}>Ganadero Ganador</h2>
            <p style={{ color: "#6b7280", marginBottom: "20px", fontSize: "14px", textAlign: "center" }}>
              Ingresa a tu cuenta para gestionar tu rancho
            </p>
            {error && <ErrorBox msg={error} />}
            <form onSubmit={manejarLogin}>
              <div style={groupStyle}>
                <label style={labelStyle}>Correo Electrónico</label>
                <input style={inputStyle} type="email" placeholder="usuario@ejemplo.com"
                  value={correo} onChange={e => setCorreo(e.target.value)} required />
              </div>
              <div style={groupStyle}>
                <label style={labelStyle}>Contraseña</label>
                <input style={inputStyle} type="password" placeholder="••••••••"
                  value={password} onChange={e => setPassword(e.target.value)} required />
              </div>
              <button type="submit" className="btn-primary" style={{ width: "100%", marginTop: "4px" }} disabled={cargando}>
                {cargando ? "Ingresando..." : "Iniciar Sesión"}
              </button>
            </form>

            <div style={{ margin: "16px 0", textAlign: "center", fontSize: "13px", color: "#9ca3af" }}>— o continúa con —</div>

            <button className="btn-social" onClick={loginGoogle} disabled={cargando}>
              <GoogleIcon /> Continuar con Google
            </button>

            <div style={{ marginTop: "20px", textAlign: "center", fontSize: "14px", color: "#6b7280" }}>
              ¿No tienes cuenta?{" "}
              <button type="button" onClick={() => ir("elegir-registro")}
                style={{ background: "none", border: "none", color: "#2e7d32", fontWeight: "700", cursor: "pointer", padding: 0 }}>
                Regístrate aquí
              </button>
            </div>
          </>
        )}

        {/* ══════════ PANTALLA: ELEGIR TIPO DE REGISTRO ══════════ */}
        {(pantalla === "elegir-registro" || pantalla === "elegir-registro-google") && (
          <>
            <button onClick={() => ir("login")} style={{ background: "none", border: "none", cursor: "pointer", color: "#6b7280", display: "flex", alignItems: "center", gap: "4px", fontSize: "13px", marginBottom: "16px", padding: 0 }}>
              <ArrowLeft size={14} /> Volver
            </button>
            <h2 style={{ margin: "0 0 8px 0", color: "#111827" }}>¿Cuál es tu perfil?</h2>
            <p style={{ color: "#6b7280", fontSize: "14px", marginBottom: "20px" }}>
              {pantalla === "elegir-registro-google"
                ? "Cuenta nueva con Google. Elige tu rol para continuar."
                : "Selecciona el tipo de cuenta que necesitas."}
            </p>

            <button onClick={() => { ir(pantalla === "elegir-registro-google" ? "google-admin" : "registro-admin"); }}
              style={{ width: "100%", padding: "16px", borderRadius: "10px", border: "2px solid #16a34a", backgroundColor: "#f0fdf4", cursor: "pointer", textAlign: "left", marginBottom: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <Plus size={22} color="#16a34a" />
                <div>
                  <div style={{ fontWeight: "700", color: "#15803d", fontSize: "15px" }}>Administrador</div>
                  <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "2px" }}>Crea un nuevo rancho y gestiona todo</div>
                </div>
              </div>
            </button>

            <button onClick={() => { pantalla === "elegir-registro-google" ? setPantalla("google-empleado") : ir("registro-empleado"); }}
              style={{ width: "100%", padding: "16px", borderRadius: "10px", border: "2px solid #3b82f6", backgroundColor: "#eff6ff", cursor: "pointer", textAlign: "left" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <Users size={22} color="#3b82f6" />
                <div>
                  <div style={{ fontWeight: "700", color: "#1d4ed8", fontSize: "15px" }}>Empleado del Rancho</div>
                  <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "2px" }}>Únete a un rancho ya existente</div>
                </div>
              </div>
            </button>
          </>
        )}

        {/* ══════════ PANTALLA: REGISTRO ADMIN ══════════ */}
        {(pantalla === "registro-admin" || pantalla === "google-admin") && (
          <>
            <button onClick={() => ir("elegir-registro")} style={{ background: "none", border: "none", cursor: "pointer", color: "#6b7280", display: "flex", alignItems: "center", gap: "4px", fontSize: "13px", marginBottom: "16px", padding: 0 }}>
              <ArrowLeft size={14} /> Volver
            </button>
            <h2 style={{ margin: "0 0 4px 0", color: "#111827" }}>Nuevo Administrador</h2>
            <p style={{ color: "#6b7280", fontSize: "14px", marginBottom: "18px" }}>Crea tu cuenta y registra tu rancho</p>
            {error && <ErrorBox msg={error} />}
            <form onSubmit={pantalla === "google-admin" ? completarGoogleAdmin : manejarRegistroAdmin}>
              <div style={groupStyle}>
                <label style={labelStyle}>Tu Nombre</label>
                <input style={inputStyle} type="text" placeholder="Ej. Juan García"
                  value={nombre} onChange={e => setNombre(e.target.value)} required />
              </div>
              <div style={groupStyle}>
                <label style={labelStyle}>Nombre del Rancho</label>
                <input style={inputStyle} type="text" placeholder="Ej. Rancho San José"
                  value={nombreRancho} onChange={e => setNombreRancho(e.target.value)} required />
              </div>
              {pantalla !== "google-admin" && (
                <>
                  <div style={groupStyle}>
                    <label style={labelStyle}>Correo Electrónico</label>
                    <input style={inputStyle} type="email" placeholder="admin@ejemplo.com"
                      value={correo} onChange={e => setCorreo(e.target.value)} required />
                  </div>
                  <div style={groupStyle}>
                    <label style={labelStyle}>Contraseña (mínimo 6 caracteres)</label>
                    <input style={inputStyle} type="password" placeholder="••••••••"
                      value={password} onChange={e => setPassword(e.target.value)} required />
                  </div>
                </>
              )}
              <button type="submit" className="btn-primary" style={{ width: "100%", marginTop: "4px", backgroundColor: "#16a34a", borderColor: "#16a34a" }} disabled={cargando}>
                {cargando ? "Creando cuenta..." : "Crear Cuenta de Administrador"}
              </button>
            </form>
          </>
        )}

        {/* ══════════ PANTALLA: REGISTRO EMPLEADO ══════════ */}
        {(pantalla === "registro-empleado" || pantalla === "google-empleado") && (
          <>
            <button onClick={() => ir("elegir-registro")} style={{ background: "none", border: "none", cursor: "pointer", color: "#6b7280", display: "flex", alignItems: "center", gap: "4px", fontSize: "13px", marginBottom: "16px", padding: 0 }}>
              <ArrowLeft size={14} /> Volver
            </button>
            <h2 style={{ margin: "0 0 4px 0", color: "#111827" }}>Nuevo Empleado</h2>
            <p style={{ color: "#6b7280", fontSize: "14px", marginBottom: "18px" }}>Regístrate y selecciona tu rancho</p>
            {error && <ErrorBox msg={error} />}
            <form onSubmit={pantalla === "google-empleado" ? completarGoogleEmpleado : manejarRegistroEmpleado}>
              <div style={groupStyle}>
                <label style={labelStyle}>Tu Nombre</label>
                <input style={inputStyle} type="text" placeholder="Ej. Carlos López"
                  value={nombre} onChange={e => setNombre(e.target.value)} required />
              </div>
              <div style={groupStyle}>
                <label style={labelStyle}>Rancho al que perteneces</label>
                {ranchos.length === 0
                  ? <p style={{ fontSize: "13px", color: "#ef4444", marginTop: "6px" }}>No hay ranchos registrados todavía. Pide al administrador que cree su cuenta primero.</p>
                  : <select style={{ ...inputStyle, backgroundColor: "#fff" }}
                      value={ranchoSeleccionado} onChange={e => setRanchoSeleccionado(e.target.value)} required>
                      <option value="">-- Selecciona un rancho --</option>
                      {ranchos.map(r => <option key={r.id} value={r.id}>{r.nombre}</option>)}
                    </select>
                }
              </div>
              {pantalla !== "google-empleado" && (
                <>
                  <div style={groupStyle}>
                    <label style={labelStyle}>Correo Electrónico</label>
                    <input style={inputStyle} type="email" placeholder="empleado@ejemplo.com"
                      value={correo} onChange={e => setCorreo(e.target.value)} required />
                  </div>
                  <div style={groupStyle}>
                    <label style={labelStyle}>Contraseña (mínimo 6 caracteres)</label>
                    <input style={inputStyle} type="password" placeholder="••••••••"
                      value={password} onChange={e => setPassword(e.target.value)} required />
                  </div>
                </>
              )}
              <button type="submit" className="btn-primary" style={{ width: "100%", marginTop: "4px", backgroundColor: "#1d4ed8", borderColor: "#1d4ed8" }} disabled={cargando || ranchos.length === 0}>
                {cargando ? "Creando cuenta..." : "Crear Cuenta de Empleado"}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" style={{ display: "inline", verticalAlign: "middle" }}>
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  );
}

function ErrorBox({ msg }) {
  return (
    <div style={{ backgroundColor: "#fee2e2", color: "#991b1b", padding: "10px 12px", borderRadius: "8px", marginBottom: "14px", fontSize: "13px" }}>
      {msg}
    </div>
  );
}
