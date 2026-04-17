import React, { useState, useEffect } from "react";
import { collection, onSnapshot, doc } from "firebase/firestore";
import { db } from "../firebase";
import { PieChart, Pie, Cell, Tooltip as RTTooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, LabelList } from "recharts";
import { AlertCircle, DollarSign, Activity, TrendingUp, Download, FileText, FileSpreadsheet } from "lucide-react";
import Header from "../components/Header";
import { 
  generarPDFVientres, generarExcelVientres, 
  generarPDFReproduccion, generarExcelReproduccion, 
  generarPDFProyeccionPartos, generarExcelProyeccionPartos,
  generarPDFPotreros, generarExcelPotreros,
  generarPDFDesarrollo, generarExcelDesarrollo, prepararDatosDesarrollo,
  generarPDFCalendario, generarExcelCalendario, prepararDatosCalendario,
  calcularMetricasProductividad, generarPDFFichaIndividual,
  prepararDatosVientres, prepararDatosReproduccion, prepararDatosProyeccionPartos, prepararDatosPotreros
} from "../reportes";

// Paletas de Colores Dinámicas
const COLORES_INVENTARIO = ["#3b82f6", "#8b5cf6", "#ec4899", "#f43f5e", "#f59e0b", "#10b981"];
const COLORES_FINANZAS = ["#059669", "#111827", "#34d399", "#fbbf24", "#d97706", "#dc2626"];

export default function ReportesBI() {
  const [animales, setAnimales] = useState([]);
  const [eventos, setEventos] = useState([]);
  const [alertas, setAlertas] = useState([]);
  const [config, setConfig] = useState(null);
  const [potreros, setPotreros] = useState([]);

  // Slicers
  const [filtroCategoria, setFiltroCategoria] = useState("Todas");
  const [filtroAlerta, setFiltroAlerta] = useState("Todas");
  const [filtroGenero, setFiltroGenero] = useState("Todos");
  
  // Toggle Financiero
  const [vistaFinanciera, setVistaFinanciera] = useState(false);
  
  // Módulo Productividad
  const [reporteProd, setReporteProd] = useState("");
  const [areteBusqueda, setAreteBusqueda] = useState("");
  const [animalIndividual, setAnimalIndividual] = useState(null);
  const [fCatTarjeta, setfCatTarjeta] = useState("Todas");
  const [fPotTarjeta, setfPotTarjeta] = useState("Todas");

  // Módulo de Reportes Avanzados (Interactivo)
  const [reporteAvanzado, setReporteAvanzado] = useState("");
  const [fechaInicioReporte, setFechaInicioReporte] = useState(() => {
     const d = new Date();
     d.setMonth(0);
     d.setDate(1);
     return d.toISOString().split("T")[0]; // Enero 1 de este año
  });
  const [fechaFinReporte, setFechaFinReporte] = useState(() => new Date().toISOString().split("T")[0]);

  // Caché de datos para previsualización
  const filtrosActuales = { fechaInicio: fechaInicioReporte, fechaFin: fechaFinReporte };

  useEffect(() => {
    const unsubAnimales = onSnapshot(collection(db, "animales"), snap => {
      setAnimales(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    
    // Optimizacion MVP: Cargar médicos directos.
    const unsubEventos = onSnapshot(collection(db, "eventos"), snap => {
      setEventos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubConfig = onSnapshot(doc(db, "configuracion", "financiera"), snap => {
      if(snap.exists()) setConfig(snap.data());
    });

    const unsubAlertas = onSnapshot(collection(db, "alertas"), snap => {
      setAlertas(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubPotreros = onSnapshot(collection(db, "potreros"), snap => {
      setPotreros(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => { unsubAnimales(); unsubEventos(); unsubConfig(); unsubAlertas(); unsubPotreros(); };
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
  
  const datosPotrero = (() => {
    const hMap = {};
    animales.forEach(a => {
        if (a.estado?.includes("Baja")) return;
        const h = a.potrero || a.hectarea || "Sin Asignar";
        hMap[h] = (hMap[h] || 0) + 1;
    });
    return Object.keys(hMap).map(k => ({ name: k, value: hMap[k] }));
  })();

  const paletaActiva = vistaFinanciera ? COLORES_FINANZAS : COLORES_INVENTARIO;

  const metricas = calcularMetricasProductividad(animales, eventos);

  const manejarBusquedaIndividual = (e) => {
    if(e) e.preventDefault();
    const a = animales.find(a => a.arete?.toLowerCase() === areteBusqueda.toLowerCase());
    setAnimalIndividual(a || "error");
  };

  const listaAretesFiltrados = animales.filter(a => {
    const cumpleCat = fCatTarjeta === "Todas" || a.tipo === fCatTarjeta;
    const cumplePot = fPotTarjeta === "Todas" || (a.potrero || a.hectarea) === fPotTarjeta;
    return cumpleCat && cumplePot;
  }).sort((a,b) => (a.arete || "").localeCompare(b.arete || ""));

  const potrerosUnicos = [...new Set(animales.map(a => a.potrero || a.hectarea || "Sin Asignar"))].sort();

  const formatoMonedaCorta = (num) => {
    if (!num) return "$0";
    if (num >= 1000000) return `$${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `$${(num / 1000).toFixed(1)}k`;
    return `$${num}`;
  };

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
                <Pie 
                  data={datosCategoria} 
                  cx="50%" cy="50%" 
                  innerRadius={60} outerRadius={80} 
                  paddingAngle={5} dataKey="value"
                  label={({ name, value }) => vistaFinanciera ? `${name}: ${formatoMonedaCorta(value)}` : `${name}: ${value}`}
                >
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
                <Bar dataKey="value" fill={vistaFinanciera ? "#10b981" : "#3b82f6"} radius={[4, 4, 0, 0]}>
                   <LabelList dataKey="value" position="top" formatter={(val) => vistaFinanciera ? formatoMonedaCorta(val) : val} style={{ fontSize: "11px", fontWeight: "bold" }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
        
        {/* NUEVO GRÁFICO: DISTRIBUCIÓN POR POTRERO */}
        <div style={{ backgroundColor: "white", borderRadius: "12px", padding: "24px", boxShadow: "0 2px 4px rgba(0,0,0,0.05)", gridColumn: "span 2", marginTop: "24px" }}>
          <h3 style={{ marginTop: 0, color: "#374151" }}>Inventario por Potrero (Carga Animal)</h3>
          <div style={{ height: "300px", width: "100%", marginTop: "20px" }}>
            <ResponsiveContainer>
              <BarChart data={datosPotrero} margin={{ top: 30, right: 30, left: 0, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={false} />
                <RTTooltip cursor={{fill: 'transparent'}} />
                <Bar dataKey="value" fill="#ec4899" radius={[4, 4, 0, 0]}>
                   <LabelList dataKey="value" position="top" style={{ fill: "#be185d", fontWeight: "bold" }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* ===================== VISUALIZADOR INTERACTIVO DE REPORTES ===================== */}
      <div className="card" style={{ marginTop: "24px" }}>
        <div className="card-header">
          <div className="card-icon verde"><FileText size={22} /></div>
          <div>
            <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700 }}>Visor de Reportes (PDF / Excel)</h3>
            <p style={{ margin: "2px 0 0", fontSize: "13px", color: "var(--gris-400)" }}>Visualiza datos por fecha antes de exportar.</p>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "10px", marginTop: "15px", padding: "0 16px" }}>
            <div className="input-group" style={{ margin: 0 }}>
                <label style={{ fontSize: "11px" }}>Seleccionar Reporte</label>
                <select 
                    value={reporteAvanzado} 
                    onChange={(e) => setReporteAvanzado(e.target.value)}
                    style={{ padding: "8px", borderRadius: "6px", border: "1px solid #d1d5db", width: "100%" }}
                >
                    <option value="">-- Elige un reporte --</option>
                    <option value="vientres">🐄 Reporte de Vientres</option>
                    <option value="reproduccion">📈 Reporte de Reproducción</option>
                    <option value="proyeccion">📅 Proyección de Partos</option>
                    <option value="hectareas">🚩 Producción por Hectárea</option>
                    <option value="desarrollo">📈 Desarrollo (GDP)</option>
                    <option value="calendario">📅 Calendario de Manejo</option>
                </select>
            </div>
            {reporteAvanzado && (
                <>
                    <div className="input-group" style={{ margin: 0 }}>
                        <label style={{ fontSize: "11px" }}>Desde</label>
                        <input type="date" value={fechaInicioReporte} onChange={(e) => setFechaInicioReporte(e.target.value)} style={{ padding: "7px" }}/>
                    </div>
                    <div className="input-group" style={{ margin: 0 }}>
                        <label style={{ fontSize: "11px" }}>Hasta</label>
                        <input type="date" value={fechaFinReporte} onChange={(e) => setFechaFinReporte(e.target.value)} style={{ padding: "7px" }}/>
                    </div>
                </>
            )}
        </div>

        {reporteAvanzado && (
            <div style={{ marginTop: "20px", padding: "16px", borderTop: "1px solid #f3f4f6" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px", flexWrap: "wrap", gap: "10px" }}>
                    <h4 style={{ margin: 0, color: "#166534" }}>Vista Previa de Datos</h4>
                    <div style={{ display: "flex", gap: "8px" }}>
                        <button className="btn-outline" style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px" }}
                            onClick={() => {
                                if (reporteAvanzado === "vientres") generarPDFVientres(animales, eventos, config, filtrosActuales);
                                else if (reporteAvanzado === "reproduccion") generarPDFReproduccion(eventos, filtrosActuales);
                                else if (reporteAvanzado === "proyeccion") generarPDFProyeccionPartos(animales, eventos, filtrosActuales);
                                else if (reporteAvanzado === "potreros") generarPDFPotreros(animales, potreros, filtrosActuales);
                                else if (reporteAvanzado === "desarrollo") generarPDFDesarrollo(animales, eventos, filtrosActuales);
                                else if (reporteAvanzado === "calendario") generarPDFCalendario(animales, eventos, alertas, filtrosActuales);
                            }}
                        >
                            <Download size={16} /> PDF
                        </button>
                        <button className="btn-outline" style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", borderColor: "var(--verde-claro)", color: "var(--verde-medio)" }}
                            onClick={() => {
                                if (reporteAvanzado === "vientres") generarExcelVientres(animales, eventos, config, filtrosActuales);
                                else if (reporteAvanzado === "reproduccion") generarExcelReproduccion(eventos, filtrosActuales);
                                else if (reporteAvanzado === "proyeccion") generarExcelProyeccionPartos(animales, eventos, filtrosActuales);
                                else if (reporteAvanzado === "potreros") generarExcelPotreros(animales, potreros, filtrosActuales);
                                else if (reporteAvanzado === "desarrollo") generarExcelDesarrollo(animales, eventos, filtrosActuales);
                                else if (reporteAvanzado === "calendario") generarExcelCalendario(animales, eventos, alertas, filtrosActuales);
                            }}
                        >
                            <FileSpreadsheet size={16} /> Excel
                        </button>
                    </div>
                </div>

                {/* TABLA DE VISTA PREVIA (MÁXIMO 10 FILAS) */}
                <div style={{ overflowX: "auto", border: "1px solid #e5e7eb", borderRadius: "8px" }}>
                    <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "12px", textAlign: "left", whiteSpace: "nowrap" }}>
                        <thead style={{ backgroundColor: "#f9fafb", borderBottom: "2px solid #e5e7eb" }}>
                            {reporteAvanzado === "vientres" && <tr><th style={{padding:"8px"}}>Arete</th><th style={{padding:"8px"}}>Categoría</th><th style={{padding:"8px"}}>Partos</th><th style={{padding:"8px"}}>Último Evento</th><th style={{padding:"8px"}}>Inversión</th></tr>}
                            {reporteAvanzado === "reproduccion" && <tr><th style={{padding:"8px"}}>Mes</th><th style={{padding:"8px"}}>Palpadas</th><th style={{padding:"8px"}}>Gestantes</th><th style={{padding:"8px"}}>Anestro</th><th style={{padding:"8px"}}>% Preñez</th></tr>}
                            {reporteAvanzado === "proyeccion" && <tr><th style={{padding:"8px"}}>Mes Proyectado</th><th style={{padding:"8px"}}>Partos Esperados</th><th style={{padding:"8px"}}>Aretes</th></tr>}
                            {reporteAvanzado === "potreros" && <tr><th style={{padding:"8px"}}>Potrero</th><th style={{padding:"8px"}}>Carga (Cab/Ha)</th><th style={{padding:"8px"}}>Biomasa Total</th><th style={{padding:"8px"}}>Prod (Kg/Ha)</th></tr>}
                            {reporteAvanzado === "desarrollo" && <tr><th style={{padding:"8px"}}>Categoría</th><th style={{padding:"8px"}}>Cantidad</th><th style={{padding:"8px"}}>GDP Promedio</th><th style={{padding:"8px"}}>Días Período</th></tr>}
                            {reporteAvanzado === "calendario" && <tr><th style={{padding:"8px"}}>Categoría</th><th style={{padding:"8px"}}>Mes Actual</th><th style={{padding:"8px"}}>Actividades Realizadas</th></tr>}
                        </thead>
                        <tbody>
                            {reporteAvanzado === "vientres" && prepararDatosVientres(animales, eventos, config, filtrosActuales).slice(0, 10).map((d, i) => (
                                <tr key={i} style={{ borderBottom: "1px solid #e5e7eb" }}><td style={{padding:"8px"}}>{d.arete}</td><td style={{padding:"8px"}}>{d.tipo}</td><td style={{padding:"8px"}}>{d.numPartos}</td><td style={{padding:"8px"}}>{d.ultimoEvento.substring(0, 25)}</td><td style={{padding:"8px"}}>${d.costoTotal}</td></tr>
                            ))}
                            {reporteAvanzado === "reproduccion" && prepararDatosReproduccion(eventos, filtrosActuales).slice(0, 10).map((d, i) => (
                                <tr key={i} style={{ borderBottom: "1px solid #e5e7eb" }}><td style={{padding:"8px",fontWeight:"bold"}}>{d.label}</td><td style={{padding:"8px"}}>{d.palpadas}</td><td style={{padding:"8px"}}>{d.gestantes}</td><td style={{padding:"8px"}}>{d.anestro}</td><td style={{padding:"8px",color:"#166534"}}>{d.porcentaje}</td></tr>
                            ))}
                            {reporteAvanzado === "proyeccion" && prepararDatosProyeccionPartos(animales, eventos, filtrosActuales).proyeccion.slice(0, 8).map((d, i) => (
                                <tr key={i} style={{ borderBottom: "1px solid #e5e7eb" }}><td style={{padding:"8px"}}>{d.label}</td><td style={{padding:"8px",fontWeight:"bold",color:d.conteo>0?"#166534":"#9ca3af"}}>{d.conteo}</td><td style={{padding:"8px"}}>{d.detalles.join(", ")||"---"}</td></tr>
                            ))}
                            {reporteAvanzado === "potreros" && prepararDatosPotreros(animales, potreros, filtrosActuales).slice(0, 10).map((d, i) => (
                                <tr key={i} style={{ borderBottom: "1px solid #e5e7eb" }}><td style={{padding:"8px"}}>{d.nombre} ({d.hectareasOficiales} has)</td><td style={{padding:"8px"}}>{d.cargaAnimalCabezasXHa}</td><td style={{padding:"8px"}}>{d.pesoTotal} kg</td><td style={{padding:"8px"}}>{d.cargaAnimalKilosXHa}</td></tr>
                            ))}
                            {reporteAvanzado === "desarrollo" && prepararDatosDesarrollo(animales, eventos, filtrosActuales).slice(0, 10).map((d, i) => (
                                <tr key={i} style={{ borderBottom: "1px solid #e5e7eb" }}><td style={{padding:"8px"}}>{d.categoria}</td><td style={{padding:"8px"}}>{d.cantidad}</td><td style={{padding:"8px",fontWeight:"bold"}}>{d.gdp} kg/día</td><td style={{padding:"8px"}}>{d.dias}</td></tr>
                            ))}
                            {reporteAvanzado === "calendario" && prepararDatosCalendario(animales, eventos, alertas, filtrosActuales).slice(0, 10).map((d, i) => (
                                <tr key={i} style={{ borderBottom: "1px solid #e5e7eb" }}><td style={{padding:"8px",fontWeight:"bold"}}>{d.categoria}</td><td style={{padding:"8px"}}>{d.mesActual}</td><td style={{padding:"8px"}}>{d.actividadesActual.filter(x=>x).join(" | ")}</td></tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <div style={{ textAlign: "center", padding: "10px", fontSize: "11px", color: "#6b7280" }}>
                    Mostrando previsualización máxima de 10 filas. El PDF o Excel final contendrá la información completa.
                </div>
            </div>
        )}
      </div>

      {/* ===================== MÓDULO DE PRODUCTIVIDAD ===================== */}
      <div className="card" style={{ marginTop: "24px", borderTop: "4px solid #3b82f6" }}>
        <div className="card-header">
          <div className="card-icon azul"><Activity size={22} /></div>
          <div>
            <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 700 }}>Análisis de Productividad y Trazabilidad</h3>
            <p style={{ margin: "2px 0 0", fontSize: "13px", color: "var(--gris-400)" }}>Métricas avanzadas de eficiencia y consulta individual por arete.</p>
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "20px", marginTop: "10px" }}>
            
            {/* SELECTOR DE REPORTES */}
            <div style={{ padding: "16px", backgroundColor: "#f9fafb", borderRadius: "12px", border: "1px solid #e5e7eb" }}>
                <label style={{ display: "block", fontSize: "13px", fontWeight: "bold", color: "#374151", marginBottom: "10px" }}>Selecciona un Indicador:</label>
                <select 
                    value={reporteProd} 
                    onChange={(e) => setReporteProd(e.target.value)}
                    style={{ width: "100%", padding: "10px", borderRadius: "8px", border: "1px solid #d1d5db", fontSize: "14px" }}
                >
                    <option value="">-- Elige un reporte --</option>
                    <option value="parto">1. Meses de edad al primer parto</option>
                    <option value="gdp">2. GDP Histórico (3m vs 12m)</option>
                    <option value="mort_dev">3. % Mortalidad Desarrollo</option>
                    <option value="mort_vac">4. % Mortalidad Vacas</option>
                    <option value="desecho">6. % Desechos (Culling Rate)</option>
                    <option value="venta">9. Promedio Peso de Venta</option>
                </select>

                <div style={{ marginTop: "20px", padding: "15px", backgroundColor: "white", borderRadius: "8px", minHeight: "100px", border: "1px dashed #3b82f6" }}>
                    {!reporteProd && <p style={{ color: "#9ca3af", textAlign: "center", fontSize: "13px" }}>Selecciona un reporte para ver los resultados calculados.</p>}
                    
                    {reporteProd === "parto" && (
                        <div>
                            <h4 style={{ margin: 0, color: "#1e40af" }}>Edad Promedio al Primer Parto</h4>
                            <div style={{ fontSize: "32px", fontWeight: "bold", marginTop: "10px" }}>{metricas.edadPrimerParto} <span style={{ fontSize: "14px" }}>meses</span></div>
                            <p style={{ fontSize: "11px", color: "#6b7280", marginTop: "5px" }}>Meta ideal: 24 - 28 meses.</p>
                        </div>
                    )}

                    {reporteProd === "gdp" && (
                        <div>
                            <h4 style={{ margin: "0 0 10px 0", color: "#1e40af" }}>Ganancia Diaria de Peso (Promedio)</h4>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                                <div style={{ padding: "8px", backgroundColor: "#eff6ff", borderRadius: "6px" }}>
                                    <div style={{ fontSize: "10px", color: "#3b82f6" }}>MACHOS (12m)</div>
                                    <div style={{ fontWeight: "bold" }}>{metricas.gdp.m_12m} kg</div>
                                </div>
                                <div style={{ padding: "8px", backgroundColor: "#eff6ff", borderRadius: "6px" }}>
                                    <div style={{ fontSize: "10px", color: "#3b82f6" }}>HEMBRAS (12m)</div>
                                    <div style={{ fontWeight: "bold" }}>{metricas.gdp.h_12m} kg</div>
                                </div>
                                <div style={{ padding: "8px", backgroundColor: "#f0fdf4", borderRadius: "6px" }}>
                                    <div style={{ fontSize: "10px", color: "#10b981" }}>MACHOS (3m)</div>
                                    <div style={{ fontWeight: "bold" }}>{metricas.gdp.m_3m} kg</div>
                                </div>
                                <div style={{ padding: "8px", backgroundColor: "#f0fdf4", borderRadius: "6px" }}>
                                    <div style={{ fontSize: "10px", color: "#10b981" }}>HEMBRAS (3m)</div>
                                    <div style={{ fontWeight: "bold" }}>{metricas.gdp.h_3m} kg</div>
                                </div>
                            </div>
                        </div>
                    )}

                    {reporteProd === "mort_dev" && (
                        <div>
                            <h4 style={{ margin: 0, color: "#991b1b" }}>% Mortalidad en Desarrollo</h4>
                            <div style={{ fontSize: "32px", fontWeight: "bold", marginTop: "10px", color: "#dc2626" }}>{metricas.mortalidad.desarrollo}%</div>
                            <p style={{ fontSize: "11px", color: "#6b7280", marginTop: "5px" }}>{metricas.mortalidad.conteoM_D} bajas registradas por muerte.</p>
                        </div>
                    )}

                    {reporteProd === "mort_vac" && (
                        <div>
                            <h4 style={{ margin: 0, color: "#991b1b" }}>% Mortalidad en Vacas</h4>
                            <div style={{ fontSize: "32px", fontWeight: "bold", marginTop: "10px", color: "#dc2626" }}>{metricas.mortalidad.vacas}%</div>
                            <p style={{ fontSize: "11px", color: "#6b7280", marginTop: "5px" }}>{metricas.mortalidad.conteoM_V} bajas registradas por muerte.</p>
                        </div>
                    )}

                    {reporteProd === "desecho" && (
                        <div>
                            <h4 style={{ margin: 0, color: "#854d0e" }}>% Desechos (Culling Rate)</h4>
                            <div style={{ fontSize: "32px", fontWeight: "bold", marginTop: "10px", color: "#ca8a04" }}>{metricas.desecho}%</div>
                            <p style={{ fontSize: "11px", color: "#6b7280", marginTop: "5px" }}>{metricas.conteoDesecho} vacas vendidas por desecho este año.</p>
                        </div>
                    )}

                    {reporteProd === "venta" && (
                        <div>
                            <h4 style={{ margin: "0 0 10px 0", color: "#1e40af" }}>Pesos de Venta (Promedio)</h4>
                            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                                <div style={{ padding: "6px", borderBottom: "1px solid #eee" }}>
                                    <div style={{ fontSize: "10px", color: "#6b7280" }}>VACAS</div>
                                    <div style={{ fontWeight: "bold" }}>{metricas.pesosVenta.vacas} kg</div>
                                </div>
                                <div style={{ padding: "6px", borderBottom: "1px solid #eee" }}>
                                    <div style={{ fontSize: "10px", color: "#6b7280" }}>BECERROS</div>
                                    <div style={{ fontWeight: "bold" }}>{metricas.pesosVenta.becerros} kg</div>
                                </div>
                                <div style={{ padding: "6px" }}>
                                    <div style={{ fontSize: "10px", color: "#6b7280" }}>NOVILLONAS</div>
                                    <div style={{ fontWeight: "bold" }}>{metricas.pesosVenta.novillonas} kg</div>
                                </div>
                                <div style={{ padding: "6px" }}>
                                    <div style={{ fontSize: "10px", color: "#6b7280" }}>TORETES</div>
                                    <div style={{ fontWeight: "bold" }}>{metricas.pesosVenta.toretes} kg</div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* TARJETA INDIVIDUAL */}
            <div style={{ padding: "16px", backgroundColor: "#f0fdf4", borderRadius: "12px", border: "1px solid #bbf7d0" }}>
                 <label style={{ display: "block", fontSize: "13px", fontWeight: "bold", color: "#166534", marginBottom: "10px" }}>5. Tarjeta Individual por Arete:</label>
                 
                 {/* FILTROS DE BÚSQUEDA */}
                 <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "8px" }}>
                    <select 
                        value={fCatTarjeta} 
                        onChange={(e) => setfCatTarjeta(e.target.value)}
                        style={{ padding: "6px", borderRadius: "6px", border: "1px solid #86efac", fontSize: "12px" }}
                    >
                        <option value="Todas">Toda Categoría</option>
                        <option value="Vaca">Vacas</option>
                        <option value="Novillona">Novillonas</option>
                        <option value="Becerro">Becerros</option>
                        <option value="Becerra">Becerras</option>
                        <option value="Torete">Toretes</option>
                        <option value="Semental">Sementales</option>
                    </select>
                    <select 
                        value={fPotTarjeta} 
                        onChange={(e) => setfPotTarjeta(e.target.value)}
                        style={{ padding: "6px", borderRadius: "6px", border: "1px solid #86efac", fontSize: "12px" }}
                    >
                        <option value="Todas">Todos los Potreros</option>
                        {potrerosUnicos.map(h => <option key={h} value={h}>{h}</option>)}
                    </select>
                 </div>

                 <form onSubmit={manejarBusquedaIndividual} style={{ display: "flex", flexWrap: "wrap", gap: "8px", marginBottom: "15px" }}>
                    <select
                        value={areteBusqueda}
                        onChange={(e) => {
                            setAreteBusqueda(e.target.value);
                        }}
                        style={{ flex: 1, padding: "10px", borderRadius: "8px", border: "1px solid #86efac", fontSize: "14px" }}
                    >
                        <option value="">-- Seleccionar Arete --</option>
                        {listaAretesFiltrados.map(a => (
                            <option key={a.id} value={a.arete}>{a.arete} ({a.tipo})</option>
                        ))}
                    </select>
                    <button type="submit" className="btn-primary" style={{ margin: 0, padding: "10px" }}>🔍 Ver</button>
                 </form>

                 <div style={{ minHeight: "180px", backgroundColor: "white", borderRadius: "8px", padding: "15px", border: "1px solid #86efac" }}>
                    {!animalIndividual && <p style={{ color: "#9ca3af", textAlign: "center", fontSize: "13px", marginTop: "50px" }}>Busca un arete para ver su historia completa.</p>}
                    {animalIndividual === "error" && <p style={{ color: "#ef4444", textAlign: "center", fontSize: "13px" }}>⚠️ No se encontró ningún animal con ese arete.</p>}
                    
                    {animalIndividual && animalIndividual !== "error" && (
                        <div>
                            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                <div>
                                    <h4 style={{ margin: 0, color: "#166534" }}>{animalIndividual.arete}</h4>
                                    <p style={{ margin: 0, fontSize: "11px", color: "#6b7280" }}>{animalIndividual.tipo} — {animalIndividual.raza}</p>
                                </div>
                                <button 
                                    className="btn-outline" 
                                    style={{ padding: "4px 8px", fontSize: "11px", borderColor: "#166534", color: "#166534" }}
                                    onClick={() => generarPDFFichaIndividual(animalIndividual, eventos.filter(e => e.animalId === animalIndividual.id))}
                                >
                                    💾 Descargar Ficha
                                </button>
                            </div>

                            <div style={{ marginTop: "15px", fontSize: "12px", color: "#374151" }}>
                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                                    <span>Nacimiento:</span> <span style={{ fontWeight: "bold" }}>{animalIndividual.fechaNacimiento || "No reg."}</span>
                                </div>
                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                                    <span>Manejos reg.:</span> <span style={{ fontWeight: "bold" }}>{eventos.filter(e => e.animalId === animalIndividual.id).length}</span>
                                </div>
                                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                                    <span>Estado actual:</span> <span style={{ fontWeight: "bold", padding: "2px 6px", borderRadius: "4px", backgroundColor: "#f0fdf4" }}>{animalIndividual.estado}</span>
                                </div>
                                <div style={{ marginTop: "10px", paddingTop: "10px", borderTop: "1px solid #eee", fontSize: "11px", fontStyle: "italic", color: "#6b7280" }}>
                                    * El PDF descargable incluye el historial cronológico completo de este animal.
                                </div>
                            </div>
                        </div>
                    )}
                 </div>
            </div>

        </div>
      </div>

    </div>
  );
}
