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
  const [filtroActivo, setFiltroActivo] = useState("Todos");

  const [animalActivo, setAnimalActivo] = useState(null);
  const [historialEventos, setHistorialEventos] = useState([]);
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

  // --- LÓGICA DE FILTRADO ACTUALIZADA ---
  const ganadoFiltrado = inventario.filter((animal) => {
    const cumpleBusqueda = animal.arete
      ?.toLowerCase()
      .includes(busqueda.toLowerCase());

    // "Todos" ahora incluye activos y bajas
    if (filtroActivo === "Todos") return cumpleBusqueda;

    // "Bajas" solo muestra los que tienen estado de baja
    if (filtroActivo === "Bajas")
      return cumpleBusqueda && animal.estado?.includes("Baja");

    // Los filtros por tipo (Vientre, Semental, etc.) ocultan las bajas por defecto
    return (
      cumpleBusqueda &&
      animal.tipo === filtroActivo &&
      !animal.estado?.includes("Baja")
    );
  });

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
        await addDoc(collection(db, "alertas"), {
          animalId: animalActivo.id,
          areteAnimal: animalActivo.arete,
          titulo: "Primera Vacuna de Cría",
          tipo: "vacuna",
          fechaProgramada: fechaBase.toISOString().split("T")[0],
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
      console.error(error);
    }
  };

  const guardarBaja = async (e) => {
    e.preventDefault();
    try {
      const animalRef = doc(db, "animales", animalActivo.id);
      await updateDoc(animalRef, { estado: `Baja - ${datosBaja.motivo}` });
      await addDoc(collection(db, "eventos"), {
        animalId: animalActivo.id,
        tipo: "Baja del Sistema",
        resultado: `Motivo: ${datosBaja.motivo}. ${datosBaja.notas}`,
        fecha: datosBaja.fecha,
      });
      setMostrandoBaja(false);
      setAnimalActivo({
        ...animalActivo,
        estado: `Baja - ${datosBaja.motivo}`,
      });
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div
      className="dashboard-container"
      style={{ padding: "0 16px", maxWidth: "1200px", margin: "0 auto" }}
    >
      <div className="header">
        <h1>Mi Ganado</h1>
        <p>Control de inventario y eventos en tiempo real.</p>
      </div>

      <div
        style={{
          display: "flex",
          gap: "8px",
          marginBottom: "20px",
          overflowX: "auto",
          paddingBottom: "8px",
        }}
      >
        {["Todos", "Vientre", "Semental", "Desarrollo", "Bajas"].map((tipo) => (
          <button
            key={tipo}
            onClick={() => setFiltroActivo(tipo)}
            style={{
              padding: "8px 16px",
              borderRadius: "20px",
              border: "1px solid",
              borderColor: filtroActivo === tipo ? "#3b82f6" : "#d1d5db",
              backgroundColor: filtroActivo === tipo ? "#eff6ff" : "white",
              color: filtroActivo === tipo ? "#3b82f6" : "#6b7280",
              fontWeight: "600",
              fontSize: "14px",
              whiteSpace: "nowrap",
              cursor: "pointer",
            }}
          >
            {tipo}
          </button>
        ))}
      </div>

      <div className="search-bar" style={{ marginBottom: "24px" }}>
        <Search size={20} color="#9ca3af" />
        <input
          type="text"
          placeholder="Buscar arete..."
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
        />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
          gap: "16px",
          paddingBottom: "40px",
        }}
      >
        {ganadoFiltrado.map((animal) => (
          <div
            key={animal.id}
            style={{
              backgroundColor: "white",
              borderRadius: "12px",
              padding: "20px",
              border: "1px solid #e5e7eb",
              boxShadow: "0 2px 4px rgba(0,0,0,0.05)",
              opacity: animal.estado?.includes("Baja") ? 0.7 : 1,
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: "12px",
              }}
            >
              <h3 style={{ margin: 0, fontSize: "20px" }}>{animal.arete}</h3>
              <span
                className={`status-badge ${
                  animal.estado?.includes("Baja")
                    ? "status-alerta"
                    : "status-sano"
                }`}
              >
                {animal.estado || "Sano"}
              </span>
            </div>
            <p
              style={{
                margin: "0 0 16px 0",
                color: "#6b7280",
                fontSize: "14px",
              }}
            >
              {animal.raza} • {animal.tipo}
            </p>
            <button
              className="btn-outline"
              style={{ width: "100%", justifyContent: "center" }}
              onClick={() => {
                setAnimalActivo(animal);
                setMostrandoFormulario(false);
                setMostrandoBaja(false);
              }}
            >
              Ver Ficha
            </button>
          </div>
        ))}
      </div>

      {animalActivo && (
        <div className="modal-overlay" onClick={() => setAnimalActivo(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Expediente: {animalActivo.arete}</h2>
              <button
                onClick={() => setAnimalActivo(null)}
                style={{ background: "none", border: "none" }}
              >
                <X size={24} />
              </button>
            </div>

            <div
              style={{
                backgroundColor: "#f3f4f6",
                padding: "12px",
                borderRadius: "8px",
                marginBottom: "16px",
                fontSize: "13px",
              }}
            >
              <strong>Dimensiones:</strong> {animalActivo.raza} |{" "}
              {animalActivo.tipo} | Peso Inicial: {animalActivo.peso}
              {animalActivo.madre && (
                <div style={{ marginTop: "4px" }}>
                  <strong>Madre:</strong> {animalActivo.madre}
                </div>
              )}
              {animalActivo.padre && (
                <div style={{ marginTop: "4px" }}>
                  <strong>Padre:</strong> {animalActivo.padre}
                </div>
              )}
            </div>

            {!animalActivo.estado?.includes("Baja") &&
              !mostrandoFormulario &&
              !mostrandoBaja && (
                <div
                  style={{ display: "flex", gap: "12px", marginBottom: "16px" }}
                >
                  <button
                    className="btn-outline"
                    style={{ flex: 1 }}
                    onClick={() => setMostrandoFormulario(true)}
                  >
                    <Plus size={18} /> Evento
                  </button>
                  <button
                    className="btn-outline"
                    style={{
                      flex: 1,
                      color: "#ef4444",
                      borderColor: "#ef4444",
                    }}
                    onClick={() => setMostrandoBaja(true)}
                  >
                    <AlertTriangle size={18} /> Baja
                  </button>
                </div>
              )}

            <h3>Historial</h3>
            <div style={{ maxHeight: "250px", overflowY: "auto" }}>
              {historialEventos.map((ev) => (
                <div
                  key={ev.id}
                  style={{
                    padding: "10px",
                    borderBottom: "1px solid #eee",
                    fontSize: "14px",
                  }}
                >
                  <strong>{ev.tipo}:</strong> {ev.resultado} <br />
                  <span style={{ fontSize: "11px", color: "#9ca3af" }}>
                    {ev.fecha}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
