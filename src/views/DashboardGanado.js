import React, { useState, useEffect } from "react";
import {
  Search,
  X,
  Plus,
  Activity,
  Baby,
  Scale,
  AlertTriangle,
  TrendingUp,
  Calendar,
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

  // --- LÓGICA DE CÁLCULO DE PESO (KPIs) ---
  const obtenerEstadisticasPeso = () => {
    if (!animalActivo || !historialEventos.length) return null;

    // 1. Limpiar el peso inicial (quitar "kg" si existe y convertir a número)
    const pesoInicial =
      parseFloat(animalActivo.peso?.replace(/[^0-9.]/g, "")) || 0;
    const fechaInicial = new Date(
      animalActivo.fechaRegistro || animalActivo.fechaNacimiento
    );

    // 2. Filtrar solo eventos de repeso y ordenar por fecha (el más reciente primero)
    const repesos = historialEventos
      .filter((ev) => ev.tipo === "Repeso")
      .map((ev) => ({
        peso: parseFloat(ev.resultado?.replace(/[^0-9.]/g, "")),
        fecha: new Date(ev.fecha),
      }))
      .sort((a, b) => b.fecha - a.fecha);

    if (repesos.length === 0)
      return { actual: pesoInicial, gananciaTotal: 0, gdp: 0 };

    const pesoActual = repesos[0].peso;
    const fechaActual = repesos[0].fecha;

    // 3. Cálculo de Ganancia Total
    const gananciaTotal = pesoActual - pesoInicial;

    // 4. Cálculo de GDP (Ganancia Diaria de Peso)
    const diffTiempo = Math.abs(fechaActual - fechaInicial);
    const diasTranscurridos =
      Math.ceil(diffTiempo / (1000 * 60 * 60 * 24)) || 1;
    const gdp = gananciaTotal / diasTranscurridos;

    return {
      actual: pesoActual,
      gananciaTotal: gananciaTotal.toFixed(2),
      gdp: gdp.toFixed(3),
      dias: diasTranscurridos,
    };
  };

  const stats = obtenerEstadisticasPeso();

  const ganadoFiltrado = inventario.filter((animal) => {
    const cumpleBusqueda = animal.arete
      ?.toLowerCase()
      .includes(busqueda.toLowerCase());
    if (filtroActivo === "Todos") return cumpleBusqueda;
    if (filtroActivo === "Bajas")
      return cumpleBusqueda && animal.estado?.includes("Baja");
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

  return (
    <div
      className="dashboard-container"
      style={{ padding: "0 16px", maxWidth: "1200px", margin: "0 auto" }}
    >
      <div className="header">
        <h1>Mi Ganado</h1>
        <p>Control de inventario y análisis de rendimiento.</p>
      </div>

      {/* FILTROS */}
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

      {/* GRID DE TARJETAS */}
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

      {/* MODAL EXPEDIENTE CON CÁLCULOS BI */}
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

            {/* --- PANEL DE DESEMPEÑO (KPIs) --- */}
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "1fr 1fr",
                gap: "12px",
                marginBottom: "20px",
              }}
            >
              <div
                style={{
                  backgroundColor: "#f0fdf4",
                  padding: "12px",
                  borderRadius: "8px",
                  border: "1px solid #bbf7d0",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    color: "#166534",
                    fontSize: "12px",
                    fontWeight: "bold",
                    marginBottom: "4px",
                  }}
                >
                  <TrendingUp size={14} /> GANANCIA TOTAL
                </div>
                <span
                  style={{
                    fontSize: "18px",
                    fontWeight: "bold",
                    color: "#14532d",
                  }}
                >
                  {stats?.gananciaTotal > 0
                    ? `+${stats.gananciaTotal} kg`
                    : "--"}
                </span>
              </div>
              <div
                style={{
                  backgroundColor: "#eff6ff",
                  padding: "12px",
                  borderRadius: "8px",
                  border: "1px solid #bfdbfe",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    color: "#1e40af",
                    fontSize: "12px",
                    fontWeight: "bold",
                    marginBottom: "4px",
                  }}
                >
                  <Activity size={14} /> GDP (PROM. DIARIO)
                </div>
                <span
                  style={{
                    fontSize: "18px",
                    fontWeight: "bold",
                    color: "#1e3a8a",
                  }}
                >
                  {stats?.gdp > 0 ? `${stats.gdp} kg/día` : "--"}
                </span>
              </div>
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
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "4px",
                }}
              >
                <span>
                  <strong>Raza:</strong> {animalActivo.raza}
                </span>
                <span>
                  <strong>Peso Inicial:</strong> {animalActivo.peso}
                </span>
              </div>
              {animalActivo.madre && (
                <div>
                  <strong>Madre:</strong> {animalActivo.madre} |{" "}
                  <strong>Padre:</strong> {animalActivo.padre}
                </div>
              )}
            </div>

            {/* BOTONES DE ACCIÓN */}
            {!animalActivo.estado?.includes("Baja") && !mostrandoFormulario && (
              <button
                className="btn-outline"
                style={{ width: "100%", marginBottom: "16px" }}
                onClick={() => setMostrandoFormulario(true)}
              >
                <Plus size={18} /> Registrar Pesaje o Evento
              </button>
            )}

            {/* FORMULARIO EVENTO */}
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
                <h4 style={{ marginTop: 0, marginBottom: "12px" }}>
                  Capturar Dato
                </h4>
                <div style={{ display: "grid", gap: "12px" }}>
                  <select
                    value={datosEvento.tipo}
                    onChange={(e) =>
                      setDatosEvento({ ...datosEvento, tipo: e.target.value })
                    }
                    style={{ padding: "8px", borderRadius: "4px" }}
                  >
                    <option value="Repeso">Repeso (Kilos actualizados)</option>
                    <option value="Vacunación">Vacunación</option>
                    <option value="Palpación">Palpación</option>
                    <option value="Parto">Parto</option>
                  </select>
                  <input
                    type="text"
                    placeholder={
                      datosEvento.tipo === "Repeso" ? "Ej: 350" : "Notas..."
                    }
                    value={datosEvento.resultado}
                    onChange={(e) =>
                      setDatosEvento({
                        ...datosEvento,
                        resultado: e.target.value,
                      })
                    }
                    style={{ padding: "8px", borderRadius: "4px" }}
                    required
                  />
                  <input
                    type="date"
                    value={datosEvento.fecha}
                    onChange={(e) =>
                      setDatosEvento({ ...datosEvento, fecha: e.target.value })
                    }
                    style={{ padding: "8px", borderRadius: "4px" }}
                    required
                  />
                  <div style={{ display: "flex", gap: "8px" }}>
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
                        padding: "8px",
                        border: "1px solid #ccc",
                        background: "white",
                        borderRadius: "4px",
                      }}
                    >
                      Cancelar
                    </button>
                  </div>
                </div>
              </form>
            )}

            <h3>Historial de Campo</h3>
            <div style={{ maxHeight: "200px", overflowY: "auto" }}>
              {historialEventos.map((ev) => (
                <div
                  key={ev.id}
                  style={{
                    padding: "10px",
                    borderBottom: "1px solid #eee",
                    fontSize: "14px",
                    display: "flex",
                    justifyContent: "space-between",
                  }}
                >
                  <div>
                    <strong>{ev.tipo}:</strong> {ev.resultado}{" "}
                    {ev.tipo === "Repeso" ? "kg" : ""}
                  </div>
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
