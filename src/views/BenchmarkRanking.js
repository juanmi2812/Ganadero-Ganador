import React, { useState, useEffect } from "react";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import Header from "../components/Header";
import { Trophy, TrendingUp, AlertTriangle, Activity, Map, BarChart2, Medal } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

const calcularPosicion = (valor, arrayRankings, inverso) => {
  if (!arrayRankings || arrayRankings.length === 0) return { posicion: 1, total: 1 };
  let pos = 1;
  for (let i = 0; i < arrayRankings.length; i++) {
    if (inverso) {
      if (valor > arrayRankings[i]) pos++; // Mortalidad (menor es mejor)
    } else {
      if (valor < arrayRankings[i]) pos++; // Preñez y GDP (mayor es mejor)
    }
  }
  return { posicion: pos, total: arrayRankings.length };
};

const RendimientoCard = ({ titulo, miValor, promedio, formato, inverso, arrayRankings }) => {
  const diff = miValor - promedio;
  // Si inverso es true (como mortalidad), un diff negativo es bueno.
  const isMejor = inverso ? diff <= 0 : diff >= 0;
  
  const { posicion, total } = calcularPosicion(miValor, arrayRankings, inverso);
  let colorMedalla = "#9ca3af"; // gris
  if (posicion === 1) colorMedalla = "#fbbf24"; // oro
  else if (posicion === 2) colorMedalla = "#94a3b8"; // plata
  else if (posicion === 3) colorMedalla = "#b45309"; // bronce

  return (
    <div style={{ background: "#fff", border: "1px solid #e5e7eb", borderRadius: "12px", padding: "20px", boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
      <h4 style={{ margin: "0 0 15px", color: "#4b5563", fontSize: "14px", textTransform: "uppercase", letterSpacing: "0.5px", textAlign: "center" }}>
        {titulo}
      </h4>
      
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ textAlign: "center", flex: 1 }}>
          <p style={{ margin: "0 0 5px", fontSize: "12px", color: "#6b7280" }}>Mi Rancho</p>
          <p style={{ margin: 0, fontSize: "24px", fontWeight: "bold", color: "#1f2937" }}>
            {miValor.toFixed(2)}{formato}
          </p>
        </div>

        <div style={{ padding: "0 15px", display: "flex", flexDirection: "column", alignItems: "center" }}>
          <div style={{ 
            display: "inline-flex", alignItems: "center", gap: "4px", padding: "4px 10px", borderRadius: "20px", fontSize: "12px", fontWeight: "bold",
            backgroundColor: isMejor ? "#dcfce7" : "#fee2e2", color: isMejor ? "#16a34a" : "#dc2626"
          }}>
            <Trophy size={14} /> {isMejor ? "¡Superior!" : "Por debajo"}
          </div>
          {arrayRankings && (
            <div style={{ marginTop: "10px", display: "flex", alignItems: "center", gap: "4px", color: colorMedalla, fontWeight: "bold", fontSize: "13px" }}>
              <Medal size={16}/> Lugar {posicion} de {total}
            </div>
          )}
        </div>

        <div style={{ textAlign: "center", flex: 1 }}>
          <p style={{ margin: "0 0 5px", fontSize: "12px", color: "#6b7280" }}>Promedio</p>
          <p style={{ margin: 0, fontSize: "24px", fontWeight: "bold", color: "#4b5563" }}>
            {promedio.toFixed(2)}{formato}
          </p>
        </div>
      </div>
    </div>
  );
};

export default function BenchmarkRanking({ usuario }) {
  const [rancho, setRancho] = useState(null);
  const [benchmarks, setBenchmarks] = useState(null);
  const [cargando, setCargando] = useState(true);

  const [miMortalidad, setMiMortalidad] = useState(0);
  const [miGdp, setMiGdp] = useState(0);
  const [miPrenez, setMiPrenez] = useState(0);

  const [kpiSeleccionado, setKpiSeleccionado] = useState("mortalidad");

  useEffect(() => {
    const cargarDatos = async () => {
      if (!usuario?.ranchoId) return;

      try {
        const rSnap = await getDoc(doc(db, "ranchos", usuario.ranchoId));
        let rData = null;
        if (rSnap.exists()) rData = rSnap.data();
        setRancho(rData);

        const bSnap = await getDoc(doc(db, "benchmarks", "ultimo"));
        if (bSnap.exists()) setBenchmarks(bSnap.data());

        const animalesQ = query(collection(db, "animales"), where("ranchoId", "==", usuario.ranchoId));
        const animalesSnap = await getDocs(animalesQ);
        const animales = animalesSnap.docs.map(d => ({ ...d.data(), id: d.id }));

        const eventosQ = query(collection(db, "eventos"), where("ranchoId", "==", usuario.ranchoId), where("tipo", "==", "Repeso"));
        const eventosSnap = await getDocs(eventosQ);
        const repesosPorAnimal = {};
        eventosSnap.forEach(doc => {
          const e = doc.data();
          if (!e.animalId) return;
          if (!repesosPorAnimal[e.animalId]) repesosPorAnimal[e.animalId] = [];
          repesosPorAnimal[e.animalId].push({
            peso: parseFloat(e.resultado?.toString().replace(/[^0-9.]/g, '')) || 0,
            fecha: new Date(e.fecha + "T00:00:00")
          });
        });
        
        const totalCabezas = animales.length;
        if (totalCabezas > 0) {
            const bajasMuerte = animales.filter(a => a.estado === "Baja - Muerte").length;
            setMiMortalidad((bajasMuerte / totalCabezas) * 100);

            const vientres = animales.filter(a => a.tipo === "Vaca" || a.tipo === "Novillona").length;
            const vientresGestantes = animales.filter(a => a.estado === "Gestante").length;
            if (vientres > 0) setMiPrenez((vientresGestantes / vientres) * 100);

            let sumaGdp = 0;
            let countGdp = 0;
            animales.forEach(a => {
              const repesos = repesosPorAnimal[a.id] || [];
              if (repesos.length > 0) {
                repesos.sort((x, y) => y.fecha - x.fecha);
                const pesoInicial = parseFloat(a.peso?.toString().replace(/[^0-9.]/g, '')) || 0;
                let gdp = 0;
                if (repesos.length > 1) {
                  const ganancia = repesos[0].peso - repesos[1].peso;
                  const diff = Math.abs(repesos[0].fecha - repesos[1].fecha);
                  const dias = Math.ceil(diff / (1000 * 60 * 60 * 24)) || 1;
                  gdp = ganancia / dias;
                } else {
                  const fechaInic = new Date((a.fechaNacimiento || a.fechaRegistro || new Date().toISOString().split('T')[0]) + "T00:00:00");
                  const ganancia = repesos[0].peso - pesoInicial;
                  const diff = Math.abs(repesos[0].fecha - fechaInic);
                  const dias = Math.ceil(diff / (1000 * 60 * 60 * 24)) || 1;
                  gdp = ganancia / dias;
                }
                if (gdp > 0 && gdp < 5) {
                  sumaGdp += gdp;
                  countGdp++;
                }
              }
            });
            if (countGdp > 0) setMiGdp(sumaGdp / countGdp);
        }

        setCargando(false);
      } catch (e) {
        console.error("Error al cargar benchmark:", e);
        setCargando(false);
      }
    };
    cargarDatos();
  }, [usuario]);

  if (cargando) {
    return (
      <div style={{ padding: "40px", textAlign: "center", color: "#6b7280" }}>
        <Activity size={32} className="spin-animation" style={{ marginBottom: "10px" }}/>
        <p>Cargando datos de la comunidad...</p>
      </div>
    );
  }

  const miVocacion = rancho?.vocacion || "Desconocida";
  const miEstado = rancho?.estadoRegion || "Desconocido";
  const perfilIncompleto = miVocacion === "Desconocida" && miEstado === "Desconocido";

  const benchVocacion = benchmarks?.porVocacion?.[miVocacion];
  const benchEstado = benchmarks?.porEstado?.[miEstado];

  return (
    <div className="dashboard-container">
      <Header subtitle="Compara el rendimiento de tu rancho contra la comunidad." logo={require("../assets/logo_ganado.jpg")} />

      <div style={{ padding: "20px", maxWidth: "1000px", margin: "0 auto" }}>
        
        {/* Cuadro de Información */}
        <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", padding: "15px 20px", borderRadius: "10px", marginBottom: "25px", display: "flex", gap: "15px", alignItems: "flex-start" }}>
          <div style={{ backgroundColor: "#eff6ff", color: "#3b82f6", padding: "8px", borderRadius: "50%" }}>
            <Activity size={20} />
          </div>
          <div>
            <h4 style={{ margin: "0 0 5px 0", color: "#1e293b", fontSize: "15px" }}>¿Cómo funciona el Ranking?</h4>
            <p style={{ margin: "0", color: "#475569", fontSize: "13px", lineHeight: "1.5" }}>
              Todos los días de madrugada, nuestro robot analiza de forma <strong>100% anónima</strong> a todos los ranchos de la comunidad. 
              Agrupa a los ranchos según su <strong>Vocación</strong> (ej. Engorda) y <strong>Ubicación</strong> (ej. Veracruz), y calcula un promedio exacto de los Indicadores Clave (KPIs) usando su inventario real. Esto te permite saber si tus estrategias de manejo, nutrición o sanidad están dando mejores resultados que la media de tu región.
            </p>
          </div>
        </div>
        
        {perfilIncompleto ? (
          <div style={{ backgroundColor: "#eff6ff", border: "1px solid #bfdbfe", padding: "30px", borderRadius: "12px", textAlign: "center" }}>
            <AlertTriangle size={48} color="#3b82f6" style={{ margin: "0 auto 15px" }} />
            <h2 style={{ margin: "0 0 10px", color: "#1e3a8a" }}>Perfil Incompleto</h2>
            <p style={{ color: "#2563eb", marginBottom: "20px" }}>Para poder compararte con otros ranchos de tu tipo, primero debes configurar la <strong>Vocación</strong> y <strong>Estado/Región</strong> en la sección "Mi Rancho".</p>
          </div>
        ) : !benchmarks ? (
          <div style={{ backgroundColor: "#f9fafb", border: "1px solid #e5e7eb", padding: "30px", borderRadius: "12px", textAlign: "center" }}>
            <Activity size={48} color="#9ca3af" style={{ margin: "0 auto 15px" }} />
            <h2 style={{ margin: "0 0 10px", color: "#374151" }}>Calculando Promedios...</h2>
            <p style={{ color: "#6b7280" }}>El motor de Benchmark se ejecuta todas las madrugadas. Regresa mañana para ver tu posición en el Ranking.</p>
          </div>
        ) : (
          <>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px", flexWrap: "wrap", gap: "10px" }}>
              <div>
                <h2 style={{ margin: 0, fontSize: "22px", color: "#111827", display: "flex", alignItems: "center", gap: "8px" }}>
                  <Trophy color="#f59e0b" /> Ranking y Benchmark
                </h2>
                <p style={{ margin: "5px 0 0", color: "#6b7280", fontSize: "14px" }}>
                  Actualizado: {format(new Date(benchmarks.ultimaActualizacion), "dd MMM yyyy, HH:mm", { locale: es })}
                </p>
              </div>
              <div style={{ display: "flex", gap: "10px" }}>
                <span style={{ backgroundColor: "#e0e7ff", color: "#4f46e5", padding: "6px 12px", borderRadius: "20px", fontSize: "13px", fontWeight: "bold" }}>
                  Vocación: {miVocacion}
                </span>
                <span style={{ backgroundColor: "#dcfce7", color: "#16a34a", padding: "6px 12px", borderRadius: "20px", fontSize: "13px", fontWeight: "bold" }}>
                  Zona: {miEstado}
                </span>
              </div>
            </div>

            {/* Selector de KPI */}
            <div style={{ display: "flex", gap: "10px", marginBottom: "25px", borderBottom: "1px solid #e5e7eb", paddingBottom: "15px", overflowX: "auto" }}>
              <button onClick={() => setKpiSeleccionado("mortalidad")} style={{ padding: "8px 16px", borderRadius: "20px", border: "none", cursor: "pointer", fontWeight: "bold", background: kpiSeleccionado === "mortalidad" ? "#1f2937" : "#e5e7eb", color: kpiSeleccionado === "mortalidad" ? "#fff" : "#4b5563" }}>Mortalidad</button>
              <button onClick={() => setKpiSeleccionado("prenez")} style={{ padding: "8px 16px", borderRadius: "20px", border: "none", cursor: "pointer", fontWeight: "bold", background: kpiSeleccionado === "prenez" ? "#1f2937" : "#e5e7eb", color: kpiSeleccionado === "prenez" ? "#fff" : "#4b5563" }}>Tasa de Preñez</button>
              <button onClick={() => setKpiSeleccionado("gdp")} style={{ padding: "8px 16px", borderRadius: "20px", border: "none", cursor: "pointer", fontWeight: "bold", background: kpiSeleccionado === "gdp" ? "#1f2937" : "#e5e7eb", color: kpiSeleccionado === "gdp" ? "#fff" : "#4b5563" }}>Ganancia de Peso (GDP)</button>
            </div>

            <div style={{ marginBottom: "30px" }}>
              <h3 style={{ fontSize: "18px", color: "#374151", borderBottom: "2px solid #e5e7eb", paddingBottom: "10px", marginBottom: "20px", display: "flex", alignItems: "center", gap: "8px" }}>
                <BarChart2 size={20} /> Comparativa por Vocación ({miVocacion})
              </h3>
              
              {!benchVocacion ? (
                <p style={{ color: "#6b7280" }}>Aún no hay suficientes ranchos de esta vocación para generar un promedio confiable.</p>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "20px" }}>
                  {kpiSeleccionado === "mortalidad" && (
                    <RendimientoCard 
                      titulo="Tasa de Mortalidad" 
                      miValor={miMortalidad} 
                      promedio={benchVocacion.promedioMortalidad} 
                      formato="%" 
                      inverso={true} 
                      arrayRankings={benchVocacion.rankings?.mortalidad}
                    />
                  )}
                  {kpiSeleccionado === "prenez" && (
                    <RendimientoCard 
                      titulo="Tasa de Preñez" 
                      miValor={miPrenez} 
                      promedio={benchVocacion.promedioPrenez || 0} 
                      formato="%" 
                      inverso={false} 
                      arrayRankings={benchVocacion.rankings?.prenez}
                    />
                  )}
                  {kpiSeleccionado === "gdp" && (
                    <RendimientoCard 
                      titulo="Ganancia Diaria de Peso (GDP)" 
                      miValor={miGdp} 
                      promedio={benchVocacion.promedioGdp || 0} 
                      formato=" kg/día" 
                      inverso={false} 
                      arrayRankings={benchVocacion.rankings?.gdp}
                    />
                  )}
                </div>
              )}
            </div>

            <div>
              <h3 style={{ fontSize: "18px", color: "#374151", borderBottom: "2px solid #e5e7eb", paddingBottom: "10px", marginBottom: "20px", display: "flex", alignItems: "center", gap: "8px" }}>
                <Map size={20} /> Comparativa Regional ({miEstado})
              </h3>
              
              {!benchEstado ? (
                <p style={{ color: "#6b7280" }}>Aún no hay suficientes ranchos en este estado para generar un promedio regional.</p>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "20px" }}>
                  {kpiSeleccionado === "mortalidad" && (
                    <RendimientoCard 
                      titulo="Tasa de Mortalidad (Regional)" 
                      miValor={miMortalidad} 
                      promedio={benchEstado.promedioMortalidad} 
                      formato="%" 
                      inverso={true}
                      arrayRankings={benchEstado.rankings?.mortalidad} 
                    />
                  )}
                  {kpiSeleccionado === "prenez" && (
                    <RendimientoCard 
                      titulo="Tasa de Preñez (Regional)" 
                      miValor={miPrenez} 
                      promedio={benchEstado.promedioPrenez || 0} 
                      formato="%" 
                      inverso={false} 
                      arrayRankings={benchEstado.rankings?.prenez}
                    />
                  )}
                  {kpiSeleccionado === "gdp" && (
                    <RendimientoCard 
                      titulo="Ganancia Diaria de Peso (Regional)" 
                      miValor={miGdp} 
                      promedio={benchEstado.promedioGdp || 0} 
                      formato=" kg/día" 
                      inverso={false} 
                      arrayRankings={benchEstado.rankings?.gdp}
                    />
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}