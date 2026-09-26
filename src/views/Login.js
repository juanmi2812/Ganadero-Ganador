import { useState, useEffect } from "react";
import { ArrowLeft, Plus, Users, ShieldCheck } from "lucide-react";
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

  // Admin Rancho
  const [nombreRancho, setNombreRancho] = useState("");

  // Ganadera
  const [nombreGanadera, setNombreGanadera] = useState("");

  // Empleado
  const [ranchoSeleccionado, setRanchoSeleccionado] = useState("");

  // Usuario Firebase de Google (guardado en state para el flujo de registro con Google)
  const [googleUser, setGoogleUser] = useState(null);

  const reset = () => {
    setError("");
    setNombre("");
    setCorreo("");
    setPassword("");
    setNombreRancho("");
    setNombreGanadera("");
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
  // ─── Registro Admin Rancho ───────────────────────────────────────────────────
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
      
      const perfil = {
        nombre: nombre.trim(),
        correo: correo.trim(),
        rol: "admin",
        tipoEntidad: "rancho",
        ranchoId: ranchoRef.id,
        ranchoNombre: nombreRancho.trim(),
        fechaFinPrueba: hoy.toISOString(),
      };
      await setDoc(doc(db, "usuarios", cred.user.uid), perfil);
      alIniciarSesion({ uid: cred.user.uid, ...perfil });
    } catch (err) {
      setError(mensajeError(err.code || err.message));
    } finally {
      setCargando(false);
    }
  };

  // ─── Registro Ganadera ──────────────────────────────────────────────────────
  const manejarRegistroGanadera = async (e) => {
    e.preventDefault();
    if (!nombre.trim()) { setError("El nombre es obligatorio."); return; }
    if (!nombreGanadera.trim()) { setError("El nombre de la Ganadera es obligatorio."); return; }
    setError("");
    setCargando(true);
    try {
      const cred = await registrarCorreo(correo, password);
      const ganaderaRef = doc(collection(db, "ganaderas"));
      await setDoc(ganaderaRef, {
        nombre: nombreGanadera.trim(),
        adminUid: cred.user.uid,
        fechaCreacion: new Date().toISOString(),
        horariosAtencion: {
          dias: ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"],
          inicio: "09:00",
          fin: "14:00"
        },
        duracionCitaMinutos: 60
      });
      
      const perfil = {
        nombre: nombre.trim(),
        correo: correo.trim(),
        rol: "admin_ganadera",
        tipoEntidad: "ganadera",
        ganaderaId: ganaderaRef.id,
        ganaderaNombre: nombreGanadera.trim(),
      };
      await setDoc(doc(db, "usuarios", cred.user.uid), perfil);
      alIniciarSesion({ uid: cred.user.uid, ...perfil });
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

  // ─── Completar registro Google como Admin Rancho o Ganadera ───────────────────
  const completarGoogleAdmin = async (e) => {
    e.preventDefault();
    if (pantalla === "google-admin" && !nombreRancho.trim()) { setError("El nombre del rancho es obligatorio."); return; }
    if (pantalla === "google-ganadera" && !nombreGanadera.trim()) { setError("El nombre de la Ganadera es obligatorio."); return; }
    if (!googleUser) { setError("Error: sesión de Google perdida. Intenta de nuevo."); return; }
    setCargando(true);
    try {
      const uid = googleUser.uid;
      let perfil;

      if (pantalla === "google-admin") {
        const ranchoRef = doc(collection(db, "ranchos"));
        await setDoc(ranchoRef, {
          nombre: nombreRancho.trim(),
          adminUid: uid,
          fechaCreacion: new Date().toISOString(),
        });
        const hoy = new Date();
        hoy.setDate(hoy.getDate() + 30);
        perfil = {
          nombre: nombre || googleUser.displayName || "",
          correo: googleUser.email || "",
          rol: "admin",
          tipoEntidad: "rancho",
          ranchoId: ranchoRef.id,
          ranchoNombre: nombreRancho.trim(),
          fechaFinPrueba: hoy.toISOString(),
        };
      } else {
        const ganaderaRef = doc(collection(db, "ganaderas"));
        await setDoc(ganaderaRef, {
          nombre: nombreGanadera.trim(),
          adminUid: uid,
          fechaCreacion: new Date().toISOString(),
          horariosAtencion: {
            dias: ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"],
            inicio: "09:00",
            fin: "14:00"
          },
          duracionCitaMinutos: 60
        });
        perfil = {
          nombre: nombre || googleUser.displayName || "",
          correo: googleUser.email || "",
          rol: "admin_ganadera",
          tipoEntidad: "ganadera",
          ganaderaId: ganaderaRef.id,
          ganaderaNombre: nombreGanadera.trim(),
        };
      }

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
                  <div style={{ fontWeight: "700", color: "#15803d", fontSize: "15px" }}>Dueño de Rancho</div>
                  <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "2px" }}>Crea un nuevo rancho y gestiona tu ganado</div>
                </div>
              </div>
            </button>

            <button onClick={() => { ir(pantalla === "elegir-registro-google" ? "google-ganadera" : "registro-ganadera"); }}
              style={{ width: "100%", padding: "16px", borderRadius: "10px", border: "2px solid #2563eb", backgroundColor: "#eff6ff", cursor: "pointer", textAlign: "left", marginBottom: "12px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <ShieldCheck size={22} color="#2563eb" />
                <div>
                  <div style={{ fontWeight: "700", color: "#1d4ed8", fontSize: "15px" }}>Asociación Ganadera</div>
                  <div style={{ fontSize: "12px", color: "#6b7280", marginTop: "2px" }}>Recibe citas y autoriza movimientos</div>
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

        {/* ══════════ PANTALLA: REGISTRO GANADERA ══════════ */}
        {(pantalla === "registro-ganadera" || pantalla === "google-ganadera") && (
          <>
            <button onClick={() => ir("elegir-registro")} style={{ background: "none", border: "none", cursor: "pointer", color: "#6b7280", display: "flex", alignItems: "center", gap: "4px", fontSize: "13px", marginBottom: "16px", padding: 0 }}>
              <ArrowLeft size={14} /> Volver
            </button>
            <h2 style={{ margin: "0 0 4px 0", color: "#111827" }}>Asociación Ganadera</h2>
            <p style={{ color: "#6b7280", fontSize: "14px", marginBottom: "18px" }}>Crea tu cuenta institucional</p>
            {error && <ErrorBox msg={error} />}
            <form onSubmit={pantalla === "google-ganadera" ? completarGoogleAdmin : manejarRegistroGanadera}>
              <div style={groupStyle}>
                <label style={labelStyle}>Tu Nombre</label>
                <input style={inputStyle} type="text" placeholder="Ej. Juan García"
                  value={nombre} onChange={e => setNombre(e.target.value)} required />
              </div>
              <div style={groupStyle}>
                <label style={labelStyle}>Nombre de la Asociación</label>
                <input style={inputStyle} type="text" placeholder="Ej. Asociación Ganadera Local"
                  value={nombreGanadera} onChange={e => setNombreGanadera(e.target.value)} required />
              </div>
              {pantalla !== "google-ganadera" && (
                <>
                  <div style={groupStyle}>
                    <label style={labelStyle}>Correo Electrónico</label>
                    <input style={inputStyle} type="email" placeholder="admin@ganadera.com"
                      value={correo} onChange={e => setCorreo(e.target.value)} required />
                  </div>
                  <div style={groupStyle}>
                    <label style={labelStyle}>Contraseña (mínimo 6 caracteres)</label>
                    <input style={inputStyle} type="password" placeholder="••••••••"
                      value={password} onChange={e => setPassword(e.target.value)} required />
                  </div>
                </>
              )}
              <button type="submit" className="btn-primary" style={{ width: "100%", marginTop: "4px", backgroundColor: "#2563eb", borderColor: "#2563eb" }} disabled={cargando}>
                {cargando ? "Creando cuenta..." : "Crear Cuenta Institucional"}
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
