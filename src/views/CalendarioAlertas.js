import { useState, useEffect } from "react";
import { collection, onSnapshot, addDoc, query, where } from "firebase/firestore";
import { db } from "../firebase";
import { Plus, X, User, Layers, CalendarDays, ChevronDown, ChevronUp } from "lucide-react";
import { CATALOGO_EVENTOS, TIPOS_EVENTO } from "../catalogoEventos";

import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import { format, parse, startOfWeek, getDay, isBefore, addDays } from "date-fns";
import { es } from "date-fns/locale";
import "react-big-calendar/lib/css/react-big-calendar.css";

const locales = { es: es };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });

export default function CalendarioAlertas({ usuario }) {
  const [eventosCalendario, setEventosCalendario] = useState([]);
  const [alertasPlaneadas, setAlertasPlaneadas] = useState([]);
  const [vista, setVista] = useState("month");
  const [fechaActual, setFechaActual] = useState(new Date());

  const [mostrarModal, setMostrarModal] = useState(false);
  const [animales, setAnimales] = useState([]);
  const [busquedaAnimal, setBusquedaAnimal] = useState("");
  const [guardando, setGuardando] = useState(false);
  const [exitoMsg, setExitoMsg] = useState("");

  const [modoAplicacion, setModoAplicacion] = useState("individual");
  const [animalSeleccionado, setAnimalSeleccionado] = useState("");
  const [filtroPotrero, setFiltroPotrero] = useState("Todos");
  const [filtroGrupo, setFiltroGrupo] = useState("Todos");
  const [potreros, setPotreros] = useState([]);
  const [grupos, setGrupos] = useState([]);

  const [datosEvento, setDatosEvento] = useState({
    tipo: "Vacunación", resultado: "", fecha: new Date().toISOString().split("T")[0], costo: "",
  });

  // Filtro lista compacta
  const [filtroMesLista, setFiltroMesLista] = useState("todos");
  const [listaExpandida, setListaExpandida] = useState(true);

  useEffect(() => {
    if (!usuario?.ranchoId) return;
    const unsubA = onSnapshot(query(collection(db, "animales"), where("ranchoId", "==", usuario.ranchoId)), (snap) => {
      setAnimales(snap.docs.map(d => ({ id: d.id, ...d.data() }))
        .filter(a => !a.estado?.includes("Baja"))
        .sort((a, b) => (a.arete || "").localeCompare(b.arete || "")));
    });
    const unsubP = onSnapshot(query(collection(db, "potreros"), where("ranchoId", "==", usuario.ranchoId)), (snap) => setPotreros(snap.docs.map(d => d.data().nombre)));
    const unsubG = onSnapshot(query(collection(db, "grupos"), where("ranchoId", "==", usuario.ranchoId)), (snap) => setGrupos(snap.docs.map(d => d.data().nombre)));
    return () => { unsubA(); unsubP(); unsubG(); };
  }, [usuario]);

  // Cargar alertas planeadas para calendario y lista
  useEffect(() => {
    if (!usuario?.ranchoId) return;
    const unsub = onSnapshot(query(collection(db, "alertas"), where("ranchoId", "==", usuario.ranchoId)), (snap) => {
      const todas = snap.docs.map(d => ({ id: d.id, ...d.data() }));

      // Solo mostrar en calendario las planeadas (origen: "planeado" o sin campo origen para compatibilidad)
      const paraCalendario = todas
        .filter(a => a.fechaProgramada && (a.origen === "planeado" || !a.origen))
        .map(a => {
          const [y, m, d] = a.fechaProgramada.split("-");
          return {
            id: a.id,
            title: a.titulo || a.tipo || "Actividad",
            start: new Date(y, m - 1, d),
            end: new Date(y, m - 1, d),
            allDay: true,
            tipo: "alerta",
            completada: a.completada,
            origen: a.origen,
          };
        });

      setEventosCalendario(paraCalendario);
      // Para lista compacta: todas las planeadas, ordenadas por fecha
      setAlertasPlaneadas(
        todas
          .filter(a => a.fechaProgramada && (a.origen === "planeado" || !a.origen))
          .sort((a, b) => new Date(a.fechaProgramada) - new Date(b.fechaProgramada))
      );
    });
    return () => unsub();
  }, [usuario]);

  const estiloDeEventos = (event) => ({
    style: {
      backgroundColor: event.completada ? "#10b981" : "#3b82f6",
      borderRadius: "6px", color: "white", border: "none",
      display: "block", padding: "4px", fontSize: "12px",
    },
  });

  // ─── Guardar actividad planeada en alertas ────────────────────────────────────

  const guardarActividadPlaneada = async (e) => {
    e.preventDefault();
    setGuardando(true);
    setExitoMsg("");

    try {
      let descripcionObjetivo = "";

      if (modoAplicacion === "individual") {
        if (!animalSeleccionado) { alert("Selecciona un animal."); setGuardando(false); return; }
        const animal = animales.find(a => a.id === animalSeleccionado);
        descripcionObjetivo = animal ? `Animal: ${animal.arete}` : "";
      } else {
        const partesPotrero = filtroPotrero !== "Todos" ? `Potrero: ${filtroPotrero}` : "Todos los potreros";
        const partesGrupo = filtroGrupo !== "Todos" ? ` · Grupo: ${filtroGrupo}` : "";
        descripcionObjetivo = `${partesPotrero}${partesGrupo}`;
      }

      const titulo = `${datosEvento.tipo}${datosEvento.resultado ? ` (${datosEvento.resultado})` : ""} — ${descripcionObjetivo}`;

      await addDoc(collection(db, "alertas"), {
        fechaProgramada: datosEvento.fecha,
        titulo,
        tipo: datosEvento.tipo,
        resultado: datosEvento.resultado,
        costo: Number(datosEvento.costo) || 0,
        modoAplicacion,
        animalId: modoAplicacion === "individual" ? animalSeleccionado : null,
        filtroPotrero: modoAplicacion === "masivo" ? filtroPotrero : null,
        filtroGrupo: modoAplicacion === "masivo" ? filtroGrupo : null,
        completada: false,
        origen: "planeado",
        ranchoId: usuario?.ranchoId || null
      });

      setExitoMsg(`✅ Actividad planeada para el ${datosEvento.fecha}`);
      setDatosEvento({ tipo: "Vacunación", resultado: "", fecha: new Date().toISOString().split("T")[0], costo: "" });
      setAnimalSeleccionado("");
      setTimeout(() => { setExitoMsg(""); setMostrarModal(false); }, 2000);
    } catch (err) {
      console.error(err);
      alert("Error al guardar la actividad.");
    }
    setGuardando(false);
  };

  const animalesFiltrados = animales.filter(a =>
    a.arete?.toLowerCase().includes(busquedaAnimal.toLowerCase()) ||
    a.tipo?.toLowerCase().includes(busquedaAnimal.toLowerCase()) ||
    a.raza?.toLowerCase().includes(busquedaAnimal.toLowerCase())
  );

  // ─── Lista compacta filtrada ──────────────────────────────────────────────────

  const hoy = new Date();
  const alertasFiltradas = alertasPlaneadas.filter(a => {
    if (filtroMesLista === "todos") return true;
    if (filtroMesLista === "proximos7") {
      const f = new Date(a.fechaProgramada + "T00:00:00");
      return !isBefore(f, hoy) && isBefore(f, addDays(hoy, 7));
    }
    // filtro por "YYYY-MM"
    return a.fechaProgramada?.startsWith(filtroMesLista);
  });

  // Generar opciones de meses con alertas
  const mesesConAlertas = [...new Set(alertasPlaneadas.map(a => a.fechaProgramada?.slice(0, 7)))].filter(Boolean).sort();

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
          <p>Registra las actividades que planeas realizar. Lo ejecutado se carga desde "Mi Ganado".</p>
        </div>
        <button
          className="btn-primary"
          style={{ margin: 0, width: "auto", display: "flex", alignItems: "center", gap: "6px", padding: "10px 20px" }}
          onClick={() => setMostrarModal(true)}
        >
          <Plus size={18} /> Planear Actividad
        </button>
      </div>

      {/* ── Calendario visual ─────────────────────────────────────────────────── */}
      <div className="login-card" style={{ maxWidth: "100%", width: "100%", margin: "0 0 20px 0", padding: "24px", boxSizing: "border-box", height: "580px" }}>
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
          onView={setVista}
          date={fechaActual}
          onNavigate={setFechaActual}
          onSelectSlot={(slotInfo) => {
            setDatosEvento(d => ({ ...d, fecha: slotInfo.start.toISOString().split("T")[0] }));
            setMostrarModal(true);
          }}
          selectable={true}
        />
      </div>

      {/* ── Lista compacta de actividades planeadas ───────────────────────────── */}
      <div className="card" style={{ padding: "20px", marginBottom: "80px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "14px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <CalendarDays size={20} color="var(--verde-medio)" />
            <h2 style={{ margin: 0, fontSize: "16px" }}>
              Actividades Planeadas
              <span style={{ marginLeft: "8px", backgroundColor: "#dbeafe", color: "#1e40af", borderRadius: "12px", padding: "2px 8px", fontSize: "12px" }}>
                {alertasPlaneadas.length}
              </span>
            </h2>
          </div>
          <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
            <select
              value={filtroMesLista}
              onChange={e => setFiltroMesLista(e.target.value)}
              style={{ padding: "6px 10px", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "13px" }}
            >
              <option value="todos">Todas</option>
              <option value="proximos7">Próximos 7 días</option>
              {mesesConAlertas.map(m => (
                <option key={m} value={m}>
                  {format(new Date(m + "-01T00:00:00"), "MMMM yyyy", { locale: es })}
                </option>
              ))}
            </select>
            <button onClick={() => setListaExpandida(v => !v)}
              style={{ background: "none", border: "none", cursor: "pointer", color: "#6b7280" }}>
              {listaExpandida ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </button>
          </div>
        </div>

        {listaExpandida && (
          alertasFiltradas.length === 0 ? (
            <p style={{ textAlign: "center", color: "#9ca3af", padding: "20px 0", fontSize: "14px" }}>
              No hay actividades planeadas{filtroMesLista !== "todos" ? " para este período" : ". Presiona 'Planear Actividad' para empezar."}.
            </p>
          ) : (
            <div>
              {alertasFiltradas.map(alerta => {
                const esPasada = isBefore(new Date(alerta.fechaProgramada + "T00:00:00"), hoy);
                return (
                  <div key={alerta.id} style={{
                    display: "flex", justifyContent: "space-between", alignItems: "flex-start",
                    padding: "12px 0", borderBottom: "1px solid #f3f4f6",
                  }}>
                    <div style={{ display: "flex", gap: "12px", alignItems: "flex-start" }}>
                      <div style={{
                        minWidth: "50px", textAlign: "center", backgroundColor: esPasada ? "#fef2f2" : "#f0fdf4",
                        borderRadius: "8px", padding: "6px 4px",
                      }}>
                        <div style={{ fontSize: "18px", fontWeight: "700", color: esPasada ? "#dc2626" : "#166534" }}>
                          {alerta.fechaProgramada?.slice(8)}
                        </div>
                        <div style={{ fontSize: "10px", color: esPasada ? "#dc2626" : "#166534", textTransform: "uppercase" }}>
                          {format(new Date(alerta.fechaProgramada + "T00:00:00"), "MMM", { locale: es })}
                        </div>
                      </div>
                      <div>
                        <div style={{ fontWeight: "600", fontSize: "14px", color: "#111827" }}>{alerta.tipo}</div>
                        {alerta.resultado && <div style={{ fontSize: "12px", color: "#6b7280" }}>{alerta.resultado}</div>}
                        {alerta.titulo && (
                          <div style={{ fontSize: "12px", color: "#9ca3af", marginTop: "2px" }}>
                            {alerta.titulo.split("—")[1]?.trim() || alerta.titulo}
                          </div>
                        )}
                      </div>
                    </div>
                    <span style={{
                      fontSize: "11px", fontWeight: "600", padding: "3px 8px", borderRadius: "12px",
                      backgroundColor: alerta.completada ? "#dcfce7" : "#fef9c3",
                      color: alerta.completada ? "#166534" : "#854d0e",
                      whiteSpace: "nowrap",
                    }}>
                      {alerta.completada ? "Realizado" : "Pendiente"}
                    </span>
                  </div>
                );
              })}
            </div>
          )
        )}
      </div>

      {/* ══ MODAL PLANEAR ACTIVIDAD ══════════════════════════════════════════════ */}
      {mostrarModal && (
        <div className="modal-overlay" onClick={() => setMostrarModal(false)}>
          <div className="modal-content" style={{ maxWidth: "550px" }} onClick={e => e.stopPropagation()}>

            <div className="modal-header">
              <div>
                <h2 style={{ margin: 0, fontSize: "20px", color: "#111827" }}>📅 Planear Actividad</h2>
                <p style={{ margin: "4px 0 0", color: "#6b7280", fontSize: "13px" }}>
                  Registra lo que planeas hacer. Lo realizado se carga desde "Mi Ganado".
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

            {/* Modo */}
            <div style={{ display: "flex", gap: "8px", marginBottom: "20px" }}>
              {[
                { id: "individual", label: "Un Animal", icon: <User size={16} /> },
                { id: "masivo", label: "Masivo (Filtros)", icon: <Layers size={16} /> },
              ].map(modo => (
                <button type="button" key={modo.id} onClick={() => setModoAplicacion(modo.id)}
                  style={{
                    flex: 1, padding: "10px", borderRadius: "8px", cursor: "pointer",
                    border: modoAplicacion === modo.id ? "2px solid #3b82f6" : "1px solid #d1d5db",
                    backgroundColor: modoAplicacion === modo.id ? "#eff6ff" : "white",
                    color: modoAplicacion === modo.id ? "#3b82f6" : "#6b7280",
                    fontWeight: "600", fontSize: "13px",
                    display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
                  }}>
                  {modo.icon} {modo.label}
                </button>
              ))}
            </div>

            <form onSubmit={guardarActividadPlaneada}>
              {modoAplicacion === "individual" && (
                <div style={{ marginBottom: "16px" }}>
                  <label style={labelStyle}>Buscar Animal (Arete, Tipo o Raza)</label>
                  <input type="text" placeholder="Ej: VC-1234 o Brahman..."
                    value={busquedaAnimal} onChange={e => setBusquedaAnimal(e.target.value)}
                    style={{ ...inputStyle, marginBottom: "8px" }} />
                  <select value={animalSeleccionado} onChange={e => setAnimalSeleccionado(e.target.value)} style={inputStyle} required>
                    <option value="">-- Selecciona un animal --</option>
                    {animalesFiltrados.slice(0, 50).map(a => (
                      <option key={a.id} value={a.id}>
                        {a.arete} — {a.tipo} ({a.raza || "Sin raza"})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {modoAplicacion === "masivo" && (
                <div style={{ display: "flex", gap: "10px", marginBottom: "16px" }}>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Filtrar por Potrero</label>
                    <select value={filtroPotrero} onChange={e => setFiltroPotrero(e.target.value)} style={inputStyle}>
                      <option value="Todos">Todos los Potreros</option>
                      {potreros.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={labelStyle}>Grupo de Manejo</label>
                    <select value={filtroGrupo} onChange={e => setFiltroGrupo(e.target.value)} style={inputStyle}>
                      <option value="Todos">Todos los Grupos</option>
                      {grupos.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                </div>
              )}

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" }}>
                <div>
                  <label style={labelStyle}>Tipo de Actividad</label>
                  <select value={datosEvento.tipo}
                    onChange={e => setDatosEvento({ ...datosEvento, tipo: e.target.value, resultado: "" })}
                    style={inputStyle}>
                    {TIPOS_EVENTO.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Fecha Planeada</label>
                  <input type="date" value={datosEvento.fecha}
                    onChange={e => setDatosEvento({ ...datosEvento, fecha: e.target.value })}
                    style={inputStyle} required />
                </div>
              </div>

              {CATALOGO_EVENTOS[datosEvento.tipo]?.length > 0 ? (
                <div style={{ marginBottom: "16px" }}>
                  <label style={labelStyle}>Insumo / Tipo Específico</label>
                  <select value={datosEvento.resultado}
                    onChange={e => setDatosEvento({ ...datosEvento, resultado: e.target.value })}
                    style={{ ...inputStyle, border: "1px solid #3b82f6", backgroundColor: "#eff6ff" }} required>
                    <option value="">-- Selecciona --</option>
                    {CATALOGO_EVENTOS[datosEvento.tipo].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              ) : (
                <div style={{ marginBottom: "16px" }}>
                  <label style={labelStyle}>Detalle / Observación</label>
                  <input type="text" placeholder="Ej: 350 kg, Cría hembra sana..."
                    value={datosEvento.resultado}
                    onChange={e => setDatosEvento({ ...datosEvento, resultado: e.target.value })}
                    style={inputStyle} required />
                </div>
              )}

              <div style={{ marginBottom: "20px" }}>
                <label style={labelStyle}>Costo Estimado ($)</label>
                <input type="number" step="0.5" placeholder="$0.00"
                  value={datosEvento.costo}
                  onChange={e => setDatosEvento({ ...datosEvento, costo: e.target.value })}
                  style={inputStyle} />
              </div>

              <button type="submit" className="btn-primary" style={{ width: "100%", marginTop: 0 }} disabled={guardando}>
                {guardando ? "Guardando..." : "Guardar en Planeación"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
