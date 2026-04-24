import React, { useState, useEffect } from "react";
import { collection, onSnapshot, addDoc, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { Plus, X, Users, User, Layers } from "lucide-react";
import { CATALOGO_EVENTOS, TIPOS_EVENTO } from "../catalogoEventos";

// Importaciones para el Calendario Visual
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { es } from "date-fns/locale";
import "react-big-calendar/lib/css/react-big-calendar.css";

const locales = { es: es };

const localizer = dateFnsLocalizer({
  format, parse, startOfWeek, getDay, locales,
});

const CATEGORIAS = ["Vaca", "Novillona", "Semental", "Torete", "Becerro", "Becerra"];

export default function CalendarioAlertas() {
  const [eventosCalendario, setEventosCalendario] = useState([]);
  const [vista, setVista] = useState("month");
  const [fechaActual, setFechaActual] = useState(new Date());

  // --- MODAL DE NUEVO EVENTO ---
  const [mostrarModal, setMostrarModal] = useState(false);
  const [animales, setAnimales] = useState([]);
  const [busquedaAnimal, setBusquedaAnimal] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [exitoMsg, setExitoMsg] = useState("");

  const [modoAplicacion, setModoAplicacion] = useState("individual"); // individual | masivo
  const [animalSeleccionado, setAnimalSeleccionado] = useState("");
  const [filtroPotrero, setFiltroPotrero] = useState("Todos");
  const [filtroGrupo, setFiltroGrupo] = useState("Todos");

  const [potreros, setPotreros] = useState([]);
  const [grupos, setGrupos] = useState([]);

  const [datosEvento, setDatosEvento] = useState({
    tipo: "Desparasitante",
    resultado: "",
    fecha: new Date().toISOString().split("T")[0],
    costo: "",
    recordatorio: "1 semana antes",
  });

  // Cargar animales, potreros y grupos
  useEffect(() => {
    const cancelarAnimales = onSnapshot(collection(db, "animales"), (snap) => {
      const lista = snap.docs
        .map((d) => ({ id: d.id, ...d.data() }))
        .filter((a) => !a.estado?.includes("Baja"))
        .sort((a, b) => (a.arete || "").localeCompare(b.arete || ""));
      setAnimales(lista);
    });
    
    const cancelarPotreros = onSnapshot(collection(db, "potreros"), (snap) => setPotreros(snap.docs.map(d => d.data().nombre)));
    const cancelarGrupos = onSnapshot(collection(db, "grupos"), (snap) => setGrupos(snap.docs.map(d => d.data().nombre)));

    return () => { cancelarAnimales(); cancelarPotreros(); cancelarGrupos(); };
  }, []);

  // Cargar eventos y alertas del calendario
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
              title: data.titulo, // Ya no necesitamos decir el arete obligatoriamente
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

  // --- LÓGICA PARA GUARDAR EVENTO ---
  const guardarEventoCalendario = async (e) => {
    e.preventDefault();
    setGuardando(true);
    setExitoMsg("");

    try {
      let animalesObjetivo = [];

      if (modoAplicacion === "individual") {
        if (!animalSeleccionado) { alert("Selecciona un animal."); setGuardando(false); return; }
        animalesObjetivo = animales.filter((a) => a.id === animalSeleccionado);
      } else if (modoAplicacion === "masivo") {
        animalesObjetivo = animales.filter((a) => {
          const pasaPotrero = filtroPotrero === "Todos" || a.potrero === filtroPotrero || a.hectarea === filtroPotrero;
          const pasaGrupo = filtroGrupo === "Todos" || a.grupo === filtroGrupo;
          return pasaPotrero && pasaGrupo;
        });
      }

      if (animalesObjetivo.length === 0) { alert("No hay animales que coincidan."); setGuardando(false); return; }

      for (const animal of animalesObjetivo) {
        await addDoc(collection(db, "eventos"), {
          animalId: animal.id,
          tipo: datosEvento.tipo,
          resultado: datosEvento.resultado,
          fecha: datosEvento.fecha,
          costo: Number(datosEvento.costo) || 0,
        });
      }

      // Omitido a peticion del usuario: No generar alerta global en el calendario para tratamientos.
      // (Se siguen registrando en el historial de cada animal).
      /* if (datosEvento.recordatorio && datosEvento.recordatorio !== "Ninguno") {
        const eventDate = new Date(datosEvento.fecha + "T00:00:00");
        if (datosEvento.recordatorio === "1 día antes") eventDate.setDate(eventDate.getDate() - 1);
        else if (datosEvento.recordatorio === "1 semana antes") eventDate.setDate(eventDate.getDate() - 7);

        const tituloGlobal = modoAplicacion === "individual" 
          ? `📅 ${datosEvento.tipo} - ${animalesObjetivo[0]?.arete}` 
          : `📅 ${datosEvento.tipo} (Masivo: ${animalesObjetivo.length} cabezas)`;

        await addDoc(collection(db, "alertas"), {
          fechaProgramada: eventDate.toISOString().split("T")[0],
          titulo: tituloGlobal,
          completada: false,
        });
      } */

      const msg = animalesObjetivo.length === 1
        ? `✅ Evento registrado para ${animalesObjetivo[0].arete}`
        : `✅ Evento aplicado a ${animalesObjetivo.length} animales`;
      setExitoMsg(msg);
      setDatosEvento({ tipo: "Vacunación", resultado: "", fecha: new Date().toISOString().split("T")[0], costo: "", recordatorio: "1 semana antes" });
      setAnimalSeleccionado("");
      setTimeout(() => { setExitoMsg(""); setMostrarModal(false); }, 2000);
    } catch (error) {
      console.error(error);
      alert("Error al guardar el evento.");
    }
    setGuardando(false);
  };

  // Filtrar animales para el buscador
  const animalesFiltrados = animales.filter((a) =>
    a.arete?.toLowerCase().includes(busquedaAnimal.toLowerCase()) ||
    a.tipo?.toLowerCase().includes(busquedaAnimal.toLowerCase()) ||
    a.raza?.toLowerCase().includes(busquedaAnimal.toLowerCase())
  );

  const inputStyle = {
    width: "100%", padding: "10px 12px", border: "1px solid #d1d5db",
    borderRadius: "6px", fontSize: "14px", boxSizing: "border-box",
  };
  const labelStyle = { display: "block", fontSize: "13px", fontWeight: "600", color: "#374151", marginBottom: "6px" };

  return (
    <div className="dashboard-container" style={{ padding: "0 16px" }}>
      <div className="header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1>Calendario de Planeación</h1>
          <p>Organiza las tareas del rancho y aplica tratamientos de forma rápida a los animales.</p>
        </div>
        <button
          className="btn-primary"
          style={{ margin: 0, width: "auto", display: "flex", alignItems: "center", gap: "6px", padding: "10px 20px" }}
          onClick={() => setMostrarModal(true)}
        >
          <Plus size={18} /> Cargar Tratamientos
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
            setDatosEvento({ ...datosEvento, fecha: slotInfo.start.toISOString().split("T")[0] });
            setMostrarModal(true);
          }}
          selectable={true}
        />
      </div>

      {/* ====== MODAL DE NUEVO EVENTO ====== */}
      {mostrarModal && (
        <div className="modal-overlay" onClick={() => setMostrarModal(false)}>
          <div className="modal-content" style={{ maxWidth: "550px" }} onClick={(e) => e.stopPropagation()}>

            {/* Header del Modal */}
            <div className="modal-header">
              <div>
                <h2 style={{ margin: 0, fontSize: "20px", color: "#111827" }}>💉 Cargar Tratamiento</h2>
                <p style={{ margin: "4px 0 0", color: "#6b7280", fontSize: "13px" }}>
                  Aplica una actividad al historial de uno o varios animales y guárdalo en la planeación.
                </p>
              </div>
              <button onClick={() => setMostrarModal(false)} style={{ background: "none", border: "none", cursor: "pointer" }}>
                <X size={24} color="#9ca3af" />
              </button>
            </div>

            {/* Mensaje de éxito */}
            {exitoMsg && (
              <div className="file-status status-success" style={{ marginBottom: "16px" }}>
                <span>{exitoMsg}</span>
              </div>
            )}

            {/* Selector de Modo */}
            <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
              {[
                { id: "individual", label: "Un Animal", icon: <User size={16} /> },
                { id: "masivo", label: "Masivo (Filtros)", icon: <Layers size={16} /> },
              ].map((modo) => (
                <button
                  type="button"
                  key={modo.id}
                  onClick={() => setModoAplicacion(modo.id)}
                  style={{
                    flex: 1, padding: "10px", borderRadius: "8px", cursor: "pointer",
                    border: modoAplicacion === modo.id ? "2px solid #3b82f6" : "1px solid #d1d5db",
                    backgroundColor: modoAplicacion === modo.id ? "#eff6ff" : "white",
                    color: modoAplicacion === modo.id ? "#3b82f6" : "#6b7280",
                    fontWeight: "600", fontSize: "13px",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
                  }}
                >
                  {modo.icon} {modo.label}
                </button>
              ))}
            </div>

            <form onSubmit={guardarEventoCalendario}>
              {/* --- Selector de Animal Individual --- */}
              {modoAplicacion === "individual" && (
                <div style={{ marginBottom: "16px" }}>
                  <label style={labelStyle}>Buscar Animal (Arete, Tipo o Raza)</label>
                  <input
                    type="text"
                    placeholder="Ej: VC-1234 o Brahman..."
                    value={busquedaAnimal}
                    onChange={(e) => setBusquedaAnimal(e.target.value)}
                    style={{ ...inputStyle, marginBottom: "8px" }}
                  />
                  <select
                    value={animalSeleccionado}
                    onChange={(e) => setAnimalSeleccionado(e.target.value)}
                    style={inputStyle}
                    required
                  >
                    <option value="">-- Selecciona un animal --</option>
                    {animalesFiltrados.slice(0, 50).map((a) => (
                      <option key={a.id} value={a.id}>
                        {a.arete} — {a.tipo} ({a.raza || "Sin raza"}) {a.estado !== "Sano" ? `⚠️ ${a.estado}` : ""}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* --- Selectores Filtro Masivo --- */}
              {modoAplicacion === "masivo" && (
                <div style={{ display: "flex", gap: "10px", marginBottom: "16px" }}>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Filtrar por Potrero</label>
                    <select value={filtroPotrero} onChange={(e) => setFiltroPotrero(e.target.value)} style={inputStyle}>
                      <option value="Todos">Todos los Potreros</option>
                      {potreros.map((pot) => <option key={pot} value={pot}>{pot}</option>)}
                    </select>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Grupo de Manejo</label>
                    <select value={filtroGrupo} onChange={(e) => setFiltroGrupo(e.target.value)} style={inputStyle}>
                      <option value="Todos">Todos los Grupos</option>
                      {grupos.map((g) => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                </div>
              )}

              {/* --- Campos del Evento --- */}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
                <div>
                  <label style={labelStyle}>Tipo de Evento</label>
                  <select value={datosEvento.tipo} onChange={(e) => setDatosEvento({ ...datosEvento, tipo: e.target.value, resultado: "" })} style={inputStyle}>
                    {TIPOS_EVENTO.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Fecha</label>
                  <input type="date" value={datosEvento.fecha} onChange={(e) => setDatosEvento({ ...datosEvento, fecha: e.target.value })} style={inputStyle} required />
                </div>
              </div>

              {CATALOGO_EVENTOS[datosEvento.tipo]?.length > 0 && (
                <div style={{ marginBottom: "16px" }}>
                  <label style={labelStyle}>Insumo / Tipo Específico</label>
                  <select value={datosEvento.resultado} onChange={(e) => setDatosEvento({ ...datosEvento, resultado: e.target.value })} style={{ ...inputStyle, border: "1px solid #3b82f6", backgroundColor: "#eff6ff" }} required>
                    <option value="">-- Selecciona el insumo / tipo --</option>
                    {CATALOGO_EVENTOS[datosEvento.tipo].map(sub => <option key={sub} value={sub}>{sub}</option>)}
                  </select>
                </div>
              )}

              {(!CATALOGO_EVENTOS[datosEvento.tipo] || CATALOGO_EVENTOS[datosEvento.tipo].length === 0) && (
                <div style={{ marginBottom: "16px" }}>
                  <label style={labelStyle}>Detalle / Resultado</label>
                  <input
                    type="text"
                    placeholder="Ej: 350 kg, Cría hembra sana..."
                    value={datosEvento.resultado}
                    onChange={(e) => setDatosEvento({ ...datosEvento, resultado: e.target.value })}
                    style={inputStyle}
                    required
                  />
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "20px" }}>
                <div>
                  <label style={labelStyle}>Costo del Insumo ($)</label>
                  <input
                    type="number" step="0.5" placeholder="$0.00"
                    value={datosEvento.costo}
                    onChange={(e) => setDatosEvento({ ...datosEvento, costo: e.target.value })}
                    style={inputStyle}
                  />
                </div>
                <div>
                  <label style={labelStyle}>Recordatorio</label>
                  <select value={datosEvento.recordatorio} onChange={(e) => setDatosEvento({ ...datosEvento, recordatorio: e.target.value })} style={inputStyle}>
                    <option>Ninguno</option>
                    <option>1 día antes</option>
                    <option>1 semana antes</option>
                  </select>
                </div>
              </div>

              <button type="submit" className="btn-primary" style={{ width: "100%", marginTop: 0 }} disabled={guardando}>
                {guardando
                  ? "Guardando..."
                  : modoAplicacion === "todos"
                  ? `Aplicar a ${animales.length} animales`
                  : modoAplicacion === "grupo"
                  ? `Aplicar a ${animales.filter((a) => a.tipo === categoriaGrupo).length} ${categoriaGrupo}s`
                  : "Guardar Evento"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
