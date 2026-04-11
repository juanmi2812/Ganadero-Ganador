import React, { useState, useEffect } from "react";
import { UploadCloud, FileSpreadsheet, CheckCircle2, Database, RefreshCw } from "lucide-react";
import { collection, addDoc, doc, getDoc, setDoc, deleteDoc, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { format } from "date-fns";

export default function ImportadorMasivo() {
  const [archivo, setArchivo] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [mensajeExito, setMensajeExito] = useState(false);

  const [cargandoDemo, setCargandoDemo] = useState(false);
  const [demoYaGenerada, setDemoYaGenerada] = useState(false);

  useEffect(() => {
    const verificarDemo = async () => {
      try {
        const snap = await getDoc(doc(db, "configuracion", "demoGenerada"));
        if (snap.exists()) setDemoYaGenerada(true);
      } catch (e) { console.error(e); }
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
    if(!window.confirm("Esto limpiará cualquier dato existente y generará 150 animales con historial médico completo. ¿Continuar?")) return;
    
    setCargandoDemo(true);
    setMensajeExito(false);

    // Paso 0: Limpiar datos previos en paralelo
    try {
      const colecciones = ["animales", "eventos", "alertas"];
      for (const col of colecciones) {
        const snap = await getDocs(collection(db, col));
        await Promise.all(snap.docs.map(d => deleteDoc(doc(db, col, d.id))));
      }
    } catch (e) { console.error("Error limpiando datos previos:", e); }

    const razas = ["Angus", "Brahman", "Hereford", "Charolais", "Simmental", "Brangus"];
    const getRandom = (arr) => arr[Math.floor(Math.random() * arr.length)];
    const getRandomInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
    
    const restarMesesAFecha = (meses) => {
        let d = new Date();
        d.setMonth(d.getMonth() - meses);
        return d.toISOString().split('T')[0];
    };
    const hectareas = ["Hectárea 1", "Hectárea 2", "Hectárea 3", "Hectárea 4", "Hectárea 5"];

    const animalesAGenerar = [];

    // Generar 70 Vacas (Sanas o Desecho)
    for(let i=0; i<70; i++){
        animalesAGenerar.push({
            arete: `VC-${getRandomInt(1000, 9999)}`,
            tipo: "Vaca", sexo: "Hembra", raza: getRandom(razas),
            fechaNacimiento: restarMesesAFecha(getRandomInt(50, 120)), // 4 a 10 años
            pesoActual: getRandomInt(400, 650),
            estado: Math.random() > 0.05 ? "Sano" : "Desecho",
            hectarea: getRandom(hectareas),
            fechaRegistro: new Date().toISOString().split('T')[0]
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
            hectarea: getRandom(hectareas),
            madre: `VC-${getRandomInt(1000, 9999)}`,
            padre: `SM-${getRandomInt(100, 999)}`,
            fechaRegistro: new Date().toISOString().split('T')[0]
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
            hectarea: getRandom(hectareas),
            fechaRegistro: new Date().toISOString().split('T')[0]
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
            hectarea: getRandom(hectareas),
            madre: `VC-${getRandomInt(1000, 9999)}`,
            padre: `SM-${getRandomInt(100, 999)}`,
            fechaRegistro: new Date().toISOString().split('T')[0]
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
            hectarea: getRandom(hectareas),
            fechaRegistro: new Date().toISOString().split('T')[0]
        });
    }

    // APLICAR ALGUNAS BAJAS ALEATORIAS PARA PROBAR REPORTES DE MORTANDAD/DESECHO
    animalesAGenerar.forEach(a => {
        const rand = Math.random();
        if (rand < 0.03) {
            a.estado = "Baja - Muerte";
            a.fechaBaja = new Date().toISOString().split('T')[0];
        } else if (rand < 0.06 && a.tipo === "Vaca") {
            a.estado = "Baja - Venta (Desecho)";
            a.fechaBaja = new Date().toISOString().split('T')[0];
        }
    });

    const tiposEvento = ["Vacunación", "Repeso", "Tratamiento", "Desparasitación"];
    const vacunas = ["Brucella", "Clostridial", "IBR", "DVB", "Leptospira", "Rabia Bovina"];
    const tratamientos = ["Antibiótico Oxitetraciclina", "Antiinflamatorio Flunixin", "Vitaminas ADE", "Suero Oral"];

    const generarFechaAleatoria = (mesesAtras) => {
        let d = new Date();
        d.setDate(d.getDate() - getRandomInt(1, mesesAtras * 30));
        return d.toISOString().split('T')[0];
    };

    try {
        const batchSize = animalesAGenerar.length;
        for(let i=0; i<batchSize; i++) {
            const docRef = await addDoc(collection(db, "animales"), animalesAGenerar[i]);
            const animalId = docRef.id;
            const animal = animalesAGenerar[i];
            const misPromesas = [];

            // Generar entre 2 y 5 eventos por animal
            const numEventos = getRandomInt(2, 5);
            // Aseguramos al menos un repeso para categorías de desarrollo
            if (["Becerro", "Becerra", "Novillona", "Torete"].includes(animal.tipo)) {
                 misPromesas.push(addDoc(collection(db, "eventos"), {
                    animalId, tipo: "Repeso", 
                    resultado: `${getRandomInt(animal.pesoActual - 40, animal.pesoActual - 10)} kg`, 
                    fecha: restarMesesAFecha(getRandomInt(2, 4)), 
                    costo: 0
                }));
            }

            for(let j=0; j<numEventos; j++) {
                const tipoEv = getRandom(tiposEvento);
                let resultado = (tipoEv === "Vacunación") ? getRandom(vacunas) : 
                                (tipoEv === "Repeso") ? `${getRandomInt(animal.pesoActual - 10, animal.pesoActual + 15)} kg` :
                                (tipoEv === "Tratamiento") ? getRandom(tratamientos) : "Ivermectina 1%";
                
                misPromesas.push(addDoc(collection(db, "eventos"), {
                    animalId, tipo: tipoEv, resultado, fecha: generarFechaAleatoria(j === 0 ? 1 : 10), costo: getRandomInt(50, 400)
                }));
            }

            // Palpaciones adicionales
            if (["Vaca", "Novillona"].includes(animal.tipo) && Math.random() > 0.3) {
                const resultadosPalp = ["Gestante", "Vacía - Fresca", "Vacía - Ciclando", "Vacía - Anestro"];
                misPromesas.push(addDoc(collection(db, "eventos"), {
                    animalId, tipo: "Palpación", resultado: getRandom(resultadosPalp), fecha: generarFechaAleatoria(10), costo: 100
                }));
            }

            // Historia Reproductiva Compleja (Vaca)
            if (animal.tipo === "Vaca" && Math.random() > 0.4) {
                const fP1 = restarMesesAFecha(getRandomInt(22, 28));
                const fP2 = restarMesesAFecha(getRandomInt(8, 12));
                const fIn = format(new Date(new Date(fP1 + "T00:00:00").getTime() + (getRandomInt(70, 110) * 86400000)), "yyyy-MM-dd");

                misPromesas.push(addDoc(collection(db, "eventos"), { animalId, tipo: "Parto", resultado: "Cría sana", fecha: fP1, costo: 0 }));
                misPromesas.push(addDoc(collection(db, "eventos"), { animalId, tipo: "Inseminación", resultado: "IA Directa", fecha: fIn, costo: 0 }));
                misPromesas.push(addDoc(collection(db, "eventos"), { animalId, tipo: "Parto", resultado: "Cría sana", fecha: fP2, costo: 0 }));

                if (Math.random() > 0.5) {
                    misPromesas.push(addDoc(collection(db, "eventos"), {
                        animalId, tipo: "Palpación", resultado: `Gestante ${getRandomInt(2, 7)} meses`, fecha: format(new Date(), "yyyy-MM-dd"), costo: 100
                    }));
                }
            } else if (animal.tipo === "Novillona" && Math.random() > 0.5) {
                misPromesas.push(addDoc(collection(db, "eventos"), {
                    animalId, tipo: "Inseminación", resultado: "IA", fecha: restarMesesAFecha(getRandomInt(1, 4)), costo: 0
                }));
            }

            await Promise.all(misPromesas);

            // Generar algunas alertas futuras (vacunaciones próximas)
            if (Math.random() > 0.4) {
                const diasFuturo = getRandomInt(15, 45); // Aseguramos que caigan en mes actual o siguiente
                let fechaAlerta = new Date();
                fechaAlerta.setDate(fechaAlerta.getDate() + diasFuturo);

                await addDoc(collection(db, "alertas"), {
                    fechaProgramada: fechaAlerta.toISOString().split('T')[0],
                    titulo: `${getRandom(tiposEvento)} Planificado`,
                    areteAnimal: animal.arete,
                    completada: false
                });
            }
        }
        setMensajeExito(true);
        await setDoc(doc(db, "configuracion", "demoGenerada"), { fecha: new Date().toISOString(), cantidad: batchSize });
        setDemoYaGenerada(true);
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
      {mensajeExito && (
        <div className="file-status status-success" style={{ marginTop: "20px" }}>
          <CheckCircle2 size={20} />
          <span>
            ¡Operación completada exitosamente! Tu ganado ha sido registrado. Ve a los Dashboards.
          </span>
        </div>
      )}

      {/* BOTÓN MÁGICO GENERADOR DE PRUEBAS */}
      {!demoYaGenerada ? (
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
      ) : (
        <div style={{ marginTop: "50px", paddingTop: "30px", borderTop: "2px dashed #e5e7eb", textAlign: "center" }}>
            <CheckCircle2 size={40} color="#10b981" style={{ margin: "0 auto" }} />
            <h3 style={{ color: "#166534", marginTop: "10px" }}>✅ Base de datos de demostración activa</h3>
            <p style={{ color: "#6b7280", fontSize: "14px", marginBottom: "16px" }}>
                Los 150 animales de prueba ya fueron inyectados exitosamente. Ve a "Mi Ganado" o "Reportes BI" para explorar los datos.
            </p>
            <button
                className="btn-outline"
                style={{ borderColor: "#ef4444", color: "#ef4444", display: "inline-flex", alignItems: "center", gap: "6px", padding: "8px 16px" }}
                onClick={async () => {
                    if (!window.confirm("⚠️ Esto borrará TODOS los animales, eventos y alertas de la base de datos y te permitirá regenerarlos. ¿Continuar?")) return;
                    setCargandoDemo(true);
                    try {
                        const colecciones = ["animales", "eventos", "alertas"];
                        for (const col of colecciones) {
                            const snap = await getDocs(collection(db, col));
                            await Promise.all(snap.docs.map(d => deleteDoc(doc(db, col, d.id))));
                        }
                        await deleteDoc(doc(db, "configuracion", "demoGenerada"));
                        setDemoYaGenerada(false);
                        setMensajeExito(false);
                    } catch (e) { console.error(e); }
                    setCargandoDemo(false);
                }}
                disabled={cargandoDemo}
            >
                <RefreshCw size={16} />
                {cargandoDemo ? "Limpiando base de datos..." : "Resetear y Regenerar Demo"}
            </button>
        </div>
      )}

    </div>
  );
}
