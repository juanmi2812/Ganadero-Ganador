import { useState, useEffect } from "react";
import { collection, onSnapshot, addDoc, updateDoc, doc, query, where, deleteDoc } from "firebase/firestore";
import { db } from "../firebase";
import { Plus, X, User, Layers, CalendarDays, ChevronDown, ChevronUp, CheckCircle2, Clock, AlertCircle, Bell, Trash2 } from "lucide-react";
import { CATALOGO_EVENTOS, TIPOS_EVENTO } from "../catalogoEventos";

import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import { format, parse, startOfWeek, getDay, isBefore, addDays } from "date-fns";
import { es } from "date-fns/locale";
import "react-big-calendar/lib/css/react-big-calendar.css";

const locales = { es: es };
const localizer = dateFnsLocalizer({ format, parse, startOfWeek, getDay, locales });

// ── Chip clickeable de eventos en el calendario ───────────────────────────────
function EventoChip({ event }) {
  const hoy = new Date(); hoy.setHours(0,0,0,0);
  const bg = event.completada ? "#dcfce7"
    : isBefore(event.start, hoy) ? "#fee2e2"
    : "#dbeafe";
  const color = event.completada ? "#166534"
    : isBefore(event.start, hoy) ? "#b91c1c"
    : "#1e40af";
  const dot = event.completada ? "#10b981"
    : isBefore(event.start, hoy) ? "#ef4444"
    : "#3b82f6";
  return (
    <div title={event.title} style={{
      display: "flex", alignItems: "center", gap: "4px",
      backgroundColor: bg, borderRadius: "4px",
      padding: "2px 6px", margin: "1px 0", cursor: "pointer",
    }}>
      <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: dot, flexShrink: 0 }} />
      <span style={{ fontSize: "11px", fontWeight: "600", color, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {event.tipo || event.title}
      </span>
    </div>
  );
}

export default function CalendarioAlertas({ usuario }) {
  const [eventosCalendario, setEventosCalendario] = useState([]);
  const [alertasPlaneadas, setAlertasPlaneadas] = useState([]);
  const [alertaDetalle, setAlertaDetalle] = useState(null);
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
    tipo: "Vacunación", resultado: "", fecha: new Date().toISOString().split("T")[0],
  });

  // Filtro lista compacta
  const [filtroMesLista, setFiltroMesLista] = useState("todos");
  const [listaExpandida, setListaExpandida] = useState(true);
  const [crearRecordatorio, setCrearRecordatorio] = useState(false);
  const [fechaRecordatorio, setFechaRecordatorio] = useState("");

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

      const paraCalendario = todas
        .filter(a => a.fechaProgramada && (a.origen === "planeado" || !a.origen))
        .map(a => {
          const [y, m, d] = a.fechaProgramada.split("-");
          return {
            id: a.id,
            title: a.titulo || a.tipo || "Actividad",
            tipo: a.tipo,
            resultado: a.resultado,
            modoAplicacion: a.modoAplicacion,
            animalId: a.animalId,
            filtroPotrero: a.filtroPotrero,
            filtroGrupo: a.filtroGrupo,
            start: new Date(y, m - 1, d),
            end: new Date(y, m - 1, d),
            allDay: true,
            completada: a.completada,
            origen: a.origen,
            rawId: a.id,
          };
        });

      setEventosCalendario(paraCalendario);
      setAlertasPlaneadas(
        todas
          .filter(a => a.fechaProgramada && (a.origen === "planeado" || !a.origen))
          .sort((a, b) => new Date(a.fechaProgramada) - new Date(b.fechaProgramada))
      );
    });
    return () => unsub();
  }, [usuario]);

  // Estilo minimalista: fondo transparente, sin borde — el renderizado lo maneja EventoMinimalista
  const estiloDeEventos = () => ({
    style: {
      backgroundColor: "transparent",
      border: "none",
      padding: 0,
      margin: 0,
    },
  });

  // ─── Marcar actividad como realizada ─────────────────────────────────────────
  const marcarRealizada = async (alertaId) => {
    try {
      await updateDoc(doc(db, "alertas", alertaId), { completada: true });
    } catch (err) { console.error(err); }
  };

  const eliminarAlerta = async (alertaId) => {
    if (!window.confirm("¿Estás seguro de eliminar esta actividad?")) return;
    try {
      await deleteDoc(doc(db, "alertas", alertaId));
    } catch (err) { console.error(err); }
  };

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
        fechaRecordatorio: crearRecordatorio && fechaRecordatorio ? fechaRecordatorio : null,
        titulo,
        tipo: datosEvento.tipo,
        resultado: datosEvento.resultado,
        modoAplicacion,
        animalId: modoAplicacion === "individual" ? animalSeleccionado : null,
        filtroPotrero: modoAplicacion === "masivo" ? filtroPotrero : null,
        filtroGrupo: modoAplicacion === "masivo" ? filtroGrupo : null,
        completada: false,
        origen: "planeado",
        ranchoId: usuario?.ranchoId || null
      });

      setExitoMsg(`✅ Actividad planeada para el ${datosEvento.fecha}`);
      setDatosEvento({ tipo: "Vacunación", resultado: "", fecha: new Date().toISOString().split("T")[0] });
      setAnimalSeleccionado("");
      setCrearRecordatorio(false);
      setFechaRecordatorio("");
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
  const hoy = new Date(); hoy.setHours(0, 0, 0, 0);
  const alertasFiltradas = alertasPlaneadas.filter(a => {
    if (filtroMesLista === "todos") return true;
    if (filtroMesLista === "proximos7") {
      const f = new Date(a.fechaProgramada + "T00:00:00");
      return !isBefore(f, hoy) && isBefore(f, addDays(hoy, 7));
    }
    return a.fechaProgramada?.startsWith(filtroMesLista);
  });

  const mesesConAlertas = [...new Set(alertasPlaneadas.map(a => a.fechaProgramada?.slice(0, 7)))].filter(Boolean).sort();

  const getEstadoAlerta = (alerta) => {
    if (alerta.completada) return { label: "Realizada", bg: "#dcfce7", color: "#166534", icon: <CheckCircle2 size={13} /> };
    const fecha = new Date(alerta.fechaProgramada + "T00:00:00");
    if (isBefore(fecha, hoy)) return { label: "No realizada", bg: "#fee2e2", color: "#dc2626", icon: <AlertCircle size={13} /> };
    return { label: "Pendiente", bg: "#fef9c3", color: "#854d0e", icon: <Clock size={13} /> };
  };

  const inputStyle = {
    width: "100%", padding: "10px 12px", border: "1px solid #d1d5db",
    borderRadius: "6px", fontSize: "14px", boxSizing: "border-box",
  };
  const labelStyle = { display: "block", fontSize: "13px", fontWeight: "600", color: "#374151", marginBottom: "6px" };

  return (
    <div className="dashboard-container" style={{ padding: "0 16px" }}>
      <div className="page-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <img src={require("../assets/logo_calendario.jpg")} alt="Calendario" style={{ width: "64px", height: "64px", objectFit: "contain", borderRadius: "12px", border: "1px solid #e5e7eb", backgroundColor: "white" }} />
          <div>
            <h1 style={{ margin: 0, fontSize: "22px", fontWeight: 800, color: "#111827", letterSpacing: "-0.3px" }}>Calendario de Planeación</h1>
            <p style={{ margin: "4px 0 0 0", fontSize: "14px", color: "#9ca3af" }}>Registra las actividades que planeas realizar. Lo ejecutado se carga desde "Mi Ganado".</p>
          </div>
        </div>
        <button
          className="btn-primary"
          style={{ margin: 0, width: "auto", display: "flex", alignItems: "center", gap: "6px", padding: "10px 20px" }}
          onClick={() => setMostrarModal(true)}
        >
          <Plus size={18} /> Planear Actividad
        </button>
      </div>

      {/* ── Calendario visual minimalista ──────────────────────────────────────── */}
      <div className="login-card" style={{ maxWidth: "100%", width: "100%", margin: "0 0 20px 0", padding: "24px", boxSizing: "border-box", height: "520px" }}>
        <style>{`
          .rbc-event { background: transparent !important; border: none !important; box-shadow: none !important; padding: 0 !important; }
          .rbc-event.rbc-selected { background: transparent !important; outline: none !important; }
          .rbc-day-slot .rbc-event { display: none; }
          .rbc-show-more { font-size: 11px; color: #3b82f6; font-weight: 600; }
          .rbc-toolbar button { font-size: 13px; }
        `}</style>
        <Calendar
          localizer={localizer}
          events={eventosCalendario}
          startAccessor="start"
          endAccessor="end"
          style={{ height: "100%" }}
          culture="es"
          messages={{ next: "Sig", previous: "Ant", today: "Hoy", month: "Mes", week: "Semana", day: "Día", showMore: total => `+${total} más` }}
          eventPropGetter={estiloDeEventos}
          components={{ event: EventoChip }}
          view={vista}
          onView={setVista}
          date={fechaActual}
          onNavigate={setFechaActual}
          onSelectEvent={(event) => {
            const alerta = alertasPlaneadas.find(a => a.id === event.rawId);
            if (alerta) setAlertaDetalle(alerta);
          }}
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
                const estado = getEstadoAlerta(alerta);
                const esPasada = !alerta.completada && isBefore(new Date(alerta.fechaProgramada + "T00:00:00"), hoy);
                return (
                  <div key={alerta.id} style={{
                    display: "flex", flexDirection: "column", gap: "10px",
                    padding: "12px 0", borderBottom: "1px solid #f3f4f6",
                  }}>
                    {/* Fecha y Detalle en row, y Estado a la derecha */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px", width: "100%" }}>
                      {/* Fecha */}
                      <div style={{ display: "flex", gap: "12px", alignItems: "center", flex: 1, minWidth: 0 }}>
                        <div style={{
                          minWidth: "50px", textAlign: "center",
                          backgroundColor: alerta.completada ? "#f0fdf4" : esPasada ? "#fef2f2" : "#eff6ff",
                          borderRadius: "8px", padding: "6px 4px", flexShrink: 0,
                        }}>
                          <div style={{ fontSize: "18px", fontWeight: "700", color: alerta.completada ? "#166534" : esPasada ? "#dc2626" : "#1d4ed8" }}>
                            {alerta.fechaProgramada?.slice(8)}
                          </div>
                          <div style={{ fontSize: "10px", color: alerta.completada ? "#166534" : esPasada ? "#dc2626" : "#1d4ed8", textTransform: "uppercase" }}>
                            {format(new Date(alerta.fechaProgramada + "T00:00:00"), "MMM", { locale: es })}
                          </div>
                        </div>
                        {/* Detalle */}
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={{ fontWeight: "600", fontSize: "14px", color: "#111827" }}>{alerta.tipo}</div>
                          {alerta.resultado && <div style={{ fontSize: "12px", color: "#6b7280" }}>{alerta.resultado}</div>}
                          {alerta.titulo && (
                            <div style={{ fontSize: "12px", color: "#9ca3af", marginTop: "2px", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                              {alerta.titulo.split("-")[1]?.trim() || alerta.titulo}
                            </div>
                          )}
                          {alerta.fechaRecordatorio && (
                            <div style={{
                              fontSize: "11px", fontWeight: "600", marginTop: "4px",
                              display: "flex", alignItems: "center", gap: "4px",
                              color: hoy >= new Date(alerta.fechaRecordatorio + "T00:00:00") && !alerta.completada ? "#ea580c" : "#9ca3af"
                            }}>
                              <Bell size={12} />
                              {hoy >= new Date(alerta.fechaRecordatorio + "T00:00:00") && !alerta.completada ? "¡Recordatorio Activo!" : `Recordatorio: ${alerta.fechaRecordatorio.slice(8)}/${alerta.fechaRecordatorio.slice(5, 7)}`}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Estado Pill a la derecha superior */}
                      <span style={{
                        display: "inline-flex", alignItems: "center", gap: "4px",
                        fontSize: "11px", fontWeight: "600", padding: "4px 8px", borderRadius: "12px",
                        backgroundColor: estado.bg, color: estado.color, whiteSpace: "nowrap", flexShrink: 0
                      }}>
                        {estado.icon} {estado.label}
                      </span>
                    </div>

                    {/* Botones de Acción abajo a la derecha */}
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: "8px", width: "100%", flexWrap: "wrap", marginTop: "4px" }}>
                      <div style={{ display: "flex", gap: "6px" }}>
                        {!alerta.completada && (
                          <button
                            onClick={() => marcarRealizada(alerta.id)}
                            style={{
                              fontSize: "11px", fontWeight: "600", padding: "4px 10px",
                              backgroundColor: "transparent", color: "#10b981", border: "1px solid #10b981",
                              borderRadius: "4px", cursor: "pointer",
                              display: "flex", alignItems: "center", gap: "4px",
                            }}
                          >
                            <CheckCircle2 size={12} /> Realizada
                          </button>
                        )}
                        <button
                          onClick={() => eliminarAlerta(alerta.id)}
                          style={{
                            fontSize: "11px", fontWeight: "600", padding: "4px 8px",
                            backgroundColor: "transparent", color: "#ef4444", border: "1px solid #ef4444",
                            borderRadius: "4px", cursor: "pointer",
                            display: "flex", alignItems: "center", justifyContent: "center"
                          }}
                          title="Eliminar Actividad"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )
        )}
      </div>

      {/* ══ MODAL DETALLE ACTIVIDAD ══════════════════════════════════════════════ */}
      {alertaDetalle && (() => {
        const hoyD = new Date(); hoyD.setHours(0,0,0,0);
        const fechaD = new Date(alertaDetalle.fechaProgramada + "T00:00:00");
        const estadoD = alertaDetalle.completada ? { label: "Realizada", bg: "#dcfce7", color: "#166534" }
          : isBefore(fechaD, hoyD) ? { label: "No realizada", bg: "#fee2e2", color: "#dc2626" }
          : { label: "Pendiente", bg: "#fef9c3", color: "#854d0e" };
        const objetivo = alertaDetalle.modoAplicacion === "individual"
          ? (alertaDetalle.titulo?.split("—")[1]?.trim() || "")
          : alertaDetalle.filtroPotrero && alertaDetalle.filtroPotrero !== "Todos"
            ? `Potrero: ${alertaDetalle.filtroPotrero}`
            : alertaDetalle.filtroGrupo && alertaDetalle.filtroGrupo !== "Todos"
              ? `Grupo: ${alertaDetalle.filtroGrupo}`
              : "Todo el hato";
        return (
          <div className="modal-overlay" onClick={() => setAlertaDetalle(null)}>
            <div className="modal-content" style={{ maxWidth: "400px" }} onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h2 style={{ margin: 0, fontSize: "18px" }}>📋 Detalle de Actividad</h2>
                <button onClick={() => setAlertaDetalle(null)} style={{ background: "none", border: "none", cursor: "pointer" }}><X size={22} color="#9ca3af" /></button>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginTop: "4px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <span style={{ fontSize: "20px", fontWeight: "700", color: "#111827" }}>{alertaDetalle.tipo}</span>
                  <span style={{ fontSize: "12px", fontWeight: "600", padding: "4px 10px", borderRadius: "12px", backgroundColor: estadoD.bg, color: estadoD.color }}>{estadoD.label}</span>
                </div>
                {alertaDetalle.resultado && <div style={{ backgroundColor: "#f9fafb", borderRadius: "8px", padding: "10px 12px", fontSize: "14px", color: "#374151" }}><strong>Insumo:</strong> {alertaDetalle.resultado}</div>}
                <div style={{ backgroundColor: "#f9fafb", borderRadius: "8px", padding: "10px 12px", display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <div><div style={{ fontSize: "11px", color: "#6b7280", fontWeight: "600" }}>FECHA</div><div style={{ fontSize: "14px", fontWeight: "600", color: "#111827" }}>{alertaDetalle.fechaProgramada}</div></div>
                  <div><div style={{ fontSize: "11px", color: "#6b7280", fontWeight: "600" }}>OBJETIVO</div><div style={{ fontSize: "14px", fontWeight: "600", color: "#111827" }}>{objetivo || "—"}</div></div>
                </div>
                {!alertaDetalle.completada && (
                  <button onClick={async () => { await marcarRealizada(alertaDetalle.id); setAlertaDetalle(null); }}
                    className="btn-primary" style={{ width: "100%", marginTop: 0, display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                    <CheckCircle2 size={18} /> Marcar como Realizada
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}

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
                    {TIPOS_EVENTO.filter(t => t !== "Parto" && t !== "Aborto").map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Fecha Planeada</label>
                  <input type="date" value={datosEvento.fecha}
                    onChange={e => setDatosEvento({ ...datosEvento, fecha: e.target.value })}
                    style={inputStyle} required />
                </div>
              </div>

              {datosEvento.tipo !== "Palpación" && (
                CATALOGO_EVENTOS[datosEvento.tipo]?.length > 0 ? (
                  <div style={{ marginBottom: "16px" }}>
                    <label style={labelStyle}>Insumo / Tipo Específico</label>
                    <input list="insumos-list"
                      placeholder="Selecciona o escribe uno nuevo..."
                      value={datosEvento.resultado}
                      onChange={e => setDatosEvento({ ...datosEvento, resultado: e.target.value })}
                      style={{ ...inputStyle, border: "1px solid #3b82f6", backgroundColor: "#eff6ff" }} required />
                    <datalist id="insumos-list">
                      {CATALOGO_EVENTOS[datosEvento.tipo].map(s => <option key={s} value={s}>{s}</option>)}
                    </datalist>
                  </div>
                ) : (
                  <div style={{ marginBottom: "16px" }}>
                    <label style={labelStyle}>Detalle / Observación</label>
                    <input type="text" placeholder="Ej: 350 kg, Cría hembra sana..."
                      value={datosEvento.resultado}
                      onChange={e => setDatosEvento({ ...datosEvento, resultado: e.target.value })}
                      style={inputStyle} required />
                  </div>
                )
              )}

              {/* Sección de Recordatorio Futuro */}
              <div style={{ backgroundColor: "#f0f9ff", border: "1px solid #bae6fd", borderRadius: "8px", padding: "12px", marginBottom: "16px" }}>
                <label style={{ display: "flex", alignItems: "center", gap: "8px", cursor: "pointer", fontWeight: "600", fontSize: "13px", color: "#0369a1" }}>
                  <input
                    type="checkbox"
                    checked={crearRecordatorio}
                    onChange={e => setCrearRecordatorio(e.target.checked)}
                    style={{ width: "16px", height: "16px", accentColor: "#0ea5e9" }}
                  />
                  📅 Programar recordatorio adicional
                </label>
                {crearRecordatorio && (
                  <div style={{ marginTop: "10px" }}>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: "600", marginBottom: "4px", color: "#374151" }}>Fecha del Recordatorio</label>
                    <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
                      <input
                        type="date"
                        value={fechaRecordatorio}
                        onChange={e => setFechaRecordatorio(e.target.value)}
                        style={{ flex: 1, padding: "8px", border: "1px solid #0ea5e9", borderRadius: "6px" }}
                      />
                      <button type="button" onClick={() => {
                        const d = new Date(datosEvento.fecha + "T00:00:00");
                        d.setDate(d.getDate() - 1);
                        setFechaRecordatorio(d.toISOString().split("T")[0]);
                      }} style={{ fontSize: "11px", padding: "6px 10px", border: "1px solid #0ea5e9", borderRadius: "6px", backgroundColor: "#e0f2fe", color: "#0369a1", cursor: "pointer", whiteSpace: "nowrap" }}>
                        1 día antes
                      </button>
                    </div>
                  </div>
                )}
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
