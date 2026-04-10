import React, { useState, useEffect } from "react";
import { collection, onSnapshot, doc } from "firebase/firestore";
import { db } from "../firebase";
import { PieChart, Pie, Cell, Tooltip as RTTooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts";
import { AlertCircle, DollarSign, Activity, TrendingUp, Download, FileText, FileSpreadsheet } from "lucide-react";
import Header from "../components/Header";
import { generarPDFVientres, generarExcelVientres, generarPDFReproduccion, generarExcelReproduccion, generarPDFProyeccionPartos, generarExcelProyeccionPartos } from "../reportes";

// Paletas de Colores Dinámicas
const COLORES_INVENTARIO = ["#3b82f6", "#8b5cf6", "#ec4899", "#f43f5e", "#f59e0b", "#10b981"];
const COLORES_FINANZAS = ["#059669", "#111827", "#34d399", "#fbbf24", "#d97706", "#dc2626"];

export default function ReportesBI() {
  const [animales, setAnimales] = useState([]);
  const [eventos, setEventos] = useState([]);
  const [config, setConfig] = useState(null);

  // Slicers
  const [filtroCategoria, setFiltroCategoria] = useState("Todas");
  const [filtroAlerta, setFiltroAlerta] = useState("Todas");
  const [filtroGenero, setFiltroGenero] = useState("Todos");
  
  // Toggle Financiero
  const [vistaFinanciera, setVistaFinanciera] = useState(false);

  useEffect(() => {
    const unsubAnimales = onSnapshot(collection(db, "animales"), snap => {
      setAnimales(snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(a => !a.estado?.includes('Baja - Venta') && !a.estado?.includes('Baja - Muerte')));
    });
    
    // Optimizacion MVP: Cargar médicos directos.
    const unsubEventos = onSnapshot(collection(db, "eventos"), snap => {
      setEventos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubConfig = onSnapshot(doc(db, "configuracion", "financiera"), snap => {
      if(snap.exists()) setConfig(snap.data());
    });

    return () => { unsubAnimales(); unsubEventos(); unsubConfig(); };
  }, []);

  // --- MATEMÁTICA Y EXTRACCIÓN DE DATOS ---
  
  const inventarioEnriquecido = animales.map(animal => {
    let costoTotal = 0;
    if (config) {
        const fechaInicial = new Date(animal.fechaNacimiento ? animal.fechaNacimiento + "T00:00:00" : (animal.fechaRegistro || new Date()));
        const diasEnRancho = Math.ceil(Math.abs(new Date() - fechaInicial) / (1000 * 60 * 60 * 24)) || 1;
        const tarifaDiaria = config.costoDiario[animal.tipo] || 30;
        const costoMante = diasEnRancho * tarifaDiaria;
        
        const eventosAnimal = eventos.filter(e => e.animalId === animal.id);
        const costoMedico = eventosAnimal.reduce((sum, e) => sum + (Number(e.costo) || 0), 0);
        
        costoTotal = costoMante + costoMedico;
    }
    
    const genero = animal.sexo ? animal.sexo.toLowerCase() : (["Vaca","Novillona","Becerra"].includes(animal.tipo) ? "hembra" : "macho");
    return { ...animal, generoFormat: genero, costoTotal };
  });

  const datosFiltrados = inventarioEnriquecido.filter(a => {
    if (filtroCategoria !== "Todas" && a.tipo !== filtroCategoria) return false;
    if (filtroGenero !== "Todos" && a.generoFormat !== filtroGenero.toLowerCase()) return false;
    if (filtroAlerta === "Fertilidad" && a.estado !== "Alerta: Revisión de Fertilidad") return false;
    if (filtroAlerta === "En Venta" && a.estado !== "Disponible para Venta" && a.estado !== "Desecho") return false;
    return true;
  });

  const cabezasTotales = datosFiltrados.length;
  const costoTotalInventario = datosFiltrados.reduce((sum, a) => sum + a.costoTotal, 0);
  
  const novillonasTotales = inventarioEnriquecido.filter(a => a.tipo === "Novillona").length;
  const novillonasAlerta = inventarioEnriquecido.filter(a => a.tipo === "Novillona" && a.estado === "Alerta: Revisión de Fertilidad").length;
  const porcentajeAlerta = novillonasTotales > 0 ? Math.round((novillonasAlerta / novillonasTotales) * 100) : 0;

  const toretesVenta = inventarioEnriquecido.filter(a => a.estado === "Disponible para Venta").length;
  const ventasProyectadas = (config && toretesVenta > 0) ? (toretesVenta * config.pesoPromedioVentaTorete * config.precioKiloMercado) : 0;

  const procesarGraficaMetrica = () => {
     const distMap = {};
     const razaMap = {};
     datosFiltrados.forEach(a => {
        const cat = a.tipo || "Desconocido";
        const rz = a.raza || "Otra";
        const valor = vistaFinanciera ? a.costoTotal : 1;
        distMap[cat] = (distMap[cat] || 0) + valor;
        razaMap[rz] = (razaMap[rz] || 0) + valor;
     });
     return { 
       datosCategoria: Object.keys(distMap).map(k => ({ name: k, value: Math.round(distMap[k]) })),
       datosRazas: Object.keys(razaMap).map(k => ({ name: k, value: Math.round(razaMap[k]) }))
     };
  };

  const { datosCategoria, datosRazas } = procesarGraficaMetrica();
  const paletaActiva = vistaFinanciera ? COLORES_FINANZAS : COLORES_INVENTARIO;

  return (
    <div className="dashboard-container" style={{ padding: "0 16px", maxWidth: "1200px", margin: "0 auto", paddingBottom: "50px" }}>
      <Header subtitle="Filtra visualizaciones de conteo de inventario cruzadas con algoritmos financieros." />

      <div style={{ display: "flex", flexWrap: "wrap", justifyContent: "space-between", alignItems: "center", backgroundColor: "white", padding: "16px", borderRadius: "12px", boxShadow: "0 1px 3px rgba(0,0,0,0.1)", marginBottom: "20px" }}>
        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <div className="input-group" style={{ margin: 0 }}>
                <label style={{ fontSize: "11px", marginBottom: "2px" }}>Categoría</label>
                <select value={filtroCategoria} onChange={(e) => setFiltroCategoria(e.target.value)} style={{ padding: "6px", borderRadius: "6px", border: "1px solid #d1d5db" }}>
                    <option value="Todas">Todas</option>
                    <option value="Lactante">Lactantes</option>
                    <option value="Becerro">Becerros (M)</option>
                    <option value="Becerra">Becerras (H)</option>
                    <option value="Novillona">Novillonas</option>
                    <option value="Vaca">Vacas</option>
                    <option value="Torete">Toretes</option>
                    <option value="Semental">Sementales</option>
                </select>
            </div>
            <div className="input-group" style={{ margin: 0 }}>
                <label style={{ fontSize: "11px", marginBottom: "2px" }}>Estatus</label>
                <select value={filtroAlerta} onChange={(e) => setFiltroAlerta(e.target.value)} style={{ padding: "6px", borderRadius: "6px", border: "1px solid #d1d5db" }}>
                    <option value="Todas">Todos los Estatus</option>
                    <option value="Fertilidad">Alerta de Fertilidad</option>
                    <option value="En Venta">Disponibles para Venta</option>
                </select>
            </div>
            <div className="input-group" style={{ margin: 0 }}>
                <label style={{ fontSize: "11px", marginBottom: "2px" }}>Género</label>
                <select value={filtroGenero} onChange={(e) => setFiltroGenero(e.target.value)} style={{ padding: "6px", borderRadius: "6px", border: "1px solid #d1d5db" }}>
                    <option value="Todos">Ambos</option>
                    <option value="Hembra">Hembras</option>
                    <option value="Macho">Machos</option>
                </select>
            </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px", marginTop: "10px" }}>
           <span style={{ fontSize: "13px", fontWeight: "600", color: vistaFinanciera ? "#9ca3af" : "#3b82f6" }}>Inventario</span>
           <div onClick={() => setVistaFinanciera(!vistaFinanciera)} style={{ width: "50px", height: "26px", borderRadius: "15px", backgroundColor: vistaFinanciera ? "#10b981" : "#d1d5db", position: "relative", cursor: "pointer", transition: "0.3s" }}>
               <div style={{ width: "22px", height: "22px", backgroundColor: "white", borderRadius: "50%", position: "absolute", top: "2px", left: vistaFinanciera ? "26px" : "2px", transition: "0.3s", boxShadow: "0 2px 4px rgba(0,0,0,0.2)" }} />
           </div>
           <span style={{ fontSize: "13px", fontWeight: "600", color: vistaFinanciera ? "#10b981" : "#9ca3af" }}>Finanzas ($)</span>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "24px" }}>
        <div style={{ backgroundColor: "white", padding: "16px", borderRadius: "12px", borderLeft: "4px solid #3b82f6", boxShadow: "0 2px 4px rgba(0,0,0,0.05)" }}>
            <div style={{ color: "#6b7280", fontSize: "12px", fontWeight: "bold", display: "flex", alignItems: "center", gap: "6px" }}><Activity size={16}/> VOLUMEN FILTRADO</div>
            <div style={{ fontSize: "28px", fontWeight: "bold", color: "#111827", marginTop: "8px" }}>{cabezasTotales} <span style={{ fontSize:"14px", color: "#9ca3af"}}>cabezas</span></div>
        </div>
        <div style={{ backgroundColor: "white", padding: "16px", borderRadius: "12px", borderLeft: "4px solid #10b981", boxShadow: "0 2px 4px rgba(0,0,0,0.05)" }}>
            <div style={{ color: "#6b7280", fontSize: "12px", fontWeight: "bold", display: "flex", alignItems: "center", gap: "6px" }}><DollarSign size={16}/> COSTO DEL GRUPO</div>
            <div style={{ fontSize: "28px", fontWeight: "bold", color: "#111827", marginTop: "8px" }}>${Math.round(costoTotalInventario).toLocaleString()}</div>
        </div>
        <div style={{ backgroundColor: "white", padding: "16px", borderRadius: "12px", borderLeft: "4px solid #ef4444", boxShadow: "0 2px 4px rgba(0,0,0,0.05)" }}>
            <div style={{ color: "#6b7280", fontSize: "12px", fontWeight: "bold", display: "flex", alignItems: "center", gap: "6px" }}><AlertCircle size={16}/> TASA DE INFERTILIDAD</div>
            <div style={{ fontSize: "28px", fontWeight: "bold", color: "#ef4444", marginTop: "8px" }}>{porcentajeAlerta}%</div>
            <div style={{ fontSize: "11px", color: "#6b7280", marginTop: "4px" }}>Novillonas ≥ 48m sin parto ({novillonasAlerta})</div>
        </div>
        <div style={{ backgroundColor: "white", padding: "16px", borderRadius: "12px", borderLeft: "4px solid #f59e0b", boxShadow: "0 2px 4px rgba(0,0,0,0.05)" }}>
            <div style={{ color: "#6b7280", fontSize: "12px", fontWeight: "bold", display: "flex", alignItems: "center", gap: "6px" }}><TrendingUp size={16}/> PROYECCIÓN DE VENTA</div>
            <div style={{ fontSize: "28px", fontWeight: "bold", color: "#f59e0b", marginTop: "8px" }}>${Math.round(ventasProyectadas).toLocaleString()}</div>
            <div style={{ fontSize: "11px", color: "#6b7280", marginTop: "4px" }}>Por {toretesVenta} machos comerciales</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: "24px" }}>
        <div style={{ backgroundColor: "white", borderRadius: "12px", padding: "24px", boxShadow: "0 2px 4px rgba(0,0,0,0.05)" }}>
          <h3 style={{ marginTop: 0, color: "#374151" }}>Agrupación por Categoría {vistaFinanciera ? "($ Invest)" : "(Cabezas)"}</h3>
          <div style={{ height: "300px", width: "100%", marginTop: "20px" }}>
            <ResponsiveContainer>
              <PieChart>
                <Pie data={datosCategoria} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={5} dataKey="value">
                  {datosCategoria.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={paletaActiva[index % paletaActiva.length]} />
                  ))}
                </Pie>
                <RTTooltip formatter={(value) => vistaFinanciera ? `$${value.toLocaleString()}` : `${value} ud.` } />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
        <div style={{ backgroundColor: "white", borderRadius: "12px", padding: "24px", boxShadow: "0 2px 4px rgba(0,0,0,0.05)" }}>
          <h3 style={{ marginTop: 0, color: "#374151" }}>Rendimiento por Genética {vistaFinanciera ? "($ Invest)" : "(Cabezas)"}</h3>
          <div style={{ height: "300px", width: "100%", marginTop: "20px" }}>
            <ResponsiveContainer>
              <BarChart data={datosRazas} margin={{ top: 20, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} hide={vistaFinanciera} />
                <RTTooltip formatter={(value) => vistaFinanciera ? `$${value.toLocaleString()}` : `${value} ud.` } cursor={{fill: 'transparent'}} />
                <Bar dataKey="value" fill={vistaFinanciera ? "#10b981" : "#3b82f6"} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ===================== REPORTES DESCARGABLES ===================== */}
      <div className="card" style={{ marginTop: "24px" }}>
        <div className="card-header">
          <div className="card-icon verde"><Download size={22} /></div>
          <div>
            <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700 }}>Reportes Descargables</h3>
            <p style={{ margin: "2px 0 0", fontSize: "13px", color: "var(--gris-400)" }}>Genera reportes profesionales para compartir con tu equipo.</p>
          </div>
        </div>

        {/* REPORTE: VIENTRES */}
        <div style={{
          padding: "16px", borderRadius: "var(--radio)", border: "1px solid var(--gris-200)",
          background: "var(--gris-100)", marginBottom: "12px"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: "14px", color: "var(--gris-900)", display: "flex", alignItems: "center", gap: "6px" }}>
                🐄 Reporte de Vientres
              </div>
              <div style={{ fontSize: "12px", color: "var(--gris-400)", marginTop: "2px" }}>
                Inventario de Vacas y Novillonas — Partos, estado reproductivo, costos e historial médico.
              </div>
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                className="btn-outline"
                style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px" }}
                onClick={() => generarPDFVientres(animales, eventos, config)}
              >
                <FileText size={16} /> PDF
              </button>
              <button
                className="btn-outline"
                style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", borderColor: "var(--verde-claro)", color: "var(--verde-medio)" }}
                onClick={() => generarExcelVientres(animales, eventos, config)}
              >
                <FileSpreadsheet size={16} /> Excel
              </button>
            </div>
          </div>
        </div>

        {/* REPORTE: REPRODUCCIÓN */}
        <div style={{
          padding: "16px", borderRadius: "var(--radio)", border: "1px solid var(--gris-200)",
          background: "var(--gris-100)", marginBottom: "12px"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: "14px", color: "var(--gris-900)", display: "flex", alignItems: "center", gap: "6px" }}>
                📈 Reporte de Reproducción
              </div>
              <div style={{ fontSize: "12px", color: "var(--gris-400)", marginTop: "2px" }}>
                Análisis mensual de palpaciones (12 meses) — Gestantes, vacías, anestro y % de preñez.
              </div>
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                className="btn-outline"
                style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px" }}
                onClick={() => generarPDFReproduccion(eventos)}
              >
                <FileText size={16} /> PDF
              </button>
              <button
                className="btn-outline"
                style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", borderColor: "var(--verde-claro)", color: "var(--verde-medio)" }}
                onClick={() => generarExcelReproduccion(eventos)}
              >
                <FileSpreadsheet size={16} /> Excel
              </button>
            </div>
          </div>
        </div>

        {/* REPORTE: PROYECCIÓN DE PARTOS */}
        <div style={{
          padding: "16px", borderRadius: "var(--radio)", border: "1px solid var(--gris-200)",
          background: "var(--gris-100)", marginBottom: "12px"
        }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
            <div>
              <div style={{ fontWeight: 700, fontSize: "14px", color: "var(--gris-900)", display: "flex", alignItems: "center", gap: "6px" }}>
                📅 Proyección de Partos
              </div>
              <div style={{ fontSize: "12px", color: "var(--gris-400)", marginTop: "2px" }}>
                Nacimientos esperados por mes, Intervalo Entre Partos (IEP) y Días Abiertos.
              </div>
            </div>
            <div style={{ display: "flex", gap: "8px" }}>
              <button
                className="btn-outline"
                style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px" }}
                onClick={() => generarPDFProyeccionPartos(animales, eventos)}
              >
                <FileText size={16} /> PDF
              </button>
              <button
                className="btn-outline"
                style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", borderColor: "var(--verde-claro)", color: "var(--verde-medio)" }}
                onClick={() => generarExcelProyeccionPartos(animales, eventos)}
              >
                <FileSpreadsheet size={16} /> Excel
              </button>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
