import React, { useState } from "react";
import { Chrome, Apple } from "lucide-react";
import logoConvivet from "../assets/logo_convivet.jpg";
// Importamos las funciones reales de Firebase (comentadas por ahora para que no rompan CodeSandbox sin llaves reales)
// import { iniciarSesionCorreo, registrarCorreo, iniciarSesionGoogle, iniciarSesionApple } from "../firebase";

export default function Login({ alIniciarSesion }) {
  const [esRegistro, setEsRegistro] = useState(false); // Estado para cambiar entre Login y Registro
  const [correo, setCorreo] = useState("");
  const [password, setPassword] = useState("");
  const [codigoRancho, setCodigoRancho] = useState("");
  const [error, setError] = useState("");

  const manejarSubmit = async (e) => {
    e.preventDefault();
    setError("");

    try {
      if (esRegistro) {
        if (!codigoRancho) {
          setError("El Código de Rancho es obligatorio para crear una cuenta.");
          return;
        }
        // Lógica real: await registrarCorreo(correo, password);
        // Lógica real: Guardar en la base de datos que este correo pertenece al codigoRancho
        console.log("Registrando usuario para el rancho:", codigoRancho);
        alIniciarSesion(true); // Simulamos éxito
      } else {
        // Lógica real: await iniciarSesionCorreo(correo, password);
        console.log("Iniciando sesión con:", correo);
        alIniciarSesion(true); // Simulamos éxito
      }
    } catch (err) {
      setError("Ocurrió un error de autenticación. Verifica tus datos.");
    }
  };

  const loginConRedes = async (proveedor) => {
    try {
      if (proveedor === "google") {
        // Lógica real: await iniciarSesionGoogle();
        console.log("Abriendo popup de Google...");
      } else if (proveedor === "apple") {
        // Lógica real: await iniciarSesionApple();
        console.log("Abriendo popup de Apple...");
      }
      alIniciarSesion(true); // Simulamos éxito temporalmente
    } catch (err) {
      setError(`Error al conectar con ${proveedor}`);
    }
  };

  return (
    <div className="login-wrapper">
      <div className="login-card">
        <div className="login-logo"><img 
  src={logoConvivet} 
  alt="Convivet Logo" 
  style={{ height: "55px", width: "auto", margin: "0 auto 16px auto", display: "block" }} 
/></div>
        <h2 style={{ margin: "0 0 8px 0", color: "#111827" }}>
          {esRegistro ? "Crear Nueva Cuenta" : "Ganadero Ganador"}
        </h2>
        <p style={{ color: "#6b7280", marginBottom: "24px", fontSize: "14px" }}>
          {esRegistro
            ? "Regístrate e ingresa el código de tu rancho"
            : "Ingresa a tu cuenta para gestionar tu rancho"}
        </p>

        {error && (
          <div
            style={{
              backgroundColor: "#fee2e2",
              color: "#991b1b",
              padding: "10px",
              borderRadius: "6px",
              marginBottom: "16px",
              fontSize: "14px",
            }}
          >
            {error}
          </div>
        )}

        <form onSubmit={manejarSubmit}>
          {esRegistro && (
            <div className="input-group">
              <label>Código de Rancho (Proporcionado por Admin)</label>
              <input
                type="text"
                placeholder="Ej. RANCHO-001"
                value={codigoRancho}
                onChange={(e) => setCodigoRancho(e.target.value.toUpperCase())}
              />
            </div>
          )}

          <div className="input-group">
            <label>Correo Electrónico</label>
            <input
              type="email"
              placeholder="usuario@ejemplo.com"
              value={correo}
              onChange={(e) => setCorreo(e.target.value)}
              required
            />
          </div>

          <div className="input-group">
            <label>Contraseña</label>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <button
            type="submit"
            className="btn-primary"
            style={{ marginTop: "8px" }}
          >
            {esRegistro ? "Crear Cuenta" : "Iniciar Sesión"}
          </button>
        </form>

        <div style={{ marginTop: "16px", fontSize: "14px" }}>
          {esRegistro ? "¿Ya tienes cuenta? " : "¿No tienes cuenta? "}
          <button
            type="button"
            onClick={() => setEsRegistro(!esRegistro)}
            style={{
              background: "none",
              border: "none",
              color: "#2e7d32",
              fontWeight: "bold",
              cursor: "pointer",
              padding: 0,
            }}
          >
            {esRegistro ? "Inicia sesión aquí" : "Regístrate aquí"}
          </button>
        </div>

        <div className="divider">O continúa con</div>

        <button className="btn-social" onClick={() => loginConRedes("google")}>
          <Chrome size={20} />
          {esRegistro ? "Registrarse con Google" : "Continuar con Google"}
        </button>

        <button className="btn-social" onClick={() => loginConRedes("apple")}>
          <Apple size={20} />
          {esRegistro ? "Registrarse con Apple" : "Continuar con Apple"}
        </button>
      </div>
    </div>
  );
}
