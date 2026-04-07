import React, { useState, useEffect } from "react";
import { Search, X, Plus, Activity, Baby, Scale, AlertTriangle, TrendingUp } from "lucide-react";
import { collection, onSnapshot, addDoc, query, where, doc, updateDoc, getDocs } from "firebase/firestore"; 
import { differenceInMonths } from "date-fns";
import { db } from "../firebase";
import Header from "../components/Header";

export default function DashboardGanado() {
  // --- ESTADOS ---
  const [inventario, setInventario] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [filtroActivo, setFiltroActivo] = useState("Todos");
  
  const [animalActivo, setAnimalActivo] = useState(null);
  const [historialEventos, setHistorialEventos] = useState([]);
  const [mostrandoFormulario, setMostrandoFormulario] = useState(false);
  const [mostrandoBaja, setMostrandoBaja] = useState(false);
  
  const [datosEvento, setDatosEvento] = useState({ 
    tipo: "Repeso", resultado: "", fecha: new Date().toISOString().split('T')[0], recordatorio: "1 semana antes"
  });
  const [datosBaja, setDatosBaja] = useState({ 
    motivo: "Venta", notas: "", fecha: new Date().toISOString().split('T')[0] 
  });
  const [sincronizado, setSincronizado] = useState(false);

  // --- EFECTOS AUTOMÁTICOS (OPCIÓN A) ---
  useEffect(() => {
    if (inventario.length > 0 && !sincronizado) {
      setSincronizado(true);
      
      const sincronizarCategorias = async () => {
        try {
          const qPartos = query(collection(db, "eventos"), where("tipo", "==", "Parto"));
          const partosSnap = await getDocs(qPartos);
          const hembrasConParto = new Set();
          partosSnap.forEach(d => hembrasConParto.add(d.data().animalId));

          const qAlertas = query(collection(db, "alertas"), where("titulo", "==", "Revisión de Fertilidad"));
          const alertasSnap = await getDocs(qAlertas);
          const animalesConAlerta = new Set();
          alertasSnap.forEach(d => animalesConAlerta.add(d.data().animalId));

          const hoy = new Date();
          
          for (const animal of inventario) {
            if (animal.estado?.includes('Baja')) continue;
            if (!animal.fechaNacimiento) continue;

            const fechaNac = new Date(animal.fechaNacimiento + "T00:00:00");
            if (isNaN(fechaNac.getTime())) continue;

            const mesesDeEdad = differenceInMonths(hoy, fechaNac);
            const sexo = animal.sexo ? animal.sexo.toLowerCase() : "";
            let nuevaCategoria = animal.tipo;
            let nuevoEstado = animal.estado || "Sano";

            if (mesesDeEdad < 2) {
              nuevaCategoria = "Lactante";
            } else if (mesesDeEdad >= 2 && mesesDeEdad < 12) {
              nuevaCategoria = sexo === "hembra" ? "Becerra" : "Becerro";
              if (!sexo) nuevaCategoria = "Becerro/a";
            } else if (sexo === "hembra") {
              const haParido = hembrasConParto.has(animal.id);
              if (haParido || mesesDeEdad >= 48) {
                nuevaCategoria = "Vaca";
                if (!haParido && mesesDeEdad >= 48) {
                  if (!nuevoEstado.includes('Baja') && nuevoEstado !== "Alerta: Revisión de Fertilidad") {
                    nuevoEstado = "Alerta: Revisión de Fertilidad";
                  }
                  if (!animalesConAlerta.has(animal.id)) {
                    await addDoc(collection(db, "alertas"), {
                      animalId: animal.id,
                      areteAnimal: animal.arete,
                      titulo: "Revisión de Fertilidad",
                      fechaProgramada: hoy.toISOString().split('T')[0],
                      completada: false
                    });
                  }
                }
              } else if (mesesDeEdad >= 12 && mesesDeEdad < 48 && !haParido) {
                nuevaCategoria = "Novillona";
              }
            } else if (sexo === "macho") {
              if (mesesDeEdad >= 12 && animal.tipo !== "Semental") {
                nuevaCategoria = "Torete";
                if (!nuevoEstado.includes('Baja') && nuevoEstado !== "Disponible para Venta") {
                   nuevoEstado = "Disponible para Venta"; 
                }
              }
            }

            if (nuevaCategoria !== animal.tipo || nuevoEstado !== animal.estado) {
              await updateDoc(doc(db, "animales", animal.id), { tipo: nuevaCategoria, estado: nuevoEstado });
            }
          }
        } catch (error) {
          console.error("Error al sincronizar categorías:", error);
        }
      };

      sincronizarCategorias();
    }
  }, [inventario, sincronizado]);

  // --- EFECTOS (FIREBASE) ---
  useEffect(() => {
    const cancelarSuscripcion = onSnapshot(collection(db, "animales"), (snapshot) => {
        const listaAnimales = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setInventario(listaAnimales);
      }
    );
    return () => cancelarSuscripcion();
  }, []);

  useEffect(() => {
    if (!animalActivo) return;
    const q = query(collection(db, "eventos"), where("animalId", "==", animalActivo.id));
    const cancelarEventos = onSnapshot(q, (snapshot) => {
      const eventos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      eventos.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
      setHistorialEventos(eventos);
    });
    return () => cancelarEventos();
  }, [animalActivo]);

  // --- LÓGICA DE NEGOCIO (BI & CALCULOS) ---
  const obtenerEstadisticasPeso = () => {
    if (!animalActivo) return null;

    const pesoInicial = parseFloat(animalActivo.peso?.toString().replace(/[^0-9.]/g, '')) || 0;
    const fechaInicial = new Date(animalActivo.fechaRegistro || animalActivo.fechaNacimiento);

    const repesos = historialEventos
      .filter(ev => ev.tipo === "Repeso")
      .map(ev => ({
        peso: parseFloat(ev.resultado?.toString().replace(/[^0-9.]/g, '')),
        fecha: new Date(ev.fecha)
      }))
      .sort((a, b) => b.fecha - a.fecha);

    if (repesos.length === 0) return { actual: pesoInicial, gananciaTotal: 0, gdp: 0 };

    const pesoActual = repesos[0].peso;
    const fechaActual = repesos[0].fecha;
    const gananciaTotal = pesoActual - pesoInicial;
    const diffTiempo = Math.abs(fechaActual - fechaInicial);
    const dias = Math.ceil(diffTiempo / (1000 * 60 * 60 * 24)) || 1;
    const gdp = gananciaTotal / dias;

    return { actual: pesoActual, gananciaTotal: gananciaTotal.toFixed(2), gdp: gdp.toFixed(3) };
  };

  const stats = obtenerEstadisticasPeso();

  const ganadoFiltrado = inventario.filter((animal) => {
    const cumpleBusqueda = animal.arete?.toLowerCase().includes(busqueda.toLowerCase());
    if (!cumpleBusqueda) return false;

    if (filtroActivo === "Todos") return true;
    if (filtroActivo === "Bajas") return animal.estado?.includes('Baja');
    if (filtroActivo === "En Venta") return animal.estado === "Disponible para Venta";
    
    return animal.tipo === filtroActivo && !animal.estado?.includes('Baja') && animal.estado !== "Disponible para Venta";
  });

  // --- ACCIONES ---
  const guardarEvento = async (e) => {
    e.preventDefault();
    try {
      await addDoc(collection(db, "eventos"), { 
        animalId: animalActivo.id, 
        tipo: datosEvento.tipo, 
        resultado: datosEvento.resultado, 
        fecha: datosEvento.fecha 
      });

      // Actualización directa si el evento nuevo es un Parto (Sube la categoría de inmediato sin esperar refresh)
      if (datosEvento.tipo === "Parto" && animalActivo.tipo !== "Vaca") {
         await updateDoc(doc(db, "animales", animalActivo.id), { tipo: "Vaca" });
      }

      if (datosEvento.recordatorio && datosEvento.recordatorio !== "Ninguno") {
         const eventDate = new Date(datosEvento.fecha + "T00:00:00");
         let reminderDate;
         if (datosEvento.recordatorio === "1 día antes") {
            eventDate.setDate(eventDate.getDate() - 1);
            reminderDate = eventDate.toISOString().split('T')[0];
         } else if (datosEvento.recordatorio === "1 semana antes") {
            eventDate.setDate(eventDate.getDate() - 7);
            reminderDate = eventDate.toISOString().split('T')[0];
         }
         
         if (reminderDate) {
            await addDoc(collection(db, "alertas"), {
               fechaProgramada: reminderDate,
               titulo: `${datosEvento.tipo} de arete ${animalActivo.arete}`,
               areteAnimal: animalActivo.arete,
               completada: false
            });
         }
      }

      setDatosEvento({ tipo: "Repeso", resultado: "", fecha: new Date().toISOString().split('T')[0], recordatorio: "1 semana antes" });
      setMostrandoFormulario(false);
    } catch (error) { console.error(error); }
  };

  const guardarBaja = async (e) => {
    e.preventDefault();
    try {
      const animalRef = doc(db, "animales", animalActivo.id);
      await updateDoc(animalRef, { estado: `Baja - ${datosBaja.motivo}` });
      setMostrandoBaja(false);
      setAnimalActivo(null);
    } catch (error) { console.error(error); }
  };

  const hacerSemental = async () => {
    try {
      const animalRef = doc(db, "animales", animalActivo.id);
      await updateDoc(animalRef, { tipo: "Semental", estado: "Sano" });
      setAnimalActivo({ ...animalActivo, tipo: "Semental", estado: "Sano" });
    } catch (error) { console.error(error); }
  };

  return (
    <div className="dashboard-container" style={{ padding: "0 16px", maxWidth: "1200px", margin: "0 auto" }}>
      
      <Header subtitle="Control de inventario y análisis de rendimiento." />

      {/* FILTROS RÁPIDOS */}
      <div style={{ display: "flex", gap: "8px", marginBottom: "20px", overflowX: "auto", paddingBottom: "8px" }}>
        {["Todos", "Vaca", "Novillona", "Semental", "Torete", "En Venta", "Bajas"].map((tipo) => (
          <button 
            key={tipo} 
            onClick={() => setFiltroActivo(tipo)} 
            style={{ 
              padding: "8px 16px", borderRadius: "20px", border: "1px solid", 
              borderColor: filtroActivo === tipo ? "#3b82f6" : "#d1d5db", 
              backgroundColor: filtroActivo === tipo ? "#eff6ff" : "white", 
              color: filtroActivo === tipo ? "#3b82f6" : "#6b7280", 
              fontWeight: "600", cursor: "pointer", whiteSpace: "nowrap" 
            }}
          >
            {tipo}
          </button>
        ))}
      </div>

      {/* BUSCADOR */}
      <div className="search-bar" style={{ marginBottom: "24px" }}>
        <Search size={20} color="#9ca3af" />
        <input type="text" placeholder="Buscar por número de arete..." value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
      </div>

      {/* GRID DE ANIMALES */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: "16px", paddingBottom: "40px" }}>
        {ganadoFiltrado.map((animal) => (
          <div key={animal.id} style={{ 
            backgroundColor: "white", borderRadius: "12px", padding: "20px", border: "1px solid #e5e7eb", 
            boxShadow: "0 2px 4px rgba(0,0,0,0.05)", opacity: animal.estado?.includes('Baja') ? 0.7 : 1 
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "12px" }}>
              <h3 style={{ margin: 0, fontSize: "20px" }}>{animal.arete}</h3>
              <span className={`status-badge ${animal.estado?.includes('Baja') ? 'status-alerta' : 'status-sano'}`}>{animal.estado || 'Sano'}</span>
            </div>
            <p style={{ margin: "0 0 16px 0", color: "#6b7280", fontSize: "14px" }}>{animal.raza} • {animal.tipo}</p>
            <button className="btn-outline" style={{ width: "100%", justifyContent: "center" }} onClick={() => setAnimalActivo(animal)}>
              Ver Ficha Técnica
            </button>
          </div>
        ))}
      </div>

      {/* MODAL EXPEDIENTE (BI + GENEALOGÍA) */}
      {animalActivo && (
        <div className="modal-overlay" onClick={() => setAnimalActivo(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Arete: {animalActivo.arete}</h2>
              <button onClick={() => setAnimalActivo(null)} style={{ background: "none", border: "none" }}><X size={24} /></button>
            </div>
            
            {/* PANEL DE KPIs DE PESO */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "20px" }}>
              <div style={{ backgroundColor: "#f0fdf4", padding: "12px", borderRadius: "8px", border: "1px solid #bbf7d0" }}>
                <div style={{ color: "#166534", fontSize: "11px", fontWeight: "bold", display: "flex", alignItems: "center", gap: "4px" }}>
                  <TrendingUp size={14} /> GANANCIA TOTAL
                </div>
                <span style={{ fontSize: "18px", fontWeight: "bold", color: "#14532d" }}>{stats?.gananciaTotal > 0 ? `+${stats.gananciaTotal} kg` : "--"}</span>
              </div>
              <div style={{ backgroundColor: "#eff6ff", padding: "12px", borderRadius: "8px", border: "1px solid #bfdbfe" }}>
                <div style={{ color: "#1e40af", fontSize: "11px", fontWeight: "bold", display: "flex", alignItems: "center", gap: "4px" }}>
                  <Activity size={14} /> GDP (PROM. DIARIO)
                </div>
                <span style={{ fontSize: "18px", fontWeight: "bold", color: "#1e3a8a" }}>{stats?.gdp > 0 ? `${stats.gdp} kg/d` : "--"}</span>
              </div>
            </div>

            {/* GENEALOGÍA (HIJOS) */}
            {(animalActivo.tipo === "Vientre" || animalActivo.tipo === "Semental") && (
              <div style={{ marginBottom: "20px" }}>
                <h3 style={{ fontSize: "14px", color: "#374151", marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
                  <Baby size={16} color="#ec4899" /> Crías Vinculadas ({inventario.filter(a => a.madre === animalActivo.arete || a.padre === animalActivo.arete).length})
                </h3>
                <div style={{ display: "flex", gap: "8px", overflowX: "auto" }}>
                  {inventario.filter(a => a.madre === animalActivo.arete || a.padre === animalActivo.arete).map(hijo => (
                    <div key={hijo.id} onClick={() => setAnimalActivo(hijo)} style={{ padding: "6px 12px", backgroundColor: "#fdf2f8", border: "1px solid #fbcfe8", borderRadius: "15px", fontSize: "12px", cursor: "pointer", color: "#be185d" }}>
                      {hijo.arete}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ backgroundColor: "#f3f4f6", padding: "12px", borderRadius: "8px", marginBottom: "16px", fontSize: "13px" }}>
              <strong>Info:</strong> {animalActivo.raza} | <strong>Peso Inicial:</strong> {animalActivo.peso} <br/>
              <strong>Estado Actual:</strong> <span style={{ color: animalActivo.estado?.includes("Alerta") ? "red" : (animalActivo.estado === "Disponible para Venta" ? "orange" : "green") }}>{animalActivo.estado || "Sano"}</span> <br/>
              {animalActivo.madre && <span><strong>Madre:</strong> {animalActivo.madre} | <strong>Padre:</strong> {animalActivo.padre}</span>}
            </div>

            {/* ACCIONES */}
            {!animalActivo.estado?.includes('Baja') && (
              <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
                <button className="btn-primary" style={{ flex: 1, margin: 0 }} onClick={() => setMostrandoFormulario(!mostrandoFormulario)}>+ Evento</button>
                {animalActivo.tipo === "Torete" && (
                  <button className="btn-outline" style={{ flex: 1, margin: 0, borderColor: "#3b82f6", color: "#3b82f6" }} onClick={hacerSemental}>🔥 Hacer Semental</button>
                )}
                <button className="btn-outline" style={{ color: "#ef4444", borderColor: "#ef4444" }} onClick={() => setMostrandoBaja(true)}><AlertTriangle size={18} /></button>
              </div>
            )}

            {/* FORMULARIO EVENTO */}
            {mostrandoFormulario && (
              <form onSubmit={guardarEvento} style={{ padding: "15px", background: "#f9fafb", borderRadius: "8px", marginBottom: "15px" }}>
                <select value={datosEvento.tipo} onChange={(e) => setDatosEvento({...datosEvento, tipo: e.target.value})} style={{ width: "100%", marginBottom: "10px", padding: "8px", border: "1px solid #d1d5db", borderRadius: "4px" }}>
                  <option value="Repeso">Repeso (Actualizar Kilos)</option>
                  <option value="Palpación">Palpación</option>
                  <option value="Vacunación">Vacuna</option>
                  <option value="Parto">Parto</option>
                </select>
                <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
                  <input type="date" value={datosEvento.fecha} onChange={(e) => setDatosEvento({...datosEvento, fecha: e.target.value})} style={{ flex: 1, padding: "8px", border: "1px solid #d1d5db", borderRadius: "4px" }} required />
                  <input type="text" placeholder="Resultado (Ej: 350)" value={datosEvento.resultado} onChange={(e) => setDatosEvento({...datosEvento, resultado: e.target.value})} style={{ flex: 1, padding: "8px", border: "1px solid #d1d5db", borderRadius: "4px" }} required />
                </div>

                <div style={{ marginBottom: "15px" }}>
                  <label style={{ fontSize: "12px", color: "#6b7280", marginBottom: "4px", display: "block", fontWeight: "bold" }}>Recordatorio (Para insumos):</label>
                  <select value={datosEvento.recordatorio} onChange={(e) => setDatosEvento({...datosEvento, recordatorio: e.target.value})} style={{ width: "100%", padding: "8px", border: "1px solid #86efac", borderRadius: "4px", backgroundColor: "#f0fdf4", color: "#166534", fontWeight: "600" }}>
                    <option value="Ninguno">Sin recordatorio</option>
                    <option value="1 día antes">1 día antes</option>
                    <option value="1 semana antes">1 semana antes (Recomendado)</option>
                  </select>
                </div>

                <button type="submit" className="btn-primary" style={{ width: "100%" }}>Guardar Evento</button>
              </form>
            )}

            <h3>Historial de Eventos</h3>
            <div style={{ maxHeight: "150px", overflowY: "auto" }}>
              {historialEventos.map(ev => (
                <div key={ev.id} style={{ padding: "8px", borderBottom: "1px solid #eee", fontSize: "13px", display: "flex", justifyContent: "space-between" }}>
                  <span><strong>{ev.tipo}:</strong> {ev.resultado} {ev.tipo === "Repeso" ? "kg" : ""}</span>
                  <span style={{ color: "#9ca3af" }}>{ev.fecha}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}