import React, { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { collection, addDoc } from "firebase/firestore";
import { db } from "../firebase"; // Asegúrate de que apunte a tu archivo firebase.js

export default function NuevoAnimal() {
  const [exito, setExito] = useState(false);
  const [datosFormulario, setDatosFormulario] = useState({
    arete: "",
    tipo: "Vientre",
    raza: "",
    peso: "",
    fechaNacimiento: "",
  });

  const manejarCambio = (e) => {
    setDatosFormulario({ ...datosFormulario, [e.target.name]: e.target.value });
  };

  const guardarAnimal = async (e) => {
    e.preventDefault();

    // Armamos el objeto con los datos del formulario
    const animalNuevo = {
      arete: datosFormulario.arete,
      tipo: datosFormulario.tipo,
      raza: datosFormulario.raza,
      peso: `${datosFormulario.peso} kg`,
      estado: "Sano",
      fechaRegistro: new Date().toISOString(), // Registra la fecha y hora exactas
    };

    try {
      // AQUÍ OCURRE LA MAGIA: Guardamos directo en la colección "animales" de Firebase
      await addDoc(collection(db, "animales"), animalNuevo);

      setExito(true);

      // Ocultar mensaje de éxito después de 3 segundos y limpiar formulario
      setTimeout(() => {
        setExito(false);
        setDatosFormulario({
          arete: "",
          tipo: "Vientre",
          raza: "",
          peso: "",
          fechaNacimiento: "",
        });
      }, 3000);
    } catch (error) {
      console.error("Error al guardar en Firebase:", error);
      alert("Hubo un error al guardar. Revisa la consola de CodeSandbox.");
    }
  };

  return (
    <div className="dashboard-container" style={{ padding: "0 16px" }}>
      <div className="header">
        <h1>Registrar Nuevo Animal</h1>
        <p>
          Captura los datos iniciales de un nuevo vientre, semental o cría en
          desarrollo.
        </p>
      </div>

      <div
        className="login-card"
        style={{ maxWidth: "600px", margin: "0", textAlign: "left" }}
      >
        {exito && (
          <div
            className="file-status status-success"
            style={{ marginBottom: "20px" }}
          >
            <CheckCircle2 size={20} />
            <span>¡Animal guardado en la nube exitosamente!</span>
          </div>
        )}

        <form onSubmit={guardarAnimal}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "16px",
            }}
          >
            <div className="input-group">
              <label>Número de Arete</label>
              <input
                type="text"
                name="arete"
                placeholder="Ej. MX-099"
                value={datosFormulario.arete}
                onChange={manejarCambio}
                required
              />
            </div>

            <div className="input-group">
              <label>Tipo de Animal</label>
              <select
                name="tipo"
                value={datosFormulario.tipo}
                onChange={manejarCambio}
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: "6px",
                  border: "1px solid #d1d5db",
                }}
              >
                <option value="Vientre">Vientre (Hembra reproductiva)</option>
                <option value="Semental">Semental</option>
                <option value="Desarrollo">Desarrollo (Cría/Becerro)</option>
              </select>
            </div>

            <div className="input-group">
              <label>Raza</label>
              <input
                type="text"
                name="raza"
                placeholder="Ej. Angus..."
                value={datosFormulario.raza}
                onChange={manejarCambio}
                required
              />
            </div>

            <div className="input-group">
              <label>Peso Inicial (kg)</label>
              <input
                type="number"
                name="peso"
                placeholder="Ej. 250"
                value={datosFormulario.peso}
                onChange={manejarCambio}
                required
              />
            </div>

            <div className="input-group" style={{ gridColumn: "span 2" }}>
              <label>Fecha de Nacimiento</label>
              <input
                type="date"
                name="fechaNacimiento"
                value={datosFormulario.fechaNacimiento}
                onChange={manejarCambio}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn-primary"
            style={{ marginTop: "24px" }}
          >
            Guardar Registro
          </button>
        </form>
      </div>
    </div>
  );
}
