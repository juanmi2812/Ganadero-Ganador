import React, { useState, useEffect } from "react";
import { collection, onSnapshot, addDoc } from "firebase/firestore";
import { db } from "../firebase";
import { Plus, X } from "lucide-react";

// Importaciones para el Calendario Visual
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { es } from "date-fns/locale";
import "react-big-calendar/lib/css/react-big-calendar.css";

const locales = { es: es };

const localizer = dateFnsLocalizer({
  format, parse, startOfWeek, getDay, locales,
});

export default function CalendarioAlertas() {
  const [eventosCalendario, setEventosCalendario] = useState([]);
  const [vista, setVista] = useState("month");
  const [fechaActual, setFechaActual] = useState(new Date());

  // --- MODAL DE NUEVA ACTIVIDAD ---
  const [mostrarModal, setMostrarModal] = useState(false);
  const [guardando, setGuardando] = useState(false);
  const [exitoMsg, setExitoMsg] = useState("");

  const [datosActividad, setDatosActividad] = useState({
    titulo: "",
    fecha: new Date().toISOString().split("T")[0],
  });

  // Cargar eventos del calendario
  useEffect(() => {
    const cancelarAlertas = onSnapshot(
      collection(db, "alertas"),
      (snapshot) => {
        const alertasData = snapshot.docs
          .map((doc) => {
            const data = doc.data();
            if (!data.fechaProgramada) return null;
            const [year, month, day] = data.fechaProgramada.split("-");
            const dateObj = new Date(year, month - 1, day);
            return {
              id: doc.id,
              title: data.titulo,
              start: dateObj, end: dateObj, allDay: true,
              tipo: "alerta", completada: data.completada,
            };
          })
          .filter(Boolean);

        setEventosCalendario(alertasData);
      }
    );
    return () => cancelarAlertas();
  }, []);

  const estiloDeEventos = (event) => {
    let backgroundColor = "#3b82f6";
    if (event.tipo === "alerta") {
      backgroundColor = event.completada ? "#10b981" : "#f59e0b";
    }
    return {
      style: {
        backgroundColor, borderRadius: "6px", color: "white",
        border: "none", display: "block", padding: "4px", fontSize: "12px",
      },
    };
  };

  // --- LÓGICA PARA GUARDAR ACTIVIDAD ---
  const guardarActividad = async (e) => {
    e.preventDefault();
    setGuardando(true);
    setExitoMsg("");

    try {
      await addDoc(collection(db, "alertas"), {
        fechaProgramada: datosActividad.fecha,
        titulo: datosActividad.titulo,
        completada: false,
      });

      setExitoMsg("✅ Actividad agregada al calendario");
      setDatosActividad({ titulo: "", fecha: new Date().toISOString().split("T")[0] });
      setTimeout(() => { setExitoMsg(""); setMostrarModal(false); }, 2000);
    } catch (error) {
      console.error(error);
      alert("Error al guardar la actividad.");
    }
    setGuardando(false);
  };

  const inputStyle = {
    width: "100%", padding: "10px 12px", border: "1px solid #d1d5db",
    borderRadius: "6px", fontSize: "14px", boxSizing: "border-box",
  };
  const labelStyle = { display: "block", fontSize: "13px", fontWeight: "600", color: "#374151", marginBottom: "6px" };

  return (
    <div className="dashboard-container" style={{ padding: "0 16px" }}>
      <div className="header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1>Calendario de Actividades</h1>
          <p>Organiza las tareas del rancho y la planeación semanal.</p>
        </div>
        <button
          className="btn-primary"
          style={{ margin: 0, width: "auto", display: "flex", alignItems: "center", gap: "6px", padding: "10px 20px" }}
          onClick={() => setMostrarModal(true)}
        >
          <Plus size={18} /> Agregar Actividad
        </button>
      </div>

      <div
        className="login-card"
        style={{ maxWidth: "100%", width: "100%", margin: "0", padding: "24px", boxSizing: "border-box", height: "700px" }}
      >
        <Calendar
          localizer={localizer}
          events={eventosCalendario}
          startAccessor="start"
          endAccessor="end"
          style={{ height: "100%" }}
          culture="es"
          messages={{ next: "Sig", previous: "Ant", today: "Hoy", month: "Mes", week: "Semana", day: "Día" }}
          eventPropGetter={estiloDeEventos}
          view={vista}
          onView={(nuevaVista) => setVista(nuevaVista)}
          date={fechaActual}
          onNavigate={(nuevaFecha) => setFechaActual(nuevaFecha)}
          onSelectSlot={(slotInfo) => {
            setDatosActividad({ ...datosActividad, fecha: slotInfo.start.toISOString().split("T")[0] });
            setMostrarModal(true);
          }}
          selectable={true}
        />
      </div>

      {/* ====== MODAL DE NUEVA ACTIVIDAD ====== */}
      {mostrarModal && (
        <div className="modal-overlay" onClick={() => setMostrarModal(false)}>
          <div className="modal-content" style={{ maxWidth: "450px" }} onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2 style={{ margin: 0, fontSize: "20px", color: "#111827" }}>📋 Nueva Actividad</h2>
                <p style={{ margin: "4px 0 0", color: "#6b7280", fontSize: "13px" }}>
                  Agrega una tarea de planeación al calendario.
                </p>
              </div>
              <button onClick={() => setMostrarModal(false)} style={{ background: "none", border: "none", cursor: "pointer" }}>
                <X size={24} color="#9ca3af" />
              </button>
            </div>

            {exitoMsg && (
              <div className="file-status status-success" style={{ marginBottom: "16px" }}>
                <span>{exitoMsg}</span>
              </div>
            )}

            <form onSubmit={guardarActividad}>
              <div style={{ marginBottom: "16px" }}>
                <label style={labelStyle}>Título de la Actividad</label>
                <input
                  type="text"
                  placeholder="Ej: Comprar pastura, Reparar cerco norte..."
                  value={datosActividad.titulo}
                  onChange={(e) => setDatosActividad({ ...datosActividad, titulo: e.target.value })}
                  style={inputStyle}
                  required
                />
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label style={labelStyle}>Fecha Programada</label>
                <input
                  type="date"
                  value={datosActividad.fecha}
                  onChange={(e) => setDatosActividad({ ...datosActividad, fecha: e.target.value })}
                  style={inputStyle}
                  required
                />
              </div>

              <button type="submit" className="btn-primary" style={{ width: "100%", marginTop: 0 }} disabled={guardando}>
                {guardando ? "Guardando..." : "Guardar Actividad"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
