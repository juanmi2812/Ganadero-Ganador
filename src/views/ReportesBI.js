import React, { useState, useEffect } from "react";
import { collection, onSnapshot, doc, query, where } from "firebase/firestore";
import { db } from "../firebase";
import { PieChart, Pie, Cell, Tooltip as RTTooltip, Legend, BarChart, Bar, XAxis, YAxis, CartesianGrid, ResponsiveContainer, LabelList } from "recharts";
import { AlertCircle, DollarSign, Activity, TrendingUp, Download, FileText, FileSpreadsheet, Info, X, AlertTriangle, Archive } from "lucide-react";
import Header from "../components/Header";
import {
  generarPDFVientres, generarExcelVientres,
  generarPDFReproduccion, generarExcelReproduccion,
  generarPDFProyeccionPartos, generarExcelProyeccionPartos,
  generarPDFPotreros, generarExcelPotreros,
  generarPDFDesarrollo, generarExcelDesarrollo, prepararDatosDesarrollo,
  generarPDFCalendario, generarExcelCalendario, prepararDatosCalendario,
  calcularMetricasProductividad, generarPDFFichaIndividual,
  prepararDatosVientres, prepararDatosReproduccion, prepararDatosProyeccionPartos, prepararDatosPotreros,
  generarPDFTratamientos, generarExcelTratamientos, prepararDatosTratamientos,
  prepararDatosIEP, generarPDFIEP, generarExcelIEP
} from "../reportes";
import { TIPOS_EVENTO } from "../catalogoEventos";

// Paletas de Colores Dinámicas
const COLORES_INVENTARIO = ["#3b82f6", "#8b5cf6", "#ec4899", "#f43f5e", "#f59e0b", "#10b981"];
const COLORES_FINANZAS = ["#059669", "#111827", "#34d399", "#fbbf24", "#d97706", "#dc2626"];

export default function ReportesBI({ usuario }) {
  const [animales, setAnimales] = useState([]);
  const [eventos, setEventos] = useState([]);
  const [alertas, setAlertas] = useState([]);
  const [config, setConfig] = useState(null);
  const [potreros, setPotreros] = useState([]);
  const [eventosPotreros, setEventosPotreros] = useState([]);
  const [lecheIndividual, setLecheIndividual] = useState([]);

  // Filtros extra para Reporte de Tratamientos
  const [filtroOrigenTrat, setFiltroOrigenTrat] = useState("ambos");
  const [filtroTipoTrat, setFiltroTipoTrat] = useState("");

  // Slicers
  const [filtroCategoria, setFiltroCategoria] = useState("Todas");
  const [filtroAlerta, setFiltroAlerta] = useState("Todas");
  const [filtroGenero, setFiltroGenero] = useState("Todos");
  
  // Toggle Financiero
  const [vistaFinanciera, setVistaFinanciera] = useState(false);
  
  // Modal Info KPIs
  const [infoKpi, setInfoKpi] = useState(null);
  
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
    if (!usuario?.ranchoId) return;
    const unsubAnimales = onSnapshot(query(collection(db, "animales"), where("ranchoId", "==", usuario.ranchoId)), snap => {
      setAnimales(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });
    
    // Optimizacion MVP: Cargar médicos directos.
    const unsubEventos = onSnapshot(query(collection(db, "eventos"), where("ranchoId", "==", usuario.ranchoId)), snap => {
      setEventos(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubConfig = onSnapshot(doc(db, "configuracion", `financiera_${usuario.ranchoId}`), snap => {
      if(snap.exists()) setConfig(snap.data());
    });

    const unsubAlertas = onSnapshot(query(collection(db, "alertas"), where("ranchoId", "==", usuario.ranchoId)), snap => {
      setAlertas(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubPotreros = onSnapshot(query(collection(db, "potreros"), where("ranchoId", "==", usuario.ranchoId)), snap => {
      setPotreros(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubEventosPotreros = onSnapshot(query(collection(db, "eventosPotreros"), where("ranchoId", "==", usuario.ranchoId)), snap => {
      setEventosPotreros(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    const unsubLeche = onSnapshot(query(collection(db, "produccion_leche_individual"), where("ranchoId", "==", usuario.ranchoId)), snap => {
      setLecheIndividual(snap.docs.map(d => ({ id: d.id, ...d.data() })));
    });

    return () => { unsubAnimales(); unsubEventos(); unsubConfig(); unsubAlertas(); unsubPotreros(); unsubEventosPotreros(); unsubLeche(); };
  }, [usuario]);

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
  
  const vientresTotales = inventarioEnriquecido.filter(a => a.tipo === "Vaca" || a.tipo === "Novillona").length;
  const vientresInfertiles = inventarioEnriquecido.filter(a => a.estado === "Alerta: Revisión de Fertilidad").length;
  const porcentajeInfertilidad = vientresTotales > 0 ? Math.round((vientresInfertiles / vientresTotales) * 100) : 0;

  // --- NUEVAS MÉTRICAS ---
  const totalVientres = inventarioEnriquecido.filter(a => a.tipo === "Vaca" || a.tipo === "Novillona").length;
  const vientresGestantes = inventarioEnriquecido.filter(a => (a.tipo === "Vaca" || a.tipo === "Novillona") && a.estado === "Gestante").length;
  const tasaPrenez = totalVientres > 0 ? Math.round((vientresGestantes / totalVientres) * 100) : 0;

  const metricas = calcularMetricasProductividad(animales, eventos);
  const muertesCount = metricas.mortalidad.conteoM_D + metricas.mortalidad.conteoM_V;
  const baseBajas = cabezasTotales + muertesCount; // Aproximación al inventario anual
  const tasaBajasGeneral = baseBajas > 0 ? ((muertesCount / baseBajas) * 100).toFixed(1) : 0;

  const totalHectareas = potreros.reduce((sum, p) => sum + (parseFloat(p.hectareas) || 0), 0);
  const cargaAnimalGlobal = totalHectareas > 0 ? (cabezasTotales / totalHectareas).toFixed(1) : 0;

  const dataProyeccion = prepararDatosProyeccionPartos(animales, eventos);
  const avgIEP = dataProyeccion.stats.avgIEP;

  const edadPrimerParto = metricas.edadPrimerParto;
  const gdpPromedio = metricas.gdp.m_12m !== "0.000" ? metricas.gdp.m_12m : (metricas.gdp.h_12m !== "0.000" ? metricas.gdp.h_12m : "--");
  
  const totalAbortos = eventos.filter(e => e.tipo === "Aborto").length;
  const tasaAbortos = totalVientres > 0 ? ((totalAbortos / totalVientres) * 100).toFixed(1) : "0.0";

  let promedioLeche = "0.0";
  if (lecheIndividual && lecheIndividual.length > 0) {
      const sumaLeche = lecheIndividual.reduce((sum, r) => sum + (Number(r.litros) || 0), 0);
      promedioLeche = (sumaLeche / lecheIndividual.length).toFixed(1);
  }

  const procesarGraficaMetrica = () => {
     const distMap = {};
     const razaMap = {};
     const grupoMap = {};
     datosFiltrados.forEach(a => {
        const cat = a.tipo || "Desconocido";
        const rz = a.raza || "Otra";
        const gr = a.grupo || "Sin Asignar";
        const valor = vistaFinanciera ? a.costoTotal : 1;
        distMap[cat] = (distMap[cat] || 0) + valor;
        razaMap[rz] = (razaMap[rz] || 0) + valor;
        grupoMap[gr] = (grupoMap[gr] || 0) + valor;
     });
     return { 
       datosCategoria: Object.keys(distMap).map(k => ({ name: k, value: Math.round(distMap[k]) })),
       datosRazas: Object.keys(razaMap).map(k => ({ name: k, value: Math.round(razaMap[k]) })),
       datosGrupos: Object.keys(grupoMap).map(k => ({ name: k, value: Math.round(grupoMap[k]) }))
     };
  };

    const { datosCategoria, datosRazas, datosGrupos } = procesarGraficaMetrica();
  
  const datosPotrero = (() => {
    const hMap = {};
    const capMap = {};
    potreros.forEach(p => capMap[p.nombre] = p.hectareas || 1);

    animales.forEach(a => {
        if (a.estado?.includes("Baja")) return;
        const h = a.potrero || a.hectarea || "Sin Asignar";
        hMap[h] = (hMap[h] || 0) + 1;
    });

    return Object.keys(hMap).map(k => {
      const cabezas = hMap[k];
      const hectareas = capMap[k] || (k === "Sin Asignar" ? 0 : 1);
      const cabPorHa = hectareas > 0 ? +(cabezas / hectareas).toFixed(2) : 0;
      return { 
        name: k, 
        value: cabezas,
        cabPorHa: cabPorHa
      };
    });
  })();

  const paletaActiva = vistaFinanciera ? COLORES_FINANZAS : COLORES_INVENTARIO;

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
      <Header subtitle="Filtra visualizaciones de conteo de inventario." />

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

        {/* Toggle oculto por peticion del usuario */}
      </div>

      {/* MODAL DE INFORMACIÓN DE KPIS */}
      {infoKpi && (
          <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", backgroundColor: "rgba(0,0,0,0.5)", zIndex: 9999, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}>
              <div style={{ backgroundColor: "white", padding: "24px", borderRadius: "12px", maxWidth: "400px", width: "100%", position: "relative" }}>
                  <button onClick={() => setInfoKpi(null)} style={{ position: "absolute", top: "16px", right: "16px", background: "none", border: "none", cursor: "pointer", color: "#6b7280" }}><X size={20}/></button>
                  <h3 style={{ marginTop: 0, color: "#111827", display: "flex", alignItems: "center", gap: "8px" }}><Info size={20} color="#3b82f6"/> {infoKpi.titulo}</h3>
                  <div style={{ color: "#4b5563", fontSize: "14px", lineHeight: "1.6", marginTop: "12px" }}>
                      <p style={{ margin: "0 0 8px 0" }}><strong>Descripción:</strong> {infoKpi.descripcion}</p>
                      <p style={{ margin: "0" }}><strong>Cálculo:</strong> {infoKpi.calculo}</p>
                  </div>
                  <button onClick={() => setInfoKpi(null)} className="btn-primary" style={{ width: "100%", marginTop: "20px" }}>Entendido</button>
              </div>
          </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "24px" }}>
        
        {/* KPI 1: Volumen */}
        <div style={{ backgroundColor: "white", padding: "16px", borderRadius: "12px", borderLeft: "4px solid #3b82f6", boxShadow: "0 2px 4px rgba(0,0,0,0.05)", position: "relative" }}>
            <button onClick={() => setInfoKpi({titulo: "Volumen Filtrado", descripcion: "Muestra el número total de cabezas de ganado que coinciden con los filtros aplicados arriba.", calculo: "Conteo directo de animales activos en el inventario según categoría, estatus y género."})} style={{ position: "absolute", top: "12px", right: "12px", background: "#f3f4f6", border: "none", cursor: "pointer", color: "#6b7280", padding: "4px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }} title="Ver información del cálculo" onMouseOver={e => e.currentTarget.style.background = "#e5e7eb"} onMouseOut={e => e.currentTarget.style.background = "#f3f4f6"}><Info size={16}/></button>
            <div style={{ color: "#6b7280", fontSize: "12px", fontWeight: "bold", display: "flex", alignItems: "center", gap: "6px" }}><Activity size={16}/> VOLUMEN FILTRADO</div>
            <div style={{ fontSize: "28px", fontWeight: "bold", color: "#111827", marginTop: "8px" }}>{cabezasTotales} <span style={{ fontSize:"14px", color: "#9ca3af"}}>cabezas</span></div>
        </div>

        {/* KPI 2: Tasa de Preñez */}
        <div style={{ backgroundColor: "white", padding: "16px", borderRadius: "12px", borderLeft: "4px solid #10b981", boxShadow: "0 2px 4px rgba(0,0,0,0.05)", position: "relative" }}>
            <button onClick={() => setInfoKpi({titulo: "Tasa de Preñez (Natalidad)", descripcion: "Mide la eficiencia reproductiva del hato, indicando qué proporción de las hembras están preñadas.", calculo: "(Vientres Gestantes / Total de Vientres en el rancho) * 100."})} style={{ position: "absolute", top: "12px", right: "12px", background: "#f3f4f6", border: "none", cursor: "pointer", color: "#6b7280", padding: "4px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }} title="Ver información del cálculo" onMouseOver={e => e.currentTarget.style.background = "#e5e7eb"} onMouseOut={e => e.currentTarget.style.background = "#f3f4f6"}><Info size={16}/></button>
            <div style={{ color: "#6b7280", fontSize: "12px", fontWeight: "bold", display: "flex", alignItems: "center", gap: "6px" }}><TrendingUp size={16}/> TASA DE PREÑEZ</div>
            <div style={{ fontSize: "28px", fontWeight: "bold", color: "#10b981", marginTop: "8px" }}>{tasaPrenez}%</div>
            <div style={{ fontSize: "11px", color: "#6b7280", marginTop: "4px" }}>{vientresGestantes} de {totalVientres} vientres gestantes</div>
        </div>

        {/* KPI: IEP - Intervalo Entre Partos */}
        <div style={{ backgroundColor: "white", padding: "16px", borderRadius: "12px", borderLeft: "4px solid #c026d3", boxShadow: "0 2px 4px rgba(0,0,0,0.05)", position: "relative" }}>
            <button onClick={() => setInfoKpi({titulo: "Intervalo Entre Partos (IEP)", descripcion: "Promedio de días transcurridos entre dos partos consecutivos de la misma vaca. Es el indicador de oro de la eficiencia reproductiva.", calculo: "Suma de días entre partos / Conteo de intervalos válidos (365-410 días es la meta)."})} style={{ position: "absolute", top: "12px", right: "12px", background: "#f3f4f6", border: "none", cursor: "pointer", color: "#6b7280", padding: "4px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }} title="Ver información del cálculo" onMouseOver={e => e.currentTarget.style.background = "#e5e7eb"} onMouseOut={e => e.currentTarget.style.background = "#f3f4f6"}><Info size={16}/></button>
            <div style={{ color: "#6b7280", fontSize: "12px", fontWeight: "bold", display: "flex", alignItems: "center", gap: "6px" }}><Activity size={16}/> INT. ENTRE PARTOS</div>
            <div style={{ fontSize: "28px", fontWeight: "bold", color: "#c026d3", marginTop: "8px" }}>{avgIEP || "--"} <span style={{ fontSize: "14px", color: "#9ca3af" }}>días</span></div>
            <div style={{ fontSize: "11px", color: "#6b7280", marginTop: "4px" }}>Eficiencia reproductiva del hato</div>
        </div>

        {/* KPI 3: Tasa de Infertilidad */}
        <div style={{ backgroundColor: "white", padding: "16px", borderRadius: "12px", borderLeft: "4px solid #ef4444", boxShadow: "0 2px 4px rgba(0,0,0,0.05)", position: "relative" }}>
            <button onClick={() => setInfoKpi({titulo: "Tasa de Infertilidad", descripcion: "Identifica la proporción de vientres con posible infertilidad debido a su edad avanzada sin reportar crías.", calculo: "(Vientres ≥ 48m de edad sin parto / Total de Vientres) * 100."})} style={{ position: "absolute", top: "12px", right: "12px", background: "#f3f4f6", border: "none", cursor: "pointer", color: "#6b7280", padding: "4px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }} title="Ver información del cálculo" onMouseOver={e => e.currentTarget.style.background = "#e5e7eb"} onMouseOut={e => e.currentTarget.style.background = "#f3f4f6"}><Info size={16}/></button>
            <div style={{ color: "#6b7280", fontSize: "12px", fontWeight: "bold", display: "flex", alignItems: "center", gap: "6px" }}><AlertTriangle size={16}/> TASA DE INFERTILIDAD</div>
            <div style={{ fontSize: "28px", fontWeight: "bold", color: "#ef4444", marginTop: "8px" }}>{porcentajeInfertilidad}%</div>
            <div style={{ fontSize: "11px", color: "#6b7280", marginTop: "4px" }}>Vientres ≥ 48m sin parto ({vientresInfertiles})</div>
        </div>

        {/* KPI 4: Bajas Generales */}
        <div style={{ backgroundColor: "white", padding: "16px", borderRadius: "12px", borderLeft: "4px solid #f97316", boxShadow: "0 2px 4px rgba(0,0,0,0.05)", position: "relative" }}>
            <button onClick={() => setInfoKpi({titulo: "Índice de Bajas Totales", descripcion: "Evalúa las bajas totales del rancho por venta, muerte o robo. Mantener este número bajo es vital para la rentabilidad.", calculo: "(Cabezas dadas de baja / Inventario base estimado) * 100."})} style={{ position: "absolute", top: "12px", right: "12px", background: "#f3f4f6", border: "none", cursor: "pointer", color: "#6b7280", padding: "4px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }} title="Ver información del cálculo" onMouseOver={e => e.currentTarget.style.background = "#e5e7eb"} onMouseOut={e => e.currentTarget.style.background = "#f3f4f6"}><Info size={16}/></button>
            <div style={{ color: "#6b7280", fontSize: "12px", fontWeight: "bold", display: "flex", alignItems: "center", gap: "6px" }}><Activity size={16}/> ÍNDICE DE BAJAS</div>
            <div style={{ fontSize: "28px", fontWeight: "bold", color: "#f97316", marginTop: "8px" }}>{tasaBajasGeneral}%</div>
            <div style={{ fontSize: "11px", color: "#6b7280", marginTop: "4px" }}>{muertesCount} bajas registradas</div>
        </div>

        {/* KPI 5: Carga Animal */}
        <div style={{ backgroundColor: "white", padding: "16px", borderRadius: "12px", borderLeft: "4px solid #8b5cf6", boxShadow: "0 2px 4px rgba(0,0,0,0.05)", position: "relative" }}>
            <button onClick={() => setInfoKpi({titulo: "Carga Animal (Promedio)", descripcion: "Indica cuántos animales tienes pastando en promedio por cada hectárea de tu rancho.", calculo: "Total de Cabezas / Total de Hectáreas en los potreros."})} style={{ position: "absolute", top: "12px", right: "12px", background: "#f3f4f6", border: "none", cursor: "pointer", color: "#6b7280", padding: "4px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }} title="Ver información del cálculo" onMouseOver={e => e.currentTarget.style.background = "#e5e7eb"} onMouseOut={e => e.currentTarget.style.background = "#f3f4f6"}><Info size={16}/></button>
            <div style={{ color: "#6b7280", fontSize: "12px", fontWeight: "bold", display: "flex", alignItems: "center", gap: "6px" }}><Activity size={16}/> CARGA ANIMAL</div>
            <div style={{ fontSize: "28px", fontWeight: "bold", color: "#8b5cf6", marginTop: "8px" }}>{cargaAnimalGlobal}</div>
            <div style={{ fontSize: "11px", color: "#6b7280", marginTop: "4px" }}>Cabezas por hectárea</div>
        </div>

        {/* KPI 6: Desecho */}
        <div style={{ backgroundColor: "white", padding: "16px", borderRadius: "12px", borderLeft: "4px solid #eab308", boxShadow: "0 2px 4px rgba(0,0,0,0.05)", position: "relative" }}>
            <button onClick={() => setInfoKpi({titulo: "Tasa de Desecho (Culling)", descripcion: "Mide el porcentaje de vientres improductivos que fueron retirados o vendidos.", calculo: "(Ventas por Desecho / Total de Vacas actuales) * 100."})} style={{ position: "absolute", top: "12px", right: "12px", background: "#f3f4f6", border: "none", cursor: "pointer", color: "#6b7280", padding: "4px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }} title="Ver información del cálculo" onMouseOver={e => e.currentTarget.style.background = "#e5e7eb"} onMouseOut={e => e.currentTarget.style.background = "#f3f4f6"}><Info size={16}/></button>
            <div style={{ color: "#6b7280", fontSize: "12px", fontWeight: "bold", display: "flex", alignItems: "center", gap: "6px" }}><Archive size={16}/> TASA DE DESECHO</div>
            <div style={{ fontSize: "28px", fontWeight: "bold", color: "#eab308", marginTop: "8px" }}>{metricas.desecho}%</div>
            <div style={{ fontSize: "11px", color: "#6b7280", marginTop: "4px" }}>{metricas.conteoDesecho} vacas de desecho</div>
        </div>

        {/* KPI 7: Edad al Primer Parto */}
        <div style={{ backgroundColor: "white", padding: "16px", borderRadius: "12px", borderLeft: "4px solid #14b8a6", boxShadow: "0 2px 4px rgba(0,0,0,0.05)", position: "relative" }}>
            <button onClick={() => setInfoKpi({titulo: "Edad al Primer Parto", descripcion: "Promedio de meses que tardan las hembras desde que nacen hasta que tienen su primera cría.", calculo: "Promedio de edad (meses) en la fecha del primer evento de parto registrado por vientre."})} style={{ position: "absolute", top: "12px", right: "12px", background: "#f3f4f6", border: "none", cursor: "pointer", color: "#6b7280", padding: "4px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }} title="Ver información del cálculo" onMouseOver={e => e.currentTarget.style.background = "#e5e7eb"} onMouseOut={e => e.currentTarget.style.background = "#f3f4f6"}><Info size={16}/></button>
            <div style={{ color: "#6b7280", fontSize: "12px", fontWeight: "bold", display: "flex", alignItems: "center", gap: "6px" }}><Activity size={16}/> EDAD PRIMER PARTO</div>
            <div style={{ fontSize: "28px", fontWeight: "bold", color: "#14b8a6", marginTop: "8px" }}>{edadPrimerParto}</div>
            <div style={{ fontSize: "11px", color: "#6b7280", marginTop: "4px" }}>Meses (promedio)</div>
        </div>


        {/* KPI 9: Producción de Leche (Promedio Individual) */}
        <div style={{ backgroundColor: "white", padding: "16px", borderRadius: "12px", borderLeft: "4px solid #8b5cf6", boxShadow: "0 2px 4px rgba(0,0,0,0.05)", position: "relative" }}>
            <button onClick={() => setInfoKpi({titulo: "Promedio Leche Individual", descripcion: "Promedio de litros de leche producidos por vaca según los registros individuales.", calculo: "Suma de litros individuales / Número de registros individuales."})} style={{ position: "absolute", top: "12px", right: "12px", background: "#f3f4f6", border: "none", cursor: "pointer", color: "#6b7280", padding: "4px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }} title="Ver información del cálculo" onMouseOver={e => e.currentTarget.style.background = "#e5e7eb"} onMouseOut={e => e.currentTarget.style.background = "#f3f4f6"}><Info size={16}/></button>
            <div style={{ color: "#6b7280", fontSize: "12px", fontWeight: "bold", display: "flex", alignItems: "center", gap: "6px" }}><Activity size={16}/> PROM. LECHE/VACA</div>
            <div style={{ fontSize: "28px", fontWeight: "bold", color: "#8b5cf6", marginTop: "8px" }}>{promedioLeche}</div>
            <div style={{ fontSize: "11px", color: "#6b7280", marginTop: "4px" }}>Litros (histórico)</div>
        </div>

        {/* KPI 10: Tasa de Abortos */}
        <div style={{ backgroundColor: "white", padding: "16px", borderRadius: "12px", borderLeft: "4px solid #ef4444", boxShadow: "0 2px 4px rgba(0,0,0,0.05)", position: "relative" }}>
            <button onClick={() => setInfoKpi({titulo: "Tasa de Abortos", descripcion: "Proporción de abortos registrados frente al total de vientres en el rancho.", calculo: "(Total de eventos Aborto / Total de Vientres) * 100."})} style={{ position: "absolute", top: "12px", right: "12px", background: "#f3f4f6", border: "none", cursor: "pointer", color: "#6b7280", padding: "4px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }} title="Ver información del cálculo" onMouseOver={e => e.currentTarget.style.background = "#e5e7eb"} onMouseOut={e => e.currentTarget.style.background = "#f3f4f6"}><Info size={16}/></button>
            <div style={{ color: "#6b7280", fontSize: "12px", fontWeight: "bold", display: "flex", alignItems: "center", gap: "6px" }}><AlertTriangle size={16}/> TASA DE ABORTOS</div>
            <div style={{ fontSize: "28px", fontWeight: "bold", color: "#ef4444", marginTop: "8px" }}>{tasaAbortos}%</div>
            <div style={{ fontSize: "11px", color: "#6b7280", marginTop: "4px" }}>{totalAbortos} aborto(s) registrado(s)</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(380px, 1fr))", gap: "24px" }}>
        <div style={{ backgroundColor: "white", borderRadius: "12px", padding: "24px", boxShadow: "0 2px 4px rgba(0,0,0,0.05)" }}>
          <h3 style={{ marginTop: 0, color: "#374151" }}>Agrupación por Categoría {vistaFinanciera ? "($ Invest)" : "(Cabezas)"}</h3>
          <div style={{ height: "300px", width: "100%", marginTop: "20px" }}>
            <ResponsiveContainer>
              <PieChart margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                <Pie 
                  data={datosCategoria} 
                  cx="50%" cy="50%" 
                  innerRadius={50} outerRadius={70} 
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
        {/* Gráfica Rendimiento por Genética eliminada a petición del usuario. (Solo se mantiene en reporte estático). */}
        {/* NUEVO GRÁFICO: DISTRIBUCIÓN POR POTRERO */}
        <div style={{ backgroundColor: "white", borderRadius: "12px", padding: "24px", boxShadow: "0 2px 4px rgba(0,0,0,0.05)" }}>
          <h3 style={{ marginTop: 0, color: "#374151" }}>Inventario por Potrero (Cabezas Totales)</h3>
          <div style={{ height: "300px", width: "100%", marginTop: "20px" }}>
            <ResponsiveContainer>
              <BarChart data={datosPotrero} margin={{ top: 30, right: 30, left: 0, bottom: 25 }}>
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

        {/* NUEVO GRÁFICO: AGRUPACIÓN POR GRUPO */}
        {datosGrupos.length > 0 && (
          <div style={{ backgroundColor: "white", borderRadius: "12px", padding: "24px", boxShadow: "0 2px 4px rgba(0,0,0,0.05)" }}>
            <h3 style={{ marginTop: 0, color: "#374151" }}>Agrupación por Grupo (Cabezas)</h3>
            <div style={{ height: "300px", width: "100%", marginTop: "20px" }}>
              <ResponsiveContainer>
                <PieChart margin={{ top: 10, right: 10, left: 10, bottom: 10 }}>
                  <Pie 
                    data={datosGrupos} 
                    cx="50%" cy="50%" 
                    innerRadius={50} outerRadius={70} 
                    paddingAngle={5} dataKey="value"
                    label={({ name, value }) => `${name}: ${value}`}
                  >
                    {datosGrupos.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={paletaActiva[(index + 2) % paletaActiva.length]} />
                    ))}
                  </Pie>
                  <RTTooltip formatter={(value) => `${value} ud.` } />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        )}
        
        {/* NUEVO GRÁFICO: CARGA ANIMAL POR POTRERO */}
        <div style={{ backgroundColor: "white", borderRadius: "12px", padding: "24px", boxShadow: "0 2px 4px rgba(0,0,0,0.05)" }}>
          <h3 style={{ marginTop: 0, color: "#374151" }}>Carga Animal (cab/ha)</h3>
          <div style={{ height: "300px", width: "100%", marginTop: "20px" }}>
            <ResponsiveContainer>
              <BarChart data={datosPotrero} margin={{ top: 30, right: 30, left: 0, bottom: 25 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" />
                <YAxis allowDecimals={true} />
                <RTTooltip cursor={{fill: 'transparent'}} formatter={(val) => `${val} cab/ha`} />
                <Bar dataKey="cabPorHa" fill="#f59e0b" radius={[4, 4, 0, 0]}>
                   <LabelList dataKey="cabPorHa" position="top" style={{ fill: "#b45309", fontWeight: "bold" }} />
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
                    <option value="reproduccion">📊 Resumen de Palpaciones</option>
                    <option value="proyeccion">📅 Proyección de Partos</option>
                    <option value="iep">🟣 Detalle de Intervalo Entre Partos (IEP)</option>

                    <option value="calendario">📅 Reporte de Movimientos</option>
                    <option value="tratamientos">💊 Reporte de Tratamientos</option>
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
                    {reporteAvanzado === "tratamientos" && (
                        <>
                            <div className="input-group" style={{ margin: 0 }}>
                                <label style={{ fontSize: "11px" }}>Filtrar por</label>
                                <select value={filtroOrigenTrat} onChange={(e) => setFiltroOrigenTrat(e.target.value)} style={{ padding: "7px", borderRadius: "6px", border: "1px solid #d1d5db" }}>
                                    <option value="ambos">Mi Ganado + Mi Rancho</option>
                                    <option value="ganado">Solo Mi Ganado</option>
                                    <option value="rancho">Solo Mi Rancho</option>
                                </select>
                            </div>
                            <div className="input-group" style={{ margin: 0 }}>
                                <label style={{ fontSize: "11px" }}>Tipo de Actividad</label>
                                <select value={filtroTipoTrat} onChange={(e) => setFiltroTipoTrat(e.target.value)} style={{ padding: "7px", borderRadius: "6px", border: "1px solid #d1d5db" }}>
                                    <option value="">Todos los tipos</option>
                                    {TIPOS_EVENTO.map(t => <option key={t} value={t}>{t}</option>)}
                                </select>
                            </div>
                        </>
                    )}
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
                                const f = filtrosActuales;
                                if (reporteAvanzado === "vientres") generarPDFVientres(animales, eventos, config, f);
                                else if (reporteAvanzado === "reproduccion") generarPDFReproduccion(eventos, f);
                                else if (reporteAvanzado === "proyeccion") generarPDFProyeccionPartos(animales, eventos, f);
                                else if (reporteAvanzado === "iep") generarPDFIEP(animales, eventos);
                                else if (reporteAvanzado === "potreros") generarPDFPotreros(animales, potreros, f);
                                else if (reporteAvanzado === "desarrollo") generarPDFDesarrollo(animales, eventos, f);
                                else if (reporteAvanzado === "calendario") generarPDFCalendario(animales, eventos, alertas, f);
                                else if (reporteAvanzado === "tratamientos") generarPDFTratamientos(animales, eventos, eventosPotreros, { ...f, origen: filtroOrigenTrat, tipoEvento: filtroTipoTrat });
                            }}
                        >
                            <Download size={16} /> PDF
                        </button>
                        <button className="btn-outline" style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "13px", borderColor: "var(--verde-claro)", color: "var(--verde-medio)" }}
                            onClick={() => {
                                const f = filtrosActuales;
                                if (reporteAvanzado === "vientres") generarExcelVientres(animales, eventos, config, f);
                                else if (reporteAvanzado === "reproduccion") generarExcelReproduccion(eventos, f);
                                else if (reporteAvanzado === "proyeccion") generarExcelProyeccionPartos(animales, eventos, f);
                                else if (reporteAvanzado === "iep") generarExcelIEP(animales, eventos);
                                else if (reporteAvanzado === "potreros") generarExcelPotreros(animales, potreros, f);
                                else if (reporteAvanzado === "desarrollo") generarExcelDesarrollo(animales, eventos, f);
                                else if (reporteAvanzado === "calendario") generarExcelCalendario(animales, eventos, alertas, f);
                                else if (reporteAvanzado === "tratamientos") generarExcelTratamientos(animales, eventos, eventosPotreros, { ...f, origen: filtroOrigenTrat, tipoEvento: filtroTipoTrat });
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
                            {reporteAvanzado === "vientres" && <tr><th style={{padding:"8px"}}>Arete</th><th style={{padding:"8px"}}>Arete Rancho</th><th style={{padding:"8px"}}>Nombre</th><th style={{padding:"8px"}}>Categoría</th><th style={{padding:"8px"}}>Partos</th><th style={{padding:"8px"}}>Último Evento</th></tr>}
                            {reporteAvanzado === "reproduccion" && <tr><th style={{padding:"8px"}}>Mes</th><th style={{padding:"8px"}}>Palpadas</th><th style={{padding:"8px"}}>Gestantes</th><th style={{padding:"8px"}}>Anestro</th><th style={{padding:"8px"}}>% Preñez</th></tr>}
                            {reporteAvanzado === "proyeccion" && <tr><th style={{padding:"8px"}}>Mes Proyectado</th><th style={{padding:"8px"}}>Partos Esperados</th><th style={{padding:"8px"}}>Aretes</th></tr>}
                            {reporteAvanzado === "iep" && <tr><th style={{padding:"8px"}}>Arete</th><th style={{padding:"8px"}}>Tipo</th><th style={{padding:"8px"}}>Penúltimo Parto</th><th style={{padding:"8px"}}>Último Parto</th><th style={{padding:"8px"}}>Días Abiertos</th><th style={{padding:"8px"}}>IEP (Días)</th><th style={{padding:"8px"}}>IEP (Meses)</th><th style={{padding:"8px"}}>Clasificación</th></tr>}
                            {reporteAvanzado === "potreros" && <tr><th style={{padding:"8px"}}>Potrero</th><th style={{padding:"8px"}}>Carga (Cab/Ha)</th><th style={{padding:"8px"}}>Biomasa Total</th><th style={{padding:"8px"}}>Prod (Kg/Ha)</th></tr>}
                            {reporteAvanzado === "desarrollo" && <tr><th style={{padding:"8px"}}>Categoría</th><th style={{padding:"8px"}}>Cantidad</th><th style={{padding:"8px"}}>GDP Promedio</th><th style={{padding:"8px"}}>Días Período</th></tr>}
                            {reporteAvanzado === "calendario" && <tr><th style={{padding:"8px"}}>Categoría</th><th style={{padding:"8px"}}>Mes Actual</th><th style={{padding:"8px"}}>Actividades Realizadas</th></tr>}
                            {reporteAvanzado === "tratamientos" && <tr><th style={{padding:"8px"}}>Sección</th><th style={{padding:"8px"}}>Fecha</th><th style={{padding:"8px"}}>Tipo</th><th style={{padding:"8px"}}>Resultado / Insumo</th><th style={{padding:"8px"}}>Animal / Potrero</th><th style={{padding:"8px"}}>Arete</th><th style={{padding:"8px"}}>Costo ($)</th></tr>}
                        </thead>
                        <tbody>
                            {reporteAvanzado === "vientres" && prepararDatosVientres(animales, eventos, config, filtrosActuales).slice(0, 10).map((d, i) => (
                                <tr key={i} style={{ borderBottom: "1px solid #e5e7eb" }}><td style={{padding:"8px"}}>{d.arete}</td><td style={{padding:"8px"}}>{d.areteRancho}</td><td style={{padding:"8px"}}>{d.nombre}</td><td style={{padding:"8px"}}>{d.tipo}</td><td style={{padding:"8px"}}>{d.numPartos}</td><td style={{padding:"8px"}}>{d.ultimoEvento.substring(0, 25)}</td></tr>
                            ))}
                            {reporteAvanzado === "reproduccion" && prepararDatosReproduccion(eventos, filtrosActuales).slice(0, 10).map((d, i) => (
                                <tr key={i} style={{ borderBottom: "1px solid #e5e7eb" }}><td style={{padding:"8px",fontWeight:"bold"}}>{d.label}</td><td style={{padding:"8px"}}>{d.palpadas}</td><td style={{padding:"8px"}}>{d.gestantes}</td><td style={{padding:"8px"}}>{d.anestro}</td><td style={{padding:"8px",color:"#166534"}}>{d.porcentaje}</td></tr>
                            ))}
                            {reporteAvanzado === "proyeccion" && prepararDatosProyeccionPartos(animales, eventos, filtrosActuales).proyeccion.slice(0, 8).map((d, i) => (
                                <tr key={i} style={{ borderBottom: "1px solid #e5e7eb" }}><td style={{padding:"8px"}}>{d.label}</td><td style={{padding:"8px",fontWeight:"bold",color:d.conteo>0?"#166534":"#9ca3af"}}>{d.conteo}</td><td style={{padding:"8px"}}>{d.detalles.join(", ")||"---"}</td></tr>
                            ))}
                            {reporteAvanzado === "iep" && prepararDatosIEP(animales, eventos).slice(0, 10).map((d, i) => (
                                <tr key={i} style={{ borderBottom: "1px solid #e5e7eb", backgroundColor: d.clasificacion === "Mejorar" ? "#fef2f2" : d.clasificacion === "Excelente" ? "#f0fdf4" : "white" }}>
                                    <td style={{padding:"8px",fontWeight:"bold"}}>{d.arete}</td>
                                    <td style={{padding:"8px"}}>{d.tipo}</td>
                                    <td style={{padding:"8px",color:"#6b7280"}}>{d.penultimoParto}</td>
                                    <td style={{padding:"8px",color:"#6b7280"}}>{d.ultimoParto}</td>
                                    <td style={{padding:"8px"}}>{d.diasAbiertos} d</td>
                                    <td style={{padding:"8px",fontWeight:"bold",color:"#7c3aed"}}>{d.iepDias}</td>
                                    <td style={{padding:"8px"}}>{d.iepMeses}</td>
                                    <td style={{padding:"8px",fontWeight:"bold",color: d.clasificacion === "Excelente" ? "#166534" : d.clasificacion === "Mejorar" ? "#b91c1c" : "#92400e"}}>{d.clasificacion}</td>
                                </tr>
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
                            {reporteAvanzado === "tratamientos" && prepararDatosTratamientos(animales, eventos, eventosPotreros, { ...filtrosActuales, origen: filtroOrigenTrat, tipoEvento: filtroTipoTrat }).filas.slice(0, 10).map((d, i) => (
                                <tr key={i} style={{ borderBottom: "1px solid #e5e7eb" }}>
                                    <td style={{padding:"8px",fontWeight:"bold",color: d.seccion === "Mi Rancho" ? "#92400e" : "#166534"}}>{d.seccion}</td>
                                    <td style={{padding:"8px"}}>{d.fecha}</td>
                                    <td style={{padding:"8px"}}>{d.tipo}</td>
                                    <td style={{padding:"8px"}}>{d.resultado}</td>
                                    <td style={{padding:"8px"}}>{d.entidad}</td>
                                    <td style={{padding:"8px"}}>{d.arete}</td>
                                    <td style={{padding:"8px",textAlign:"right"}}>${d.costo.toLocaleString()}</td>
                                </tr>
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

                    <option value="mort_dev">3. % Bajas en Desarrollo</option>
                    <option value="mort_vac">4. % Bajas en Vacas</option>
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
                            <h4 style={{ margin: 0, color: "#991b1b" }}>% Bajas en Desarrollo</h4>
                            <div style={{ fontSize: "32px", fontWeight: "bold", marginTop: "10px", color: "#dc2626" }}>{metricas.mortalidad.desarrollo}%</div>
                            <p style={{ fontSize: "11px", color: "#6b7280", marginTop: "5px" }}>{metricas.mortalidad.conteoM_D} bajas registradas.</p>
                        </div>
                    )}

                    {reporteProd === "mort_vac" && (
                        <div>
                            <h4 style={{ margin: 0, color: "#991b1b" }}>% Bajas en Vacas</h4>
                            <div style={{ fontSize: "32px", fontWeight: "bold", marginTop: "10px", color: "#dc2626" }}>{metricas.mortalidad.vacas}%</div>
                            <p style={{ fontSize: "11px", color: "#6b7280", marginTop: "5px" }}>{metricas.mortalidad.conteoM_V} bajas registradas.</p>
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
