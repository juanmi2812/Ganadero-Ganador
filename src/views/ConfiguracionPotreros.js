import React, { useState, useEffect } from "react";
import { Plus, Edit2, Trash2, Map, ShieldAlert, X, ClipboardList } from "lucide-react";
import { collection, onSnapshot, addDoc, updateDoc, deleteDoc, doc, query, where } from "firebase/firestore";
import { db } from "../firebase";
import { CATALOGO_EVENTOS, TIPOS_EVENTO } from "../catalogoEventos";

const inputStyle = { width: "100%", padding: "8px", borderRadius: "4px", border: "1px solid #d1d5db", boxSizing: "border-box" };
const labelStyle = { display: "block", fontSize: "12px", fontWeight: "bold", marginBottom: "4px", color: "#4b5563" };

export default function ConfiguracionPotreros({ usuario, onCargarTratamiento }) {
  const [potreros, setPotreros] = useState([]);
  const [formActivo, setFormActivo] = useState(false);
  const [editandoId, setEditandoId] = useState(null);
  const [datosForm, setDatosForm] = useState({
    nombre: "", hectareas: "", tipoPastoNombre: "", porcentajePasto: "",
    tipoPastoTamano: "", divisiones: []
  });
  const [nuevaDivision, setNuevaDivision] = useState("");

  const [grupos, setGrupos] = useState([]);
  const [formGrupoActivo, setFormGrupoActivo] = useState(false);
  const [editandoGrupoId, setEditandoGrupoId] = useState(null);
  const [datosFormGrupo, setDatosFormGrupo] = useState({ nombre: "" });

  // Estado modal tratamiento potrero
  const [modalTratamiento, setModalTratamiento] = useState(false);
  const [potreroActivo, setPotreroActivo] = useState(null);
  const [datosTratamiento, setDatosTratamiento] = useState({
    tipo: "Desparasitante", resultado: "", fecha: new Date().toISOString().split("T")[0], costo: ""
  });
  const [guardandoTrat, setGuardandoTrat] = useState(false);
  const [exitoTrat, setExitoTrat] = useState("");

  // Historial modal
  const [modalHistorial, setModalHistorial] = useState(false);
  const [historialPotrero, setHistorialPotrero] = useState([]);
  const [cargandoHistorial, setCargandoHistorial] = useState(false);

  useEffect(() => {
    if (!usuario?.ranchoId) return;
    const unsubP = onSnapshot(query(collection(db, "potreros"), where("ranchoId", "==", usuario.ranchoId)), (snap) => {
      setPotreros(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    const unsubG = onSnapshot(query(collection(db, "grupos"), where("ranchoId", "==", usuario.ranchoId)), (snap) => {
      setGrupos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    return () => { unsubP(); unsubG(); };
  }, [usuario]);

  // ─── Divisiones ──────────────────────────────────────────────────────────────

  const agregarDivision = () => {
    const val = nuevaDivision.trim();
    if (!val) return;
    setDatosForm(f => ({ ...f, divisiones: [...f.divisiones, val] }));
    setNuevaDivision("");
  };

  const quitarDivision = (idx) => {
    setDatosForm(f => ({ ...f, divisiones: f.divisiones.filter((_, i) => i !== idx) }));
  };

  // ─── Potreros ────────────────────────────────────────────────────────────────

  const guardarPotrero = async (e) => {
    e.preventDefault();
    try {
      const potreroData = {
        nombre: datosForm.nombre,
        hectareas: Number(datosForm.hectareas) || 0,
        tipoPastoNombre: datosForm.tipoPastoNombre || "",
        porcentajePasto: Number(datosForm.porcentajePasto) || 0,
        tipoPastoTamano: datosForm.tipoPastoTamano || "",
        divisiones: datosForm.divisiones || [],
        ranchoId: usuario?.ranchoId || null
      };
      if (editandoId) {
        await updateDoc(doc(db, "potreros", editandoId), potreroData);
      } else {
        await addDoc(collection(db, "potreros"), potreroData);
      }
      cerrarFormPotrero();
    } catch (error) { console.error("Error guardando potrero:", error); }
  };

  const cerrarFormPotrero = () => {
    setFormActivo(false);
    setEditandoId(null);
    setNuevaDivision("");
    setDatosForm({ nombre: "", hectareas: "", tipoPastoNombre: "", porcentajePasto: "", tipoPastoTamano: "", divisiones: [] });
  };

  const editarPotrero = (pot) => {
    setDatosForm({
      nombre: pot.nombre || "",
      hectareas: pot.hectareas || "",
      tipoPastoNombre: pot.tipoPastoNombre || "",
      porcentajePasto: pot.porcentajePasto || "",
      tipoPastoTamano: pot.tipoPastoTamano || "",
      divisiones: pot.divisiones || [],
    });
    setEditandoId(pot.id);
    setFormActivo(true);
  };

  const borrarPotrero = async (id) => {
    if (window.confirm("¿Seguro que deseas eliminar este potrero?")) {
      try { await deleteDoc(doc(db, "potreros", id)); }
      catch (error) { console.error("Error borrando potrero:", error); }
    }
  };

  // ─── Tratamiento de potrero ───────────────────────────────────────────────────

  const abrirModalTratamiento = (pot) => {
    setPotreroActivo(pot);
    setDatosTratamiento({ tipo: "Desparasitante", resultado: "", fecha: new Date().toISOString().split("T")[0], costo: "" });
    setExitoTrat("");
    setModalTratamiento(true);
  };

  const guardarTratamientoPotrero = async (e) => {
    e.preventDefault();
    setGuardandoTrat(true);
    try {
      await addDoc(collection(db, "eventosPotreros"), {
        potreroId: potreroActivo.id,
        potreroNombre: potreroActivo.nombre,
        tipo: datosTratamiento.tipo,
        resultado: datosTratamiento.resultado,
        fecha: datosTratamiento.fecha,
        costo: Number(datosTratamiento.costo) || 0,
        ranchoId: usuario?.ranchoId || null
      });
      setExitoTrat(`✅ Tratamiento registrado en ${potreroActivo.nombre}`);
      setDatosTratamiento({ tipo: "Desparasitante", resultado: "", fecha: new Date().toISOString().split("T")[0], costo: "" });
      setTimeout(() => { setExitoTrat(""); setModalTratamiento(false); }, 2000);
    } catch (err) { console.error(err); }
    setGuardandoTrat(false);
  };

  const abrirHistorial = async (pot) => {
    setPotreroActivo(pot);
    setCargandoHistorial(true);
    setModalHistorial(true);
    try {
      const q = query(collection(db, "eventosPotreros"), where("potreroId", "==", pot.id));
      const unsubH = onSnapshot(q, (snap) => {
        const lista = snap.docs.map(d => ({ id: d.id, ...d.data() }))
          .sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
        setHistorialPotrero(lista);
        setCargandoHistorial(false);
      });
      return unsubH;
    } catch (err) { console.error(err); setCargandoHistorial(false); }
  };

  // ─── Grupos ───────────────────────────────────────────────────────────────────

  const guardarGrupo = async (e) => {
    e.preventDefault();
    try {
      const grupoData = { 
        nombre: datosFormGrupo.nombre,
        ranchoId: usuario?.ranchoId || null
      };
      if (editandoGrupoId) {
        await updateDoc(doc(db, "grupos", editandoGrupoId), grupoData);
      } else {
        await addDoc(collection(db, "grupos"), grupoData);
      }
      setFormGrupoActivo(false);
      setEditandoGrupoId(null);
      setDatosFormGrupo({ nombre: "" });
    } catch (error) { console.error("Error guardando grupo:", error); }
  };

  const editarGrupo = (g) => {
    setDatosFormGrupo({ nombre: g.nombre });
    setEditandoGrupoId(g.id);
    setFormGrupoActivo(true);
  };

  const borrarGrupo = async (id) => {
    if (window.confirm("¿Seguro que deseas eliminar este grupo de manejo?")) {
      try { await deleteDoc(doc(db, "grupos", id)); }
      catch (error) { console.error("Error borrando grupo:", error); }
    }
  };

  const getTotalHectareas = () => potreros.reduce((total, p) => total + (p.hectareas || 0), 0);

  // ─── UI ──────────────────────────────────────────────────────────────────────

  return (
    <div className="dashboard-container">
      <div className="header" style={{ marginBottom: "20px", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div>
          <h1 style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <Map size={28} color="var(--verde-medio)" />
            Mi Rancho
          </h1>
          <p>Administra los Potreros, Divisiones Internas y Grupos de Manejo de tu rancho.</p>
        </div>
        <button 
          className="btn-primary" 
          onClick={onCargarTratamiento}
          style={{ margin: 0, width: "auto", display: "flex", alignItems: "center", gap: "6px", backgroundColor: "#16a34a", borderColor: "#16a34a", padding: "10px 20px" }}
        >
          💊 Cargar Tratamiento
        </button>
      </div>

      {/* ══ TABLA DE POTREROS ══════════════════════════════════════════════════ */}
      <div className="card" style={{ padding: "20px", marginBottom: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: "18px" }}>Mis Potreros</h2>
            <div style={{ fontSize: "13px", color: "var(--gris-400)", marginTop: "4px" }}>
              Total de superficie: <strong style={{ color: "var(--verde-oscuro)" }}>{getTotalHectareas()} Has</strong>
            </div>
          </div>
          {!formActivo && (
            <button className="btn-primary" style={{ width: "auto", padding: "8px 16px" }} onClick={() => { setFormActivo(true); setEditandoId(null); }}>
              <Plus size={18} /> Nuevo Potrero
            </button>
          )}
        </div>

        {/* Formulario Potrero */}
        {formActivo && (
          <form onSubmit={guardarPotrero} style={{ backgroundColor: "#f9fafb", padding: "15px", borderRadius: "8px", border: "1px solid #e5e7eb", marginBottom: "20px" }}>
            <h3 style={{ fontSize: "15px", marginTop: 0, marginBottom: "15px", color: "#374151" }}>
              {editandoId ? "Editar Potrero" : "Crear Nuevo Potrero"}
            </h3>

            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "12px" }}>
              {/* Nombre */}
              <div style={{ flex: "1 1 200px" }}>
                <label style={labelStyle}>Nombre del Potrero</label>
                <input type="text" placeholder="Ej: Potrero Norte, Lote 4..."
                  value={datosForm.nombre} onChange={e => setDatosForm({...datosForm, nombre: e.target.value})}
                  required style={inputStyle} />
              </div>
              {/* Hectáreas */}
              <div style={{ flex: "1 1 140px" }}>
                <label style={labelStyle}>Extensión (Hectáreas)</label>
                <input type="number" step="0.01" placeholder="Ej: 50.5"
                  value={datosForm.hectareas} onChange={e => setDatosForm({...datosForm, hectareas: e.target.value})}
                  required style={inputStyle} />
              </div>
              {/* Tipo de Pasto */}
              <div style={{ flex: "1 1 200px" }}>
                <label style={labelStyle}>Tipo de Pasto (Nombre)</label>
                <input type="text" placeholder="Ej: Bermudas, Pangola..."
                  value={datosForm.tipoPastoNombre} onChange={e => setDatosForm({...datosForm, tipoPastoNombre: e.target.value})}
                  style={inputStyle} />
              </div>
              {/* % Maleza */}
              <div style={{ flex: "1 1 100px" }}>
                <label style={labelStyle}>% Maleza</label>
                <input type="number" min="1" max="100" placeholder="Ej: 20"
                  value={datosForm.porcentajePasto} onChange={e => setDatosForm({...datosForm, porcentajePasto: e.target.value})}
                  style={inputStyle} />
              </div>
              {/* Tamaño con ejemplos */}
              <div style={{ flex: "1 1 200px" }}>
                <label style={labelStyle}>Tamaño del Pasto</label>
                <select value={datosForm.tipoPastoTamano}
                  onChange={e => setDatosForm({...datosForm, tipoPastoTamano: e.target.value})}
                  style={inputStyle}>
                  <option value="">-- Seleccionar --</option>
                  <option value="Corto">Corto (bermudas, pangola)</option>
                  <option value="Mediano">Mediano (estrella, brizanta)</option>
                  <option value="Alto">Alto (mombasa, Tanzania)</option>
                  <option value="Corte">Corte (Taiwán, maíz, caña de azúcar)</option>
                </select>
              </div>
            </div>

            {/* Divisiones Internas */}
            <div style={{ marginBottom: "15px" }}>
              <label style={labelStyle}>Divisiones Internas</label>
              <div style={{ display: "flex", gap: "8px", marginBottom: "8px" }}>
                <input
                  type="text"
                  placeholder="Ej: Norte, Bloque A, Sector 1..."
                  value={nuevaDivision}
                  onChange={e => setNuevaDivision(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") { e.preventDefault(); agregarDivision(); } }}
                  style={{ ...inputStyle, flex: 1 }}
                />
                <button type="button" onClick={agregarDivision}
                  style={{ padding: "8px 14px", backgroundColor: "#3b82f6", color: "white", border: "none", borderRadius: "4px", cursor: "pointer", fontWeight: "600", whiteSpace: "nowrap" }}>
                  + Agregar
                </button>
              </div>
              {datosForm.divisiones.length > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: "6px" }}>
                  {datosForm.divisiones.map((div, i) => (
                    <span key={i} style={{ backgroundColor: "#dbeafe", color: "#1e40af", padding: "4px 10px", borderRadius: "20px", fontSize: "12px", display: "flex", alignItems: "center", gap: "5px" }}>
                      {div}
                      <button type="button" onClick={() => quitarDivision(i)}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "#1e40af", padding: 0, lineHeight: 1, fontSize: "14px" }}>×</button>
                    </span>
                  ))}
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: "10px" }}>
              <button type="submit" className="btn-primary" style={{ margin: 0 }}>Guardar Potrero</button>
              <button type="button" className="btn-outline" style={{ margin: 0 }} onClick={cerrarFormPotrero}>Cancelar</button>
            </div>
          </form>
        )}

        {/* Tabla */}
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "13px", textAlign: "left" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #e5e7eb", color: "#6b7280", backgroundColor: "#f9fafb" }}>
                <th style={{ padding: "10px 8px" }}>Potrero</th>
                <th style={{ padding: "10px 8px" }}>Hectáreas</th>
                <th style={{ padding: "10px 8px" }}>Pasto</th>
                <th style={{ padding: "10px 8px" }}>% Maleza</th>
                <th style={{ padding: "10px 8px" }}>Tamaño</th>
                <th style={{ padding: "10px 8px" }}>Divisiones</th>
                <th style={{ padding: "10px 8px", textAlign: "center" }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {potreros.length === 0 ? (
                <tr><td colSpan="7" style={{ padding: "20px", textAlign: "center", color: "#9ca3af" }}>No hay potreros registrados.</td></tr>
              ) : (
                potreros.map(pot => (
                  <tr key={pot.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                    <td style={{ padding: "10px 8px", fontWeight: "600", color: "#111827" }}>{pot.nombre}</td>
                    <td style={{ padding: "10px 8px", color: "#4b5563" }}>{pot.hectareas} ha</td>
                    <td style={{ padding: "10px 8px", color: "#4b5563" }}>{pot.tipoPastoNombre || "-"}</td>
                    <td style={{ padding: "10px 8px", color: "#4b5563" }}>{pot.porcentajePasto ? `${pot.porcentajePasto}%` : "-"}</td>
                    <td style={{ padding: "10px 8px", color: "#4b5563" }}>{pot.tipoPastoTamano || "-"}</td>
                    <td style={{ padding: "10px 8px", color: "#4b5563" }}>
                      {pot.divisiones?.length > 0
                        ? <span title={pot.divisiones.join(", ")}>{pot.divisiones.length} div. ({pot.divisiones.slice(0,2).join(", ")}{pot.divisiones.length > 2 ? "..." : ""})</span>
                        : "-"}
                    </td>
                    <td style={{ padding: "10px 8px", textAlign: "center" }}>
                      <div style={{ display: "flex", justifyContent: "center", gap: "6px" }}>
                        <button onClick={() => abrirModalTratamiento(pot)}
                          title="Cargar Tratamiento"
                          style={{ background: "#dcfce7", border: "1px solid #86efac", borderRadius: "6px", cursor: "pointer", color: "#166534", padding: "4px 8px", fontSize: "11px", fontWeight: "600", display: "flex", alignItems: "center", gap: "3px" }}>
                          💊 Trat.
                        </button>
                        <button onClick={() => abrirHistorial(pot)}
                          title="Ver historial"
                          style={{ background: "none", border: "none", cursor: "pointer", color: "#6b7280" }}>
                          <ClipboardList size={16} />
                        </button>
                        <button onClick={() => editarPotrero(pot)}
                          style={{ background: "none", border: "none", cursor: "pointer", color: "#3b82f6" }} title="Editar">
                          <Edit2 size={16} />
                        </button>
                        <button onClick={() => borrarPotrero(pot.id)}
                          style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444" }} title="Eliminar">
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ══ GRUPOS DE MANEJO ══════════════════════════════════════════════════ */}
      <div className="card" style={{ padding: "20px", marginBottom: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <div>
            <h2 style={{ margin: 0, fontSize: "18px" }}>Grupos de Manejo</h2>
            <div style={{ fontSize: "13px", color: "var(--gris-400)", marginTop: "4px" }}>
              Categoriza el ganado para aplicar tratamientos masivos rápido.
            </div>
          </div>
          {!formGrupoActivo && (
            <button className="btn-primary" style={{ width: "auto", padding: "8px 16px" }} onClick={() => { setFormGrupoActivo(true); setEditandoGrupoId(null); setDatosFormGrupo({ nombre: "" }); }}>
              <Plus size={18} /> Nuevo Grupo
            </button>
          )}
        </div>

        {formGrupoActivo && (
          <form onSubmit={guardarGrupo} style={{ backgroundColor: "#f9fafb", padding: "15px", borderRadius: "8px", border: "1px solid #e5e7eb", marginBottom: "20px" }}>
            <h3 style={{ fontSize: "15px", marginTop: 0, marginBottom: "15px", color: "#374151" }}>
              {editandoGrupoId ? "Editar Grupo" : "Crear Nuevo Grupo"}
            </h3>
            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "15px" }}>
              <div style={{ flex: "1 1 200px" }}>
                <label style={labelStyle}>Nombre del Grupo / Lote</label>
                <input type="text" placeholder="Ej: Crías Lactantes, Vacas Secas..."
                  value={datosFormGrupo.nombre} onChange={e => setDatosFormGrupo({ nombre: e.target.value })}
                  required style={inputStyle} />
              </div>
            </div>
            <div style={{ display: "flex", gap: "10px" }}>
              <button type="submit" className="btn-primary" style={{ margin: 0 }}>Guardar Grupo</button>
              <button type="button" className="btn-outline" style={{ margin: 0 }} onClick={() => { setFormGrupoActivo(false); setEditandoGrupoId(null); }}>Cancelar</button>
            </div>
          </form>
        )}

        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px", textAlign: "left" }}>
            <thead>
              <tr style={{ borderBottom: "2px solid #e5e7eb", color: "#6b7280" }}>
                <th style={{ padding: "12px 8px" }}>Nombre del Grupo</th>
                <th style={{ padding: "12px 8px", width: "100px", textAlign: "center" }}>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {grupos.length === 0 ? (
                <tr><td colSpan="2" style={{ padding: "20px", textAlign: "center", color: "#9ca3af" }}>No hay grupos registrados.</td></tr>
              ) : (
                grupos.map(g => (
                  <tr key={g.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                    <td style={{ padding: "12px 8px", fontWeight: "500", color: "#111827" }}>{g.nombre}</td>
                    <td style={{ padding: "12px 8px", textAlign: "center", display: "flex", justifyContent: "center", gap: "8px" }}>
                      <button onClick={() => editarGrupo(g)} style={{ background: "none", border: "none", cursor: "pointer", color: "#3b82f6" }} title="Editar"><Edit2 size={18} /></button>
                      <button onClick={() => borrarGrupo(g.id)} style={{ background: "none", border: "none", cursor: "pointer", color: "#ef4444" }} title="Eliminar"><Trash2 size={18} /></button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Nota */}
      <div className="card" style={{ padding: "20px", backgroundColor: "#fefce8", border: "1px solid #fef08a" }}>
        <h3 style={{ margin: "0 0 10px 0", color: "#854d0e", display: "flex", alignItems: "center", gap: "6px" }}>
          <ShieldAlert size={20} /> Nota sobre Asignaciones
        </h3>
        <p style={{ margin: 0, fontSize: "13px", color: "#713f12", lineHeight: "1.5" }}>
          Al borrar un Potrero, los animales que estaban asignados figurarán como "Sin Asignar". Los tratamientos registrados en el potrero se conservan en el historial.
        </p>
      </div>

      {/* ══ MODAL TRATAMIENTO POTRERO ══════════════════════════════════════════ */}
      {modalTratamiento && potreroActivo && (
        <div className="modal-overlay" onClick={() => setModalTratamiento(false)}>
          <div className="modal-content" style={{ maxWidth: "480px" }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2 style={{ margin: 0, fontSize: "18px", color: "#111827" }}>💊 Cargar Tratamiento</h2>
                <p style={{ margin: "4px 0 0", color: "#6b7280", fontSize: "13px" }}>Potrero: <strong>{potreroActivo.nombre}</strong></p>
              </div>
              <button onClick={() => setModalTratamiento(false)} style={{ background: "none", border: "none", cursor: "pointer" }}>
                <X size={22} color="#9ca3af" />
              </button>
            </div>

            {exitoTrat && (
              <div className="file-status status-success" style={{ marginBottom: "14px" }}><span>{exitoTrat}</span></div>
            )}

            <form onSubmit={guardarTratamientoPotrero}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "14px" }}>
                <div>
                  <label style={labelStyle}>Tipo de Actividad</label>
                  <select value={datosTratamiento.tipo}
                    onChange={e => setDatosTratamiento({ ...datosTratamiento, tipo: e.target.value, resultado: "" })}
                    style={{ ...inputStyle, padding: "10px 12px" }}>
                    {TIPOS_EVENTO.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Fecha</label>
                  <input type="date" value={datosTratamiento.fecha}
                    onChange={e => setDatosTratamiento({ ...datosTratamiento, fecha: e.target.value })}
                    style={{ ...inputStyle, padding: "10px 12px" }} required />
                </div>
              </div>

              {CATALOGO_EVENTOS[datosTratamiento.tipo]?.length > 0 ? (
                <div style={{ marginBottom: "14px" }}>
                  <label style={labelStyle}>Insumo / Tipo Específico</label>
                  <select value={datosTratamiento.resultado}
                    onChange={e => setDatosTratamiento({ ...datosTratamiento, resultado: e.target.value })}
                    style={{ ...inputStyle, padding: "10px 12px", border: "1px solid #3b82f6", backgroundColor: "#eff6ff" }} required>
                    <option value="">-- Selecciona --</option>
                    {CATALOGO_EVENTOS[datosTratamiento.tipo].map(s => <option key={s} value={s}>{s}</option>)}
                  </select>
                </div>
              ) : (
                <div style={{ marginBottom: "14px" }}>
                  <label style={labelStyle}>Detalle / Resultado</label>
                  <input type="text" placeholder="Ej: Observación, producto usado..."
                    value={datosTratamiento.resultado}
                    onChange={e => setDatosTratamiento({ ...datosTratamiento, resultado: e.target.value })}
                    style={{ ...inputStyle, padding: "10px 12px" }} required />
                </div>
              )}

              <div style={{ marginBottom: "18px" }}>
                <label style={labelStyle}>Costo ($)</label>
                <input type="number" step="0.5" placeholder="$0.00"
                  value={datosTratamiento.costo}
                  onChange={e => setDatosTratamiento({ ...datosTratamiento, costo: e.target.value })}
                  style={{ ...inputStyle, padding: "10px 12px" }} />
              </div>

              <button type="submit" className="btn-primary" style={{ width: "100%", marginTop: 0 }} disabled={guardandoTrat}>
                {guardandoTrat ? "Guardando..." : "Registrar Tratamiento"}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* ══ MODAL HISTORIAL POTRERO ════════════════════════════════════════════ */}
      {modalHistorial && potreroActivo && (
        <div className="modal-overlay" onClick={() => setModalHistorial(false)}>
          <div className="modal-content" style={{ maxWidth: "520px" }} onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div>
                <h2 style={{ margin: 0, fontSize: "18px" }}>Historial: {potreroActivo.nombre}</h2>
                <p style={{ margin: "4px 0 0", color: "#6b7280", fontSize: "13px" }}>Tratamientos y actividades registradas</p>
              </div>
              <button onClick={() => setModalHistorial(false)} style={{ background: "none", border: "none", cursor: "pointer" }}>
                <X size={22} color="#9ca3af" />
              </button>
            </div>

            {cargandoHistorial ? (
              <p style={{ textAlign: "center", color: "#9ca3af" }}>Cargando...</p>
            ) : historialPotrero.length === 0 ? (
              <p style={{ textAlign: "center", color: "#9ca3af", padding: "20px 0" }}>No hay tratamientos registrados para este potrero.</p>
            ) : (
              <div style={{ maxHeight: "380px", overflowY: "auto" }}>
                {historialPotrero.map(ev => (
                  <div key={ev.id} style={{ padding: "10px 0", borderBottom: "1px solid #f3f4f6", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                    <div>
                      <span style={{ fontWeight: "600", color: "#111827", fontSize: "14px" }}>{ev.tipo}</span>
                      {ev.resultado && <span style={{ color: "#6b7280", fontSize: "13px" }}> — {ev.resultado}</span>}
                      {ev.costo > 0 && <span style={{ color: "#ef4444", fontSize: "12px", marginLeft: "8px" }}>(${ev.costo})</span>}
                    </div>
                    <span style={{ color: "#9ca3af", fontSize: "12px", whiteSpace: "nowrap", marginLeft: "12px" }}>{ev.fecha}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
