import React, { useState, useEffect } from "react";
import { doc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import Header from "../components/Header";
import { Trophy, TrendingUp, AlertTriangle, Activity, Map, BarChart2 } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function BenchmarkRanking({ usuario }) {
  const [rancho, setRancho] = useState(null);
  const [benchmarks, setBenchmarks] = useState(null);
  const [cargando, setCargando] = useState(true);

  const [miMortalidad, setMiMortalidad] = useState(0);
  const [miGdp, setMiGdp] = useState(0);

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

        // Calcular los valores REALES de mi rancho
        const animalesQ = query(collection(db, "animales"), where("ranchoId", "==", usuario.ranchoId));
        const animalesSnap = await getDocs(animalesQ);
        const animales = animalesSnap.docs.map(d => d.data());
        
        const totalCabezas = animales.length;
        if (totalCabezas > 0) {
            const bajasMuerte = animales.filter(a => a.estado === "Baja - Muerte").length;
            setMiMortalidad((bajasMuerte / totalCabezas) * 100);

            const animalesConPeso = animales.filter(a => a.pesoAnteriorKg && a.pesoKg && a.fechaPesoAnterior && a.fechaPesoAnterior !== a.fechaNacimiento);
            if (animalesConPeso.length > 0) {
              let sumaGdp = 0;
              animalesConPeso.forEach(a => {
                const dias = (new Date() - new Date(a.fechaPesoAnterior)) / (1000 * 60 * 60 * 24);
                if (dias > 0) {
                  const gdp = (a.pesoKg - a.pesoAnteriorKg) / dias;
                  if (gdp > 0 && gdp < 5) sumaGdp += gdp;
                }
              });
              setMiGdp(sumaGdp / animalesConPeso.length);
            }
        }

        setCargando(false);
      } catch (e) {
        console.error(e);
        setCargando(false);
      }
    };
    cargarDatos();
  }, [usuario]);

  if (cargando) return <div style={{ padding: "40px", textAlign: "center" }}>Cargando Benchmark...</div>;

  const perfilIncompleto = !rancho || !rancho.vocacion || !rancho.estadoRegion;
  const miVocacion = rancho?.vocacion || "Desconocida";
  const miEstado = rancho?.estadoRegion || "Desconocido";

  const benchVocacion = benchmarks?.porVocacion?.[miVocacion];
  const benchEstado = benchmarks?.porEstado?.[miEstado];

  const RendimientoCard = ({ titulo, miValor, promedio, formato = "", inverso = false }) => {
    if (!promedio) return null;
    let esMejor = inverso ? miValor <= promedio : miValor >= promedio;
    
    return (
      <div style={{ background: "#fff", padding: "20px", borderRadius: "12px", border: "1px solid #e5e7eb", boxShadow: "0 2px 4px rgba(0,0,0,0.02)", display: "flex", flexDirection: "column", alignItems: "center" }}>
        <h4 style={{ margin: "0 0 15px 0", color: "#4b5563", fontSize: "14px", textTransform: "uppercase", letterSpacing: "0.5px", textAlign: "center" }}>{titulo}</h4>
        
        <div style={{ display: "flex", alignItems: "center", gap: "20px", width: "100%", justifyContent: "space-around" }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "5px" }}>Mi Rancho</div>
            <div style={{ fontSize: "24px", fontWeight: "bold", color: "#111827" }}>{miValor.toFixed(2)}{formato}</div>
          </div>
          
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
            {esMejor ? (
              <div style={{ color: "#10b981", display: "flex", alignItems: "center", gap: "4px", backgroundColor: "#d1fae5", padding: "4px 8px", borderRadius: "20px", fontSize: "12px", fontWeight: "bold" }}>
                <Trophy size={14} /> ¡Superior!
              </div>
            ) : (
              <div style={{ color: "#ef4444", display: "flex", alignItems: "center", gap: "4px", backgroundColor: "#fee2e2", padding: "4px 8px", borderRadius: "20px", fontSize: "12px", fontWeight: "bold" }}>
                <AlertTriangle size={14} /> Por debajo
              </div>
            )}
          </div>

          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: "12px", color: "#6b7280", marginBottom: "5px" }}>Promedio</div>
            <div style={{ fontSize: "24px", fontWeight: "bold", color: "#4b5563" }}>{promedio.toFixed(2)}{formato}</div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="dashboard-container">
      <Header subtitle="Compara el rendimiento de tu rancho contra la comunidad." logo={require("../assets/logo_ganado.jpg")} />

      <div style={{ padding: "20px", maxWidth: "1000px", margin: "0 auto" }}>
        
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

            <div style={{ marginBottom: "30px" }}>
              <h3 style={{ fontSize: "18px", color: "#374151", borderBottom: "2px solid #e5e7eb", paddingBottom: "10px", marginBottom: "20px", display: "flex", alignItems: "center", gap: "8px" }}>
                <BarChart2 size={20} /> Comparativa por Vocación ({miVocacion})
              </h3>
              
              {!benchVocacion ? (
                <p style={{ color: "#6b7280" }}>Aún no hay suficientes ranchos de esta vocación para generar un promedio confiable.</p>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: "20px" }}>
                  <RendimientoCard 
                    titulo="Tasa de Mortalidad" 
                    miValor={miMortalidad} 
                    promedio={benchVocacion.promedioMortalidad} 
                    formato="%" 
                    inverso={true} 
                  />
                  {(miVocacion === "Engorda" || miVocacion === "Doble Propósito") && (
                    <RendimientoCard 
                      titulo="Ganancia Diaria de Peso (GDP)" 
                      miValor={miGdp} 
                      promedio={benchVocacion.promedioGdp} 
                      formato=" kg/día" 
                      inverso={false} 
                    />
                  )}
                  <div style={{ background: "#f8fafc", padding: "15px", borderRadius: "12px", border: "1px dashed #cbd5e1", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b", fontSize: "13px" }}>
                    Comparándote contra {benchVocacion.ranchosParticipantes} ranchos de la misma vocación.
                  </div>
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
                  <RendimientoCard 
                    titulo="Tasa de Mortalidad (Regional)" 
                    miValor={miMortalidad} 
                    promedio={benchEstado.promedioMortalidad} 
                    formato="%" 
                    inverso={true} 
                  />
                  <div style={{ background: "#f8fafc", padding: "15px", borderRadius: "12px", border: "1px dashed #cbd5e1", display: "flex", alignItems: "center", justifyContent: "center", color: "#64748b", fontSize: "13px" }}>
                    Comparándote contra {benchEstado.ranchosParticipantes} ranchos en {miEstado}.
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}