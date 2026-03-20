import React, { useState, useEffect } from "react";
import {
  Search,
  X,
  Plus,
  Activity,
  Baby,
  Scale,
  AlertTriangle,
} from "lucide-react";
import {
  collection,
  onSnapshot,
  addDoc,
  query,
  where,
  doc,
  updateDoc,
} from "firebase/firestore";
import { db } from "../firebase";

export default function DashboardGanado() {
  const [inventario, setInventario] = useState([]);
  const [busqueda, setBusqueda] = useState("");

  const [animalActivo, setAnimalActivo] = useState(null);
  const [historialEventos, setHistorialEventos] = useState([]);

  // Control de los dos mini-formularios
  const [mostrandoFormulario, setMostrandoFormulario] = useState(false);
  const [mostrandoBaja, setMostrandoBaja] = useState(false);

  const [datosEvento, setDatosEvento] = useState({
    tipo: "Repeso",
    resultado: "",
    fecha: new Date().toISOString().split("T")[0],
  });

  const [datosBaja, setDatosBaja] = useState({
    motivo: "Venta",
    notas: "",
    fecha: new Date().toISOString().split("T")[0],
  });

  // --- 1. CARGAR INVENTARIO ---
  useEffect(() => {
    const cancelarSuscripcion = onSnapshot(
      collection(db, "animales"),
      (snapshot) => {
        const listaAnimales = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setInventario(listaAnimales);
      }
    );
    return () => cancelarSuscripcion();
  }, []);

  // --- 2. CARGAR HISTORIAL ---
  useEffect(() => {
    if (!animalActivo) return;
    const q = query(
      collection(db, "eventos"),
      where("animalId", "==", animalActivo.id)
    );
    const cancelarEventos = onSnapshot(q, (snapshot) => {
      const eventos = snapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));
      eventos.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
      setHistorialEventos(eventos);
    });
    return () => cancelarEventos();
  }, [animalActivo]);

  // --- 3. GUARDAR EVENTO NORMAL ---
  const guardarEvento = async (e) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, "eventos"), {
        animalId: animalActivo.id,
        tipo: datosEvento.tipo,
        resultado: datosEvento.resultado,
        fecha: datosEvento.fecha,
      });

      if (datosEvento.tipo === "Parto") {
        const fechaBase = new Date(datosEvento.fecha);
        fechaBase.setMonth(fechaBase.getMonth() + 3);
        const fechaVacuna = fechaBase.toISOString().split("T")[0];

        await addDoc(collection(db, "alertas"), {
          animalId: animalActivo.id,
          areteAnimal: animalActivo.arete,
          titulo: "Primera Vacuna de Cría (Destete)",
          tipo: "vacuna",
          fechaProgramada: fechaVacuna,
          completada: false,
        });
      }

      setDatosEvento({
        tipo: "Repeso",
        resultado: "",
        fecha: new Date().toISOString().split("T")[0],
      });
      setMostrandoFormulario(false);
    } catch (error) {
      console.error("Error al guardar evento:", error);
    }
  };

  // --- 4. GUARDAR BAJA DE ANIMAL ---
  const guardarBaja = async (e) => {
    e.preventDefault();
    try {
      // A. Actualizamos el estado del animal en la base de datos
      const animalRef = doc(db, "animales", animalActivo.id);
      await updateDoc(animalRef, { estado: `Baja - ${datosBaja.motivo}` });

      // B. Registramos la baja como un evento histórico
      await addDoc(collection(db, "eventos"), {
        animalId: animalActivo.id,
        tipo: "Baja del Sistema",
        resultado: `Motivo: ${datosBaja.motivo}. ${datosBaja.notas}`,
        fecha: datosBaja.fecha,
      });

      setMostrandoBaja(false);
      // Actualizamos visualmente el modal abierto
      setAnimalActivo({
        ...animalActivo,
        estado: `Baja - ${datosBaja.motivo}`,
      });
    } catch (error) {
      console.error("Error al dar de baja:", error);
    }
  };

  const ganadoFiltrado = inventario.filter(
    (animal) =>
      animal.arete &&
      animal.arete.toLowerCase().includes(busqueda.toLowerCase())
  );

  const abrirHistorial = (animal) => {
    setAnimalActivo(animal);
    setMostrandoFormulario(false);
    setMostrandoBaja(false);
  };

  const cerrarHistorial = () => setAnimalActivo(null);

  const renderIconoEvento = (tipo) => {
    if (tipo === "Repeso") return <Scale size={20} color="#3b82f6" />;
    if (tipo === "Parto") return <Baby size={20} color="#ec4899" />;
    if (tipo === "Baja del Sistema")
      return <AlertTriangle size={20} color="#ef4444" />;
    return <Activity size={20} color="#10b981" />;
  };

  return (
    <div className="dashboard-container" style={{ padding: "0 16px" }}>
      <div className="header">
        <h1>Mi Ganado</h1>
        <p>Resumen general e inventario conectado a la nube.</p>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-value">{inventario.length}</div>
          <div style={{ color: "#6b7280" }}>Total Registros</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">
            {inventario.filter((a) => !a.estado?.includes("Baja")).length}
          </div>
          <div style={{ color: "#6b7280" }}>Animales Activos</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">
            {inventario.filter((a) => a.estado?.includes("Baja")).length}
          </div>
          <div style={{ color: "#6b7280" }}>Bajas Históricas</div>
        </div>
      </div>

      <div className="search-bar">
        <Search size={20} color="#9ca3af" />
        <input
          type="text"
          placeholder="Buscar por número de arete..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
      </div>

      <div className="table-container">
        <table className="ganado-table">
          <thead>
            <tr>
              <th>Arete</th>
              <th>Tipo</th>
              <th>Raza</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody>
            {ganadoFiltrado.length === 0 ? (
              <tr>
                <td
                  colSpan="5"
                  style={{
                    textAlign: "center",
                    padding: "24px",
                    color: "#6b7280",
                  }}
                >
                  No hay animales.
                </td>
              </tr>
            ) : (
              ganadoFiltrado.map((animal) => (
                <tr
                  key={animal.id}
                  style={{ opacity: animal.estado?.includes("Baja") ? 0.6 : 1 }}
                >
                  <td>
                    <strong>{animal.arete}</strong>
                  </td>
                  <td>{animal.tipo}</td>
                  <td>{animal.raza}</td>
                  <td>
                    <span
                      className={`status-badge ${
                        animal.estado?.includes("Baja")
                          ? "status-alerta"
                          : "status-sano"
                      }`}
                    >
                      {animal.estado || "Sano"}
                    </span>
                  </td>
                  <td>
                    <button
                      className="btn-outline"
                      onClick={() => abrirHistorial(animal)}
                    >
                      Ver Ficha
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* --- MODAL DE HISTORIAL --- */}
      {animalActivo && (
        <div className="modal-overlay" onClick={cerrarHistorial}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2 style={{ margin: "0 0 4px 0", color: "#111827" }}>
                  Expediente: {animalActivo.arete}
                  {animalActivo.estado?.includes("Baja") && (
                    <span
                      style={{
                        color: "#ef4444",
                        fontSize: "14px",
                        marginLeft: "8px",
                      }}
                    >
                      (Dado de Baja)
                    </span>
                  )}
                </h2>
                <span style={{ color: "#6b7280", fontSize: "14px" }}>
                  {animalActivo.raza} • {animalActivo.tipo}
                </span>
              </div>
              <button
                onClick={cerrarHistorial}
                style={{
                  background: "none",
                  border: "none",
                  cursor: "pointer",
                }}
              >
                <X size={24} color="#9ca3af" />
              </button>
            </div>

            {/* BOTONES DE ACCIÓN (Solo si el animal está activo) */}
            {!animalActivo.estado?.includes("Baja") &&
              !mostrandoFormulario &&
              !mostrandoBaja && (
                <div
                  style={{ display: "flex", gap: "12px", marginBottom: "16px" }}
                >
                  <button
                    className="btn-outline"
                    style={{
                      flex: 1,
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      gap: "8px",
                    }}
                    onClick={() => setMostrandoFormulario(true)}
                  >
                    <Plus size={18} /> Nuevo Evento
                  </button>
                  <button
                    className="btn-outline"
                    style={{
                      flex: 1,
                      color: "#ef4444",
                      borderColor: "#ef4444",
                      display: "flex",
                      justifyContent: "center",
                      alignItems: "center",
                      gap: "8px",
                    }}
                    onClick={() => setMostrandoBaja(true)}
                  >
                    <AlertTriangle size={18} /> Dar de Baja
                  </button>
                </div>
              )}

            {/* FORMULARIO DE EVENTO NORMAL */}
            {mostrandoFormulario && (
              <form
                onSubmit={guardarEvento}
                style={{
                  backgroundColor: "#f9fafb",
                  padding: "16px",
                  borderRadius: "8px",
                  marginBottom: "16px",
                  border: "1px solid #e5e7eb",
                }}
              >
                <h4
                  style={{
                    marginTop: 0,
                    marginBottom: "12px",
                    color: "#374151",
                  }}
                >
                  Capturar Evento
                </h4>
                <div style={{ display: "grid", gap: "12px" }}>
                  <select
                    value={datosEvento.tipo}
                    onChange={(e) =>
                      setDatosEvento({ ...datosEvento, tipo: e.target.value })
                    }
                    style={{
                      padding: "8px",
                      borderRadius: "4px",
                      border: "1px solid #d1d5db",
                      width: "100%",
                    }}
                  >
                    <option value="Repeso">Repeso (Actualizar Peso)</option>
                    <option value="Palpación">Palpación / Revisión</option>
                    <option value="Parto">Parto (Nacimiento)</option>
                    <option value="Vacunación">Aplicación de Vacuna</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Resultado u observaciones..."
                    value={datosEvento.resultado}
                    onChange={(e) =>
                      setDatosEvento({
                        ...datosEvento,
                        resultado: e.target.value,
                      })
                    }
                    style={{
                      padding: "8px",
                      borderRadius: "4px",
                      border: "1px solid #d1d5db",
                    }}
                    required
                  />
                  <input
                    type="date"
                    value={datosEvento.fecha}
                    onChange={(e) =>
                      setDatosEvento({ ...datosEvento, fecha: e.target.value })
                    }
                    style={{
                      padding: "8px",
                      borderRadius: "4px",
                      border: "1px solid #d1d5db",
                    }}
                    required
                  />
                  <div
                    style={{ display: "flex", gap: "8px", marginTop: "8px" }}
                  >
                    <button
                      type="submit"
                      className="btn-primary"
                      style={{ flex: 1, margin: 0 }}
                    >
                      Guardar
                    </button>
                    <button
                      type="button"
                      onClick={() => setMostrandoFormulario(false)}
                      style={{
                        padding: "10px",
                        borderRadius: "6px",
                        border: "1px solid #d1d5db",
                        background: "white",
                        cursor: "pointer",
                      }}
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              </form>
            )}

            {/* FORMULARIO DE BAJA */}
            {mostrandoBaja && (
              <form
                onSubmit={guardarBaja}
                style={{
                  backgroundColor: "#fef2f2",
                  padding: "16px",
                  borderRadius: "8px",
                  marginBottom: "16px",
                  border: "1px solid #fecaca",
                }}
              >
                <h4
                  style={{
                    marginTop: 0,
                    marginBottom: "12px",
                    color: "#991b1b",
                  }}
                >
                  Registrar Baja del Animal
                </h4>
                <div style={{ display: "grid", gap: "12px" }}>
                  <select
                    value={datosBaja.motivo}
                    onChange={(e) =>
                      setDatosBaja({ ...datosBaja, motivo: e.target.value })
                    }
                    style={{
                      padding: "8px",
                      borderRadius: "4px",
                      border: "1px solid #fca5a5",
                      width: "100%",
                    }}
                  >
                    <option value="Venta">Venta a terceros</option>
                    <option value="Muerte">Fallecimiento / Enfermedad</option>
                    <option value="Consumo">Consumo Interno</option>
                    <option value="Robo/Extravío">Robo o Extravío</option>
                  </select>
                  <input
                    type="text"
                    placeholder="Notas adicionales (opcional)..."
                    value={datosBaja.notas}
                    onChange={(e) =>
                      setDatosBaja({ ...datosBaja, notas: e.target.value })
                    }
                    style={{
                      padding: "8px",
                      borderRadius: "4px",
                      border: "1px solid #fca5a5",
                    }}
                  />
                  <input
                    type="date"
                    value={datosBaja.fecha}
                    onChange={(e) =>
                      setDatosBaja({ ...datosBaja, fecha: e.target.value })
                    }
                    style={{
                      padding: "8px",
                      borderRadius: "4px",
                      border: "1px solid #fca5a5",
                    }}
                    required
                  />
                  <div
                    style={{ display: "flex", gap: "8px", marginTop: "8px" }}
                  >
                    <button
                      type="submit"
                      className="btn-primary"
                      style={{ flex: 1, margin: 0, backgroundColor: "#ef4444" }}
                    >
                      Confirmar Baja
                    </button>
                    <button
                      type="button"
                      onClick={() => setMostrandoBaja(false)}
                      style={{
                        padding: "10px",
                        borderRadius: "6px",
                        border: "1px solid #fca5a5",
                        background: "white",
                        cursor: "pointer",
                        color: "#991b1b",
                      }}
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              </form>
            )}

            <h3
              style={{
                fontSize: "16px",
                marginBottom: "16px",
                color: "#374151",
              }}
            >
              Historial de Eventos
            </h3>
            <div style={{ maxHeight: "250px", overflowY: "auto" }}>
              {historialEventos.length === 0 ? (
                <p
                  style={{
                    color: "#6b7280",
                    textAlign: "center",
                    fontSize: "14px",
                    padding: "16px 0",
                  }}
                >
                  Sin eventos registrados.
                </p>
              ) : (
                historialEventos.map((evento) => (
                  <div
                    key={evento.id}
                    className="action-item"
                    style={{
                      cursor: "default",
                      opacity: 1,
                      borderColor: evento.tipo.includes("Baja")
                        ? "#fecaca"
                        : "#e5e7eb",
                      backgroundColor: evento.tipo.includes("Baja")
                        ? "#fef2f2"
                        : "#f9fafb",
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "12px",
                      }}
                    >
                      {renderIconoEvento(evento.tipo)}
                      <div className="action-info">
                        <h4
                          style={{
                            margin: "0 0 4px 0",
                            color: evento.tipo.includes("Baja")
                              ? "#991b1b"
                              : "#111827",
                          }}
                        >
                          {evento.tipo}
                        </h4>
                        <p style={{ margin: 0 }}>{evento.resultado}</p>
                        <span style={{ fontSize: "11px", color: "#9ca3af" }}>
                          {evento.fecha}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
