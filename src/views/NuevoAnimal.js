import React, { useState, useEffect } from "react";
import { CheckCircle2 } from "lucide-react";
import { collection, addDoc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";

export default function NuevoAnimal() {
  const [exito, setExito] = useState(false);
  const [vientres, setVientres] = useState([]);
  const [sementales, setSementales] = useState([]);

  const [datosFormulario, setDatosFormulario] = useState({
    arete: "",
    tipo: "Desarrollo",
    raza: "",
    peso: "",
    fechaNacimiento: "",
    madre: "",
    padre: "",
  });

  // Cargamos las listas de madres y padres existentes
  useEffect(() => {
    const cancelarSuscripcion = onSnapshot(
      collection(db, "animales"),
      (snapshot) => {
        const lista = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setVientres(
          lista.filter(
            (a) => a.tipo === "Vientre" && !a.estado?.includes("Baja")
          )
        );
        setSementales(
          lista.filter(
            (a) => a.tipo === "Semental" && !a.estado?.includes("Baja")
          )
        );
      }
    );
    return () => cancelarSuscripcion();
  }, []);

  const manejarCambio = (e) => {
    setDatosFormulario({ ...datosFormulario, [e.target.name]: e.target.value });
  };

  const guardarAnimal = async (e) => {
    e.preventDefault();

    const animalNuevo = {
      arete: datosFormulario.arete,
      tipo: datosFormulario.tipo,
      raza: datosFormulario.raza,
      peso: `${datosFormulario.peso} kg`,
      madre: datosFormulario.madre, // Guardamos el arete o ID de la madre
      padre: datosFormulario.padre, // Guardamos el arete o ID del padre
      estado: "Sano",
      fechaRegistro: new Date().toISOString(),
    };

    try {
      await addDoc(collection(db, "animales"), animalNuevo);
      setExito(true);
      setTimeout(() => {
        setExito(false);
        setDatosFormulario({
          arete: "",
          tipo: "Desarrollo",
          raza: "",
          peso: "",
          fechaNacimiento: "",
          madre: "",
          padre: "",
        });
      }, 3000);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="dashboard-container" style={{ padding: "0 16px" }}>
      <div className="header">
        <h1>Registrar Nuevo Animal</h1>
        <p>
          Vincula crías con sus progenitores para llevar la trazabilidad
          genética.
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
            <span>¡Animal y parentesco registrados en la nube!</span>
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
              >
                <option value="Desarrollo">Desarrollo (Cría)</option>
                <option value="Vientre">Vientre (Hembra)</option>
                <option value="Semental">Semental (Macho)</option>
              </select>
            </div>

            <div className="input-group">
              <label>Raza</label>
              <input
                type="text"
                name="raza"
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
                value={datosFormulario.peso}
                onChange={manejarCambio}
                required
              />
            </div>

            {/* SELECCIÓN DE PADRES */}
            <div className="input-group">
              <label>Madre (Vientre)</label>
              <select
                name="madre"
                value={datosFormulario.madre}
                onChange={manejarCambio}
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: "6px",
                  border: "1px solid #d1d5db",
                }}
              >
                <option value="">-- Seleccionar --</option>
                {vientres.map((v) => (
                  <option key={v.id} value={v.arete}>
                    {v.arete} ({v.raza})
                  </option>
                ))}
              </select>
            </div>

            <div className="input-group">
              <label>Padre (Semental)</label>
              <select
                name="padre"
                value={datosFormulario.padre}
                onChange={manejarCambio}
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: "6px",
                  border: "1px solid #d1d5db",
                }}
              >
                <option value="">-- Seleccionar --</option>
                {sementales.map((s) => (
                  <option key={s.id} value={s.arete}>
                    {s.arete} ({s.raza})
                  </option>
                ))}
              </select>
            </div>

            <div className="input-group" style={{ gridColumn: "span 2" }}>
              <label>Fecha de Nacimiento</label>
              <input
                type="date"
                name="fechaNacimiento"
                value={datosFormulario.fechaNacimiento}
                onChange={manejarCambio}
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn-primary"
            style={{ marginTop: "24px" }}
          >
            Guardar con Genealogía
          </button>
        </form>
      </div>
    </div>
  );
}
