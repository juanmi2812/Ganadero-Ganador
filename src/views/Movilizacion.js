import React, { useState, useEffect } from "react";
import { collection, query, where, onSnapshot, addDoc, updateDoc, doc } from "firebase/firestore";
import { db } from "../firebase";
import { Truck, MapPin, Calendar, FileText, CheckCircle, ShieldCheck } from "lucide-react";
import jsPDF from "jspdf";
import "jspdf-autotable";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function Movilizacion({ usuario }) {
  const [animales, setAnimales] = useState([]);
  const [uppsLocales, setUppsLocales] = useState([]);
  const [cargando, setCargando] = useState(true);

  // Formulario
  const [tipoMovimiento, setTipoMovimiento] = useState("Venta");
  const [origenUPP, setOrigenUPP] = useState("");
  const [destinoUPP, setDestinoUPP] = useState("");
  const [destinoNombre, setDestinoNombre] = useState("");
  const [chofer, setChofer] = useState("");
  const [placas, setPlacas] = useState("");
  const [ruta, setRuta] = useState("");
  const [ganadera, setGanadera] = useState("");
  const [fechaCita, setFechaCita] = useState("");
  const [horaCita, setHoraCita] = useState("");

  const [filtroCategoria, setFiltroCategoria] = useState("Todos");
  const [filtroPotrero, setFiltroPotrero] = useState("Todos");
  const [filtroBusqueda, setFiltroBusqueda] = useState("");

  const [seleccionados, setSeleccionados] = useState([]);
  const [guardando, setGuardando] = useState(false);
  const [exito, setExito] = useState("");

  useEffect(() => {
    if (!usuario?.ranchoId) return;
    setCargando(true);

    // Cargar Animales (solo los activos)
    const unsubAnimales = onSnapshot(query(collection(db, "animales"), where("ranchoId", "==", usuario.ranchoId)), (snap) => {
      const data = snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(a => !a.estado?.includes('Baja'));
      setAnimales(data);
    });

    // Cargar UPPs de configuración (rancho)
    const unsubConfig = onSnapshot(doc(db, "ranchos", usuario.ranchoId), (snap) => {
      if (snap.exists() && snap.data().upps) {
        setUppsLocales(snap.data().upps);
        if (snap.data().upps.length > 0) setOrigenUPP(snap.data().upps[0]);
      }
    });

    setCargando(false);
    return () => { unsubAnimales(); unsubConfig(); };
  }, [usuario]);

  const toggleSeleccion = (id) => {
    if (seleccionados.includes(id)) {
      setSeleccionados(seleccionados.filter(sid => sid !== id));
    } else {
      setSeleccionados([...seleccionados, id]);
    }
  };

  const animalesFiltrados = animales.filter(a => {
    if (filtroCategoria !== "Todos" && a.tipo !== filtroCategoria) return false;
    if (filtroPotrero !== "Todos" && a.potrero !== filtroPotrero) return false;
    if (filtroBusqueda && !a.arete?.toLowerCase().includes(filtroBusqueda.toLowerCase())) return false;
    return true;
  });

  const seleccionarTodos = () => {
    const idsFiltrados = animalesFiltrados.map(a => a.id);
    if (idsFiltrados.length === 0) return;
    const todosSeleccionados = idsFiltrados.every(id => seleccionados.includes(id));
    
    if (todosSeleccionados) {
      setSeleccionados(seleccionados.filter(id => !idsFiltrados.includes(id)));
    } else {
      const nuevosSeleccionados = new Set([...seleccionados, ...idsFiltrados]);
      setSeleccionados(Array.from(nuevosSeleccionados));
    }
  };

  const generarPDFYGuardar = async (e) => {
    e.preventDefault();
    if (seleccionados.length === 0) {
      alert("Debes seleccionar al menos un animal para movilizar.");
      return;
    }

    setGuardando(true);
    setExito("");
    try {
      // 1. Guardar eventos
      const promesasEventos = seleccionados.map(async (id) => {
        const animal = animales.find(a => a.id === id);
        if (!animal) return;

        const tipoEvento = tipoMovimiento === "Venta" ? "Venta" : "Traslado";
        const resMov = `Destino: ${destinoNombre} (UPP: ${destinoUPP}) | Ganadera: ${ganadera}`;
        
        await addDoc(collection(db, "eventos"), {
          animalId: animal.id,
          tipo: tipoEvento,
          resultado: resMov,
          fecha: new Date().toISOString().split('T')[0],
          costo: 0,
          origen: "realizado",
          ranchoId: usuario?.ranchoId
        });

        // 2. Actualizar estado del animal si es venta
        if (tipoMovimiento === "Venta") {
          await updateDoc(doc(db, "animales", animal.id), {
            estado: "Baja - Venta"
          });
        }
      });

      await Promise.all(promesasEventos);

      // 3. Generar PDF
      const docPdf = new jsPDF();
      docPdf.setFontSize(22);
      docPdf.setTextColor(22, 101, 52); // verde
      docPdf.text("Guía de Tránsito y Movilización", 14, 20);

      docPdf.setFontSize(12);
      docPdf.setTextColor(100);
      docPdf.text(`Fecha de Emisión: ${format(new Date(), "dd/MM/yyyy HH:mm")}`, 14, 28);
      docPdf.text(`Tipo de Movimiento: ${tipoMovimiento.toUpperCase()}`, 14, 34);

      docPdf.setDrawColor(200);
      docPdf.line(14, 38, 196, 38);

      docPdf.setFontSize(14);
      docPdf.setTextColor(0);
      docPdf.text("Origen y Destino", 14, 46);
      docPdf.setFontSize(11);
      docPdf.setTextColor(80);
      docPdf.text(`UPP Origen: ${origenUPP || "N/A"}`, 14, 52);
      docPdf.text(`UPP Destino: ${destinoUPP}`, 14, 58);
      docPdf.text(`Nombre Destino: ${destinoNombre}`, 14, 64);

      docPdf.setFontSize(14);
      docPdf.setTextColor(0);
      docPdf.text("Logística de Transporte", 110, 46);
      docPdf.setFontSize(11);
      docPdf.setTextColor(80);
      docPdf.text(`Chofer: ${chofer}`, 110, 52);
      docPdf.text(`Placas: ${placas}`, 110, 58);
      docPdf.text(`Ruta: ${ruta}`, 110, 64);

      docPdf.line(14, 70, 196, 70);

      docPdf.setFontSize(14);
      docPdf.setTextColor(0);
      docPdf.text("Cita Asociación Ganadera (Validación)", 14, 78);
      docPdf.setFontSize(11);
      docPdf.setTextColor(80);
      docPdf.text(`Asociación: ${ganadera}`, 14, 84);
      docPdf.text(`Fecha y Hora: ${fechaCita} a las ${horaCita}`, 14, 90);

      const animalesTabla = seleccionados.map(id => {
        const a = animales.find(x => x.id === id);
        return [
          a?.arete || "N/A",
          a?.tipo || "N/A",
          a?.raza || "N/A",
          a?.sexo || "N/A",
          a?.pesoActual ? `${a.pesoActual} kg` : "N/A"
        ];
      });

      docPdf.autoTable({
        startY: 100,
        head: [['Arete SINIIGA', 'Categoría', 'Raza', 'Sexo', 'Peso Est.']],
        body: animalesTabla,
        styles: { fontSize: 10, cellPadding: 3 },
        headStyles: { fillColor: [22, 101, 52], textColor: 255 }
      });

      const pageCount = docPdf.internal.getNumberOfPages();
      for (let i = 1; i <= pageCount; i++) {
        docPdf.setPage(i);
        docPdf.setFontSize(8);
        docPdf.setTextColor(150);
        docPdf.text(
          `Ganadero Ganador — Módulo de Movilización Prototipo B2B`,
          docPdf.internal.pageSize.width / 2,
          docPdf.internal.pageSize.height - 10,
          { align: 'center' }
        );
      }

      docPdf.save(`Movilizacion_${fechaCita}_${ganadera}.pdf`);
      
      setExito("Movilización registrada correctamente y guía descargada.");
      
      // Limpiar Formulario si es traslado
      if (tipoMovimiento === "Traslado") {
        setSeleccionados([]);
      }
      
    } catch (err) {
      console.error(err);
      alert("Hubo un error al generar la guía.");
    }
    setGuardando(false);
  };

  if (cargando) return <p style={{ padding: "20px" }}>Cargando módulo de movilización...</p>;

  return (
    <div className="dashboard-container" style={{ padding: "20px", paddingBottom: "100px", maxWidth: "1200px", margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "30px" }}>
        <div style={{ padding: "0" }}>
          <img src={require("../assets/logo_movilizacion.jpg")} alt="Movilización" style={{ width: "64px", height: "64px", objectFit: "contain", borderRadius: "12px", border: "1px solid #e5e7eb", backgroundColor: "white" }} />
        </div>
        <div>
          <h1 style={{ margin: 0, fontSize: "24px", color: "#111827" }}>Tránsito y Movilización</h1>
          <p style={{ margin: 0, color: "#6b7280", fontSize: "14px" }}>Genera guías de tránsito y agenda citas con Asociaciones Ganaderas (Demo B2B).</p>
        </div>
      </div>

      {exito && (
        <div style={{ backgroundColor: "#dcfce7", color: "#166534", padding: "12px 16px", borderRadius: "8px", marginBottom: "20px", display: "flex", alignItems: "center", gap: "8px" }}>
          <CheckCircle size={20} /> <strong>Éxito:</strong> {exito}
        </div>
      )}

      <form onSubmit={generarPDFYGuardar}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "24px", marginBottom: "24px" }}>
          
          {/* Tarjeta 1: Origen y Destino */}
          <div className="card" style={{ padding: "20px", backgroundColor: "white", borderRadius: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", border: "1px solid #e5e7eb" }}>
            <h3 style={{ margin: "0 0 16px 0", fontSize: "16px", color: "#374151", display: "flex", alignItems: "center", gap: "8px" }}>
              <MapPin size={18} color="#3b82f6" /> Origen y Destino
            </h3>
            
            <div className="input-group">
              <label>Tipo de Movimiento</label>
              <select value={tipoMovimiento} onChange={(e) => setTipoMovimiento(e.target.value)} required style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #d1d5db" }}>
                <option value="Venta">Venta (Da de baja el ganado)</option>
                <option value="Traslado">Traslado (Mantener en inventario)</option>
              </select>
            </div>

            <div className="input-group" style={{ marginTop: "12px" }}>
              <label>UPP de Origen (Mi Rancho)</label>
              <select value={origenUPP} onChange={(e) => setOrigenUPP(e.target.value)} required style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #d1d5db" }}>
                <option value="">-- Selecciona UPP --</option>
                {uppsLocales.map((u, i) => <option key={i} value={u}>{u}</option>)}
              </select>
            </div>

            <div className="input-group" style={{ marginTop: "12px" }}>
              <label>UPP de Destino</label>
              <input type="text" placeholder="Ej. 30 189 1234 567" value={destinoUPP} onChange={(e) => setDestinoUPP(e.target.value)} required style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #d1d5db" }} />
            </div>

            <div className="input-group" style={{ marginTop: "12px" }}>
              <label>Nombre del Destino</label>
              <input type="text" placeholder="Ej. Rancho San José" value={destinoNombre} onChange={(e) => setDestinoNombre(e.target.value)} required style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #d1d5db" }} />
            </div>
          </div>

          {/* Tarjeta 2: Logística y Cita */}
          <div className="card" style={{ padding: "20px", backgroundColor: "white", borderRadius: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", border: "1px solid #e5e7eb" }}>
            <h3 style={{ margin: "0 0 16px 0", fontSize: "16px", color: "#374151", display: "flex", alignItems: "center", gap: "8px" }}>
              <ShieldCheck size={18} color="#8b5cf6" /> Logística y Cita Ganadera
            </h3>
            
            <div style={{ display: "flex", gap: "12px", marginTop: "12px" }}>
              <div className="input-group" style={{ flex: 1, margin: 0 }}>
                <label>Chofer (Transportista)</label>
                <input type="text" value={chofer} onChange={(e) => setChofer(e.target.value)} required style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #d1d5db" }} />
              </div>
              <div className="input-group" style={{ flex: 1, margin: 0 }}>
                <label>Placas</label>
                <input type="text" value={placas} onChange={(e) => setPlacas(e.target.value)} required style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #d1d5db" }} />
              </div>
            </div>

            <div className="input-group" style={{ marginTop: "12px" }}>
              <label>Ruta (Vía Principal)</label>
              <input type="text" placeholder="Ej. Carretera Nacional Tuxpan-Tampico" value={ruta} onChange={(e) => setRuta(e.target.value)} required style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #d1d5db" }} />
            </div>

            <div style={{ borderTop: "1px dashed #d1d5db", margin: "16px 0" }}></div>

            <div className="input-group" style={{ marginTop: "12px" }}>
              <label>Agendar Cita en Ganadera (Validación)</label>
              <select value={ganadera} onChange={(e) => setGanadera(e.target.value)} required style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #d1d5db", backgroundColor: "#fdf4ff", color: "#86198f", fontWeight: "bold" }}>
                <option value="">-- Selecciona Asociación Ganadera --</option>
                <option value="Ganadera Tuxpan">Ganadera Tuxpan</option>
                <option value="Ganadera Álamo">Ganadera Álamo</option>
              </select>
            </div>

            <div style={{ display: "flex", gap: "12px", marginTop: "12px" }}>
              <div className="input-group" style={{ flex: 1, margin: 0 }}>
                <label>Fecha de Cita</label>
                <input type="date" value={fechaCita} onChange={(e) => setFechaCita(e.target.value)} required style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #d1d5db" }} />
              </div>
              <div className="input-group" style={{ flex: 1, margin: 0 }}>
                <label>Hora de Cita</label>
                <input type="time" value={horaCita} onChange={(e) => setHoraCita(e.target.value)} required style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #d1d5db" }} />
              </div>
            </div>
            
          </div>
        </div>

        {/* Tarjeta 3: Ganado a Movilizar */}
        <div className="card" style={{ padding: "20px", backgroundColor: "white", borderRadius: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)", border: "1px solid #e5e7eb", marginBottom: "24px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "10px" }}>
              <h3 style={{ margin: 0, fontSize: "16px", color: "#374151", display: "flex", alignItems: "center", gap: "8px" }}>
                <FileText size={18} color="#f59e0b" /> Animales Seleccionados ({seleccionados.length})
              </h3>
              <button type="button" onClick={seleccionarTodos} style={{ padding: "6px 12px", backgroundColor: "#f3f4f6", border: "1px solid #d1d5db", borderRadius: "6px", fontSize: "12px", cursor: "pointer", fontWeight: "500" }}>
                Seleccionar Visibles
              </button>
            </div>

            <div style={{ display: "flex", gap: "10px", marginBottom: "16px", flexWrap: "wrap" }}>
              <input type="text" placeholder="Buscar por arete..." value={filtroBusqueda} onChange={(e) => setFiltroBusqueda(e.target.value)} style={{ flex: 1, minWidth: "150px", padding: "8px", border: "1px solid #d1d5db", borderRadius: "6px" }} />
              <select value={filtroCategoria} onChange={(e) => setFiltroCategoria(e.target.value)} style={{ padding: "8px", border: "1px solid #d1d5db", borderRadius: "6px", backgroundColor: "white", minWidth: "120px" }}>
                <option value="Todos">Categorías (Todas)</option>
                <option value="Vaca">Vacas</option>
                <option value="Novillona">Novillonas</option>
                <option value="Becerra">Becerras</option>
                <option value="Semental">Sementales</option>
                <option value="Torete">Toretes</option>
                <option value="Becerro">Becerros</option>
              </select>
              <select value={filtroPotrero} onChange={(e) => setFiltroPotrero(e.target.value)} style={{ padding: "8px", border: "1px solid #d1d5db", borderRadius: "6px", backgroundColor: "white", minWidth: "120px" }}>
                <option value="Todos">Potreros (Todos)</option>
                {Array.from(new Set(animales.map(a => a.potrero).filter(Boolean))).map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>

            <div style={{ maxHeight: "300px", overflowY: "auto", border: "1px solid #e5e7eb", borderRadius: "8px" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px", textAlign: "left" }}>
              <thead style={{ backgroundColor: "#f9fafb", position: "sticky", top: 0, zIndex: 1, borderBottom: "1px solid #e5e7eb" }}>
                <tr>
                  <th style={{ padding: "10px" }}>Sel.</th>
                  <th style={{ padding: "10px" }}>Arete</th>
                  <th style={{ padding: "10px" }}>Categoría</th>
                  <th style={{ padding: "10px" }}>Raza</th>
                  <th style={{ padding: "10px" }}>Potrero</th>
                </tr>
              </thead>
                <tbody>
                  {animalesFiltrados.length === 0 ? (
                    <tr><td colSpan="5" style={{ padding: "16px", textAlign: "center", color: "#6b7280" }}>No hay animales que coincidan con la búsqueda.</td></tr>
                  ) : (
                    animalesFiltrados.map(a => (
                    <tr key={a.id} style={{ borderBottom: "1px solid #f3f4f6", backgroundColor: seleccionados.includes(a.id) ? "#f0fdf4" : "white" }} onClick={() => toggleSeleccion(a.id)}>
                      <td style={{ padding: "10px" }}>
                        <input type="checkbox" checked={seleccionados.includes(a.id)} readOnly style={{ width: "16px", height: "16px", cursor: "pointer" }} />
                      </td>
                      <td style={{ padding: "10px", fontWeight: "bold" }}>{a.arete}</td>
                      <td style={{ padding: "10px" }}>{a.tipo}</td>
                      <td style={{ padding: "10px" }}>{a.raza}</td>
                      <td style={{ padding: "10px" }}>{a.potrero || "N/A"}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <button type="submit" disabled={guardando || seleccionados.length === 0} className="btn-primary" style={{ width: "100%", padding: "16px", fontSize: "16px", display: "flex", justifyContent: "center", alignItems: "center", gap: "10px", backgroundColor: "#166534" }}>
          {guardando ? "Generando y Guardando..." : "Generar Guía y Agendar Cita"}
        </button>

      </form>
    </div>
  );
}
