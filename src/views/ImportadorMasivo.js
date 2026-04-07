import React, { useState } from "react";
import { UploadCloud, FileSpreadsheet, CheckCircle2, Database } from "lucide-react";
import { collection, addDoc, query, where, getDocs, limit } from "firebase/firestore";
import { db } from "../firebase";

export default function ImportadorMasivo() {
  const [archivo, setArchivo] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [mensajeExito, setMensajeExito] = useState(false);

  const [cargandoDemo, setCargandoDemo] = useState(false);
  const [yaExisteDemo, setYaExisteDemo] = useState(false);

  React.useEffect(() => {
    // Revisar si ya existen animales de prueba en la base de datos
    const verificarDemo = async () => {
      try {
        const q = query(collection(db, "animales"), where("esDemo", "==", true), limit(1));
        const snap = await getDocs(q);
        if (!snap.empty) {
          setYaExisteDemo(true);
        }
      } catch (error) {
        console.error("Error validando demo", error);
      }
    };
    verificarDemo();
  }, []);

  // Manejar la selección del archivo
  const manejarCambioArchivo = (e) => {
    const file = e.target.files[0];
    if (file) {
      setArchivo(file);
      setMensajeExito(false);
    }
  };

  // Generador Inteligente de Base de Datos para Demostración
  const generarBaseDemo = async () => {
    if(!window.confirm("¿Estás a punto de inyectar 150 animales realistas a tu base de datos actual. ¿Continuar?")) return;
    
    setCargandoDemo(true);
    setMensajeExito(false);

    const razas = ["Angus", "Brahman", "Hereford", "Charolais", "Simmental", "Brangus"];
    const getRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];
    const getRandomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
    
    const restarMesesAFecha = (meses) => {
        let d = new Date();
        d.setMonth(d.getMonth() - meses);
        return d.toISOString().split('T')[0];
    };

    const animalesAGenerar = [];

    // Generar 70 Vacas (Sanas o Desecho)
    for(let i=0; i<70; i++){
        animalesAGenerar.push({
            arete: `VC-${getRandomInt(1000, 9999)}`,
            tipo: "Vaca", sexo: "Hembra", raza: getRandom(razas),
            fechaNacimiento: restarMesesAFecha(getRandomInt(50, 120)), // 4 a 10 años
            pesoActual: getRandomInt(400, 650),
            estado: Math.random() > 0.05 ? "Sano" : "Desecho",
            fechaRegistro: new Date().toISOString().split('T')[0],
            esDemo: true
        });
    }

    // Generar 20 Novillonas (Sanas o con Alerta de Fertilidad)
    for(let i=0; i<20; i++){
        const meses = getRandomInt(14, 52);
        animalesAGenerar.push({
            arete: `NV-${getRandomInt(1000, 9999)}`,
            tipo: "Novillona", sexo: "Hembra", raza: getRandom(razas),
            fechaNacimiento: restarMesesAFecha(meses), 
            pesoActual: getRandomInt(280, 420),
            estado: meses >= 48 ? "Alerta: Revisión de Fertilidad" : "Sano",
            fechaRegistro: new Date().toISOString().split('T')[0],
            esDemo: true
        });
    }

    // Generar 15 Toretes (Mayoria en Venta)
    for(let i=0; i<15; i++){
        animalesAGenerar.push({
            arete: `TR-${getRandomInt(1000, 9999)}`,
            tipo: "Torete", sexo: "Macho", raza: getRandom(razas),
            fechaNacimiento: restarMesesAFecha(getRandomInt(12, 30)), 
            pesoActual: getRandomInt(350, 500),
            estado: Math.random() > 0.2 ? "Disponible para Venta" : "Sano",
            fechaRegistro: new Date().toISOString().split('T')[0],
            esDemo: true
        });
    }

    // Generar 40 Becerros/as
    for(let i=0; i<40; i++){
        const esMacho = Math.random() > 0.5;
        animalesAGenerar.push({
            arete: `CR-${getRandomInt(1000, 9999)}`,
            tipo: esMacho ? "Becerro" : "Becerra", sexo: esMacho ? "Macho" : "Hembra", raza: getRandom(razas),
            fechaNacimiento: restarMesesAFecha(getRandomInt(2, 11)), 
            pesoActual: getRandomInt(80, 220),
            estado: "Sano",
            fechaRegistro: new Date().toISOString().split('T')[0],
            esDemo: true
        });
    }

    // Generar 5 Sementales
    for(let i=0; i<5; i++){
        animalesAGenerar.push({
            arete: `SM-${getRandomInt(100, 999)}`,
            tipo: "Semental", sexo: "Macho", raza: getRandom(razas),
            fechaNacimiento: restarMesesAFecha(getRandomInt(60, 100)), 
            pesoActual: getRandomInt(800, 1100),
            estado: "Sano",
            fechaRegistro: new Date().toISOString().split('T')[0],
            esDemo: true
        });
    }

    try {
        const batchSize = animalesAGenerar.length;
        for(let i=0; i<batchSize; i++) {
            await addDoc(collection(db, "animales"), animalesAGenerar[i]);
            // (Opcional) Injectar un evento de Repeso inicial simulado para crear mas data
            if(Math.random() > 0.5) {
                // wait to inject events so it doesnt block UI completely, we just do a simple insert.
            }
        }
        setMensajeExito(true);
        setYaExisteDemo(true);
    } catch (e) {
        console.error("Error inyectando data", e);
    }

    setCargandoDemo(false);
  };

  // Simular la subida al servidor (lo que conectaremos con el Node.js después)
  const subirArchivo = () => {
    if (!archivo) return;
    setCargando(true);

    // Simulamos un tiempo de espera de red de 2 segundos
    setTimeout(() => {
      setCargando(false);
      setMensajeExito(true);
      setArchivo(null); // Limpiamos el formulario
    }, 2000);
  };

  return (
    <div className="admin-container">
      <div className="header">
        <h1>Configuración Inicial: Control Ganadero</h1>
        <p>
          Sube el archivo Excel con el inventario actual de tus animales
          (Vientres, Sementales, Crías).
        </p>
      </div>

      {/* Zona de arrastrar y soltar archivo */}
      <label className="upload-box" htmlFor="excel-upload" style={{ display: "block" }}>
        <UploadCloud size={48} color="#9ca3af" style={{ margin: "0 auto" }} />
        <h3 style={{ color: "#374151", marginTop: "16px" }}>
          Haz clic para subir tu Excel
        </h3>
        <p style={{ color: "#6b7280", fontSize: "14px" }}>
          Archivos soportados: .xlsx, .csv
        </p>
        <input
          id="excel-upload"
          type="file"
          accept=".xlsx, .xls, .csv"
          style={{ display: "none" }}
          onChange={manejarCambioArchivo}
        />
      </label>

      {/* Mostrar el archivo seleccionado */}
      {archivo && (
        <div style={{ marginTop: "24px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              color: "#4b5563",
            }}
          >
            <FileSpreadsheet size={24} color="#3b82f6" />
            <span>
              Archivo listo para procesar: <strong>{archivo.name}</strong>
            </span>
          </div>

          <button
            className="btn-primary"
            onClick={subirArchivo}
            disabled={cargando}
          >
            {cargando
              ? "Procesando datos del ganado..."
              : "Importar Datos al Sistema"}
          </button>
        </div>
      )}

      {/* Mensaje de éxito simulado */}
      {mensajeExito && !cargandoDemo && (
        <div className="file-status status-success" style={{ marginTop: "20px" }}>
          <CheckCircle2 size={20} />
          <span>
            ¡Operación completada exitosamente! Tu ganado ha sido registrado. Ve a los Dashboards.
          </span>
        </div>
      )}

      {/* BOTÓN MÁGICO GENERADOR DE PRUEBAS */}
      {!yaExisteDemo && (
          <div style={{ marginTop: "50px", paddingTop: "30px", borderTop: "2px dashed #e5e7eb", textAlign: "center" }}>
              <Database size={40} color="#10b981" style={{ margin: "0 auto" }} />
              <h3 style={{ color: "#374151", marginTop: "10px" }}>¿Necesitas datos para probar la aplicación?</h3>
              <p style={{ color: "#6b7280", fontSize: "14px", marginBottom: "20px" }}>
                  Esta función inyectará 150 cabezas de ganado simuladas (Vacas, Sementales, Novillonas en Alerta y Toretes en Venta) directo a tu base de datos para que la app cobre vida.
              </p>
              <button
                  className="btn-primary"
                  style={{ backgroundColor: "#10b981", maxWidth: "300px", margin: "0 auto" }}
                  onClick={generarBaseDemo}
                  disabled={cargandoDemo}
              >
                  {cargandoDemo ? "Inyectando 150 animales (Espera)..." : "⚡ Generar 150 Animales de Prueba"}
              </button>
          </div>
      )}

    </div>
  );
}
