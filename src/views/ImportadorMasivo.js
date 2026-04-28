import React, { useState, useEffect } from "react";
import { UploadCloud, FileSpreadsheet, CheckCircle2, Database, RefreshCw, Download, AlertCircle } from "lucide-react";
import { collection, addDoc, doc, getDoc, setDoc, deleteDoc, getDocs } from "firebase/firestore";
import { db } from "../firebase";
import { format } from "date-fns";
import * as XLSX from "xlsx";

export default function ImportadorMasivo() {
  const [archivo, setArchivo] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [mensajeExito, setMensajeExito] = useState(false);
  const [contadorImportados, setContadorImportados] = useState(0);
  const [errores, setErrores] = useState([]);

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

  const manejarCambioArchivo = (e) => {
    const file = e.target.files[0];
    if (file) {
      setArchivo(file);
      setMensajeExito(false);
      setErrores([]);
    }
  };

  const descargarPlantilla = () => {
    const encabezados = [
      ["Arete", "Tipo", "Sexo", "Raza", "Fecha_Nacimiento", "Peso_kg", "Estado", "Potrero", "Grupo", "Arete_Madre", "Arete_Padre"]
    ];
    const ejemplos = [
      ["VC-001", "Vaca", "Hembra", "Brahman", "2018-05-15", 480, "Sano", "Potrero Norte", "Vacas", "", "SM-001"],
      ["VC-002", "Vaca", "Hembra", "Angus", "2019-03-20", 510, "Sano", "Potrero Sur", "Vacas Secas", "", "SM-002"],
      ["NV-003", "Novillona", "Hembra", "Hereford", "2023-08-01", 300, "Sano", "Potrero Norte", "Desarrollo", "VC-001", "SM-001"],
      ["TR-004", "Torete", "Macho", "Brangus", "2024-01-10", 320, "Disponible para Venta", "Corral Engorda", "Engorda", "VC-002", "SM-002"],
      ["CR-005", "Becerra", "Hembra", "Brahman", "2025-02-14", 95, "Sano", "Potrero Maternidad", "Crías Lactantes", "VC-001", "SM-001"],
      ["SM-001", "Semental", "Macho", "Angus", "2017-11-05", 950, "Sano", "Pradera Abierta", "Sementales", "", ""],
    ];

    const ws = XLSX.utils.aoa_to_sheet([...encabezados, ...ejemplos]);

    // Ancho de columnas
    ws["!cols"] = [
      { wch: 12 }, { wch: 12 }, { wch: 8 }, { wch: 12 }, { wch: 18 },
      { wch: 10 }, { wch: 25 }, { wch: 18 }, { wch: 18 }, { wch: 14 }, { wch: 14 }
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Animales");
    XLSX.writeFile(wb, "plantilla_importacion_ganado.xlsx");
  };

  const normalizarFecha = (val) => {
    if (!val) return "";
    if (val instanceof Date) return val.toISOString().split("T")[0];
    const str = String(val).trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
    if (/^\d{2}\/\d{2}\/\d{4}$/.test(str)) {
      const [d, m, y] = str.split("/");
      return `${y}-${m}-${d}`;
    }
    if (/^\d{2}-\d{2}-\d{4}$/.test(str)) {
      const [d, m, y] = str.split("-");
      return `${y}-${m}-${d}`;
    }
    return str;
  };

  const procesarArchivoExcel = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const data = new Uint8Array(e.target.result);
          const workbook = XLSX.read(data, { type: "array", cellDates: true });
          const primerHoja = workbook.Sheets[workbook.SheetNames[0]];
          const filas = XLSX.utils.sheet_to_json(primerHoja, { defval: "" });
          resolve(filas);
        } catch (err) {
          reject(err);
        }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  };

  const subirArchivo = async () => {
    if (!archivo) return;
    setCargando(true);
    setErrores([]);
    setMensajeExito(false);

    const tiposValidos = ["Vaca", "Novillona", "Torete", "Becerro", "Becerra", "Semental"];
    const sexosValidos = ["Hembra", "Macho"];

    try {
      const filas = await procesarArchivoExcel(archivo);

      if (filas.length === 0) {
        setErrores(["El archivo está vacío o no tiene el formato correcto. Descarga la plantilla y úsala como base."]);
        setCargando(false);
        return;
      }

      const erroresEncontrados = [];
      const animalesValidos = [];

      filas.forEach((fila, idx) => {
        const numFila = idx + 2;
        const arete = String(fila["Arete"] || "").trim();
        const tipo = String(fila["Tipo"] || "").trim();
        const sexo = String(fila["Sexo"] || "").trim();

        if (!arete) {
          erroresEncontrados.push(`Fila ${numFila}: La columna "Arete" está vacía.`);
          return;
        }
        if (!tiposValidos.includes(tipo)) {
          erroresEncontrados.push(`Fila ${numFila} (${arete}): Tipo "${tipo}" no válido. Opciones: ${tiposValidos.join(", ")}`);
          return;
        }
        if (!sexosValidos.includes(sexo)) {
          erroresEncontrados.push(`Fila ${numFila} (${arete}): Sexo "${sexo}" no válido. Usa "Hembra" o "Macho".`);
          return;
        }

        animalesValidos.push({
          arete,
          tipo,
          sexo,
          raza: String(fila["Raza"] || "").trim(),
          fechaNacimiento: normalizarFecha(fila["Fecha_Nacimiento"]),
          pesoActual: Number(fila["Peso_kg"]) || 0,
          estado: String(fila["Estado"] || "Sano").trim() || "Sano",
          potrero: String(fila["Potrero"] || "").trim(),
          grupo: String(fila["Grupo"] || "").trim(),
          madre: String(fila["Arete_Madre"] || "").trim(),
          padre: String(fila["Arete_Padre"] || "").trim(),
          fechaRegistro: new Date().toISOString().split("T")[0],
        });
      });

      if (erroresEncontrados.length > 0) {
        setErrores(erroresEncontrados);
        setCargando(false);
        return;
      }

      for (const animal of animalesValidos) {
        await addDoc(collection(db, "animales"), animal);
      }

      setContadorImportados(animalesValidos.length);
      setMensajeExito(true);
      setArchivo(null);

    } catch (e) {
      console.error("Error procesando archivo:", e);
      setErrores(["No se pudo leer el archivo. Asegúrate de que sea un .xlsx o .csv válido y usa la plantilla como base."]);
    }

    setCargando(false);
  };

  // ─── Generador de Demo ────────────────────────────────────────────────────────

  const generarBaseDemo = async () => {
    if(!window.confirm("Esto limpiará cualquier dato existente y generará 150 animales con historial médico completo. ¿Continuar?")) return;

    setCargandoDemo(true);
    setMensajeExito(false);

    try {
      const colecciones = ["animales", "eventos", "alertas", "potreros", "grupos"];
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

    const potrerosDemo = [
      { nombre: "Potrero Norte", hectareas: 50 },
      { nombre: "Potrero Sur", hectareas: 100 },
      { nombre: "Potrero Maternidad", hectareas: 20 },
      { nombre: "Corral Engorda", hectareas: 5 },
      { nombre: "Pradera Abierta", hectareas: 200 }
    ];
    const potrerosNombres = potrerosDemo.map(p => p.nombre);

    const gruposDemo = [
      { nombre: "Vacas" },
      { nombre: "Crías Lactantes" },
      { nombre: "Desarrollo" },
      { nombre: "Engorda" },
      { nombre: "Sementales" }
    ];

    const animalesAGenerar = [];

    for(let i=0; i<70; i++){
        animalesAGenerar.push({
            arete: `VC-${getRandomInt(1000, 9999)}`,
            tipo: "Vaca", sexo: "Hembra", raza: getRandom(razas),
            fechaNacimiento: restarMesesAFecha(getRandomInt(50, 120)),
            pesoActual: getRandomInt(400, 650),
            estado: Math.random() > 0.05 ? "Sano" : "Desecho",
            potrero: getRandom(potrerosNombres),
            grupo: "Vacas",
            fechaRegistro: new Date().toISOString().split('T')[0]
        });
    }

    for(let i=0; i<20; i++){
        const meses = getRandomInt(14, 52);
        animalesAGenerar.push({
            arete: `NV-${getRandomInt(1000, 9999)}`,
            tipo: "Novillona", sexo: "Hembra", raza: getRandom(razas),
            fechaNacimiento: restarMesesAFecha(meses),
            pesoActual: getRandomInt(280, 420),
            estado: meses >= 48 ? "Alerta: Revisión de Fertilidad" : "Sano",
            potrero: getRandom(potrerosNombres),
            grupo: "Desarrollo",
            madre: `VC-${getRandomInt(1000, 9999)}`,
            padre: `SM-${getRandomInt(100, 999)}`,
            fechaRegistro: new Date().toISOString().split('T')[0]
        });
    }

    for(let i=0; i<15; i++){
        animalesAGenerar.push({
            arete: `TR-${getRandomInt(1000, 9999)}`,
            tipo: "Torete", sexo: "Macho", raza: getRandom(razas),
            fechaNacimiento: restarMesesAFecha(getRandomInt(12, 30)),
            pesoActual: getRandomInt(350, 500),
            estado: Math.random() > 0.2 ? "Disponible para Venta" : "Sano",
            potrero: getRandom(potrerosNombres),
            grupo: "Engorda",
            fechaRegistro: new Date().toISOString().split('T')[0]
        });
    }

    for(let i=0; i<40; i++){
        const esMacho = Math.random() > 0.5;
        animalesAGenerar.push({
            arete: `CR-${getRandomInt(1000, 9999)}`,
            tipo: esMacho ? "Becerro" : "Becerra", sexo: esMacho ? "Macho" : "Hembra", raza: getRandom(razas),
            fechaNacimiento: restarMesesAFecha(getRandomInt(2, 11)),
            pesoActual: getRandomInt(80, 220),
            estado: "Sano",
            potrero: getRandom(potrerosNombres),
            grupo: "Crías Lactantes",
            madre: `VC-${getRandomInt(1000, 9999)}`,
            padre: `SM-${getRandomInt(100, 999)}`,
            fechaRegistro: new Date().toISOString().split('T')[0]
        });
    }

    for(let i=0; i<5; i++){
        animalesAGenerar.push({
            arete: `SM-${getRandomInt(100, 999)}`,
            tipo: "Semental", sexo: "Macho", raza: getRandom(razas),
            fechaNacimiento: restarMesesAFecha(getRandomInt(60, 100)),
            pesoActual: getRandomInt(800, 1100),
            estado: "Sano",
            potrero: getRandom(potrerosNombres),
            grupo: "Sementales",
            fechaRegistro: new Date().toISOString().split('T')[0]
        });
    }

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
        for(let p of potrerosDemo) {
          await addDoc(collection(db, "potreros"), p);
        }
        for(let g of gruposDemo) {
          await addDoc(collection(db, "grupos"), g);
        }

        const batchSize = animalesAGenerar.length;
        for(let i=0; i<batchSize; i++) {
            const docRef = await addDoc(collection(db, "animales"), animalesAGenerar[i]);
            const animalId = docRef.id;
            const animal = animalesAGenerar[i];
            const misPromesas = [];

            const numEventos = getRandomInt(2, 5);
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

            if (["Vaca", "Novillona"].includes(animal.tipo) && Math.random() > 0.3) {
                const resultadosPalp = ["Gestante", "Vacía - Fresca", "Vacía - Ciclando", "Vacía - Anestro"];
                misPromesas.push(addDoc(collection(db, "eventos"), {
                    animalId, tipo: "Palpación", resultado: getRandom(resultadosPalp), fecha: generarFechaAleatoria(10), costo: 100
                }));
            }

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
        }
        setMensajeExito(true);
        setContadorImportados(batchSize);
        await setDoc(doc(db, "configuracion", "demoGenerada"), { fecha: new Date().toISOString(), cantidad: batchSize });
        setDemoYaGenerada(true);
    } catch (e) {
        console.error("Error inyectando data", e);
    }

    setCargandoDemo(false);
  };

  return (
    <div className="admin-container">
      <div className="header">
        <h1>Importar Inventario de Ganado</h1>
        <p>Sube tu Excel con el inventario actual. Descarga la plantilla para ver el formato correcto.</p>
      </div>

      {/* Botón descargar plantilla */}
      <button
        onClick={descargarPlantilla}
        style={{
          display: "flex", alignItems: "center", gap: "8px",
          backgroundColor: "#f0fdf4", color: "#166534",
          border: "1.5px solid #86efac", borderRadius: "8px",
          padding: "10px 18px", cursor: "pointer", fontSize: "14px",
          fontWeight: "600", marginBottom: "20px"
        }}
      >
        <Download size={16} />
        Descargar Plantilla Excel
      </button>

      {/* Zona de carga */}
      <label className="upload-box" htmlFor="excel-upload" style={{ display: "block" }}>
        <UploadCloud size={48} color="#9ca3af" style={{ margin: "0 auto" }} />
        <h3 style={{ color: "#374151", marginTop: "16px" }}>
          Haz clic para subir tu Excel
        </h3>
        <p style={{ color: "#6b7280", fontSize: "14px" }}>
          Archivos soportados: .xlsx, .xls, .csv
        </p>
        <input
          id="excel-upload"
          type="file"
          accept=".xlsx, .xls, .csv"
          style={{ display: "none" }}
          onChange={manejarCambioArchivo}
        />
      </label>

      {archivo && (
        <div style={{ marginTop: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#4b5563" }}>
            <FileSpreadsheet size={24} color="#3b82f6" />
            <span>Archivo listo: <strong>{archivo.name}</strong></span>
          </div>
          <button
            className="btn-primary"
            onClick={subirArchivo}
            disabled={cargando}
          >
            {cargando ? "Procesando animales..." : "Importar al Sistema"}
          </button>
        </div>
      )}

      {/* Errores de validación */}
      {errores.length > 0 && (
        <div style={{
          marginTop: "20px", backgroundColor: "#fef2f2", border: "1px solid #fca5a5",
          borderRadius: "8px", padding: "16px"
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "8px", color: "#dc2626", fontWeight: "600" }}>
            <AlertCircle size={18} />
            <span>Se encontraron {errores.length} error(es). Corrígelos en el Excel y vuelve a subir:</span>
          </div>
          <ul style={{ margin: 0, paddingLeft: "20px", color: "#b91c1c", fontSize: "13px" }}>
            {errores.map((e, i) => <li key={i}>{e}</li>)}
          </ul>
        </div>
      )}

      {/* Éxito */}
      {mensajeExito && (
        <div className="file-status status-success" style={{ marginTop: "20px" }}>
          <CheckCircle2 size={20} />
          <span>
            ¡{contadorImportados} animales importados exitosamente! Ve a "Mi Ganado" para verlos.
          </span>
        </div>
      )}

      {/* Generador de Demo */}
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
            <h3 style={{ color: "#166534", marginTop: "10px" }}>Base de datos de demostración activa</h3>
            <p style={{ color: "#6b7280", fontSize: "14px", marginBottom: "16px" }}>
                Los animales de prueba ya fueron inyectados. Ve a "Mi Ganado" o "Reportes" para explorar.
            </p>
            <button
                className="btn-outline"
                style={{ borderColor: "#ef4444", color: "#ef4444", display: "inline-flex", alignItems: "center", gap: "6px", padding: "8px 16px" }}
                onClick={async () => {
                    if (!window.confirm("⚠️ Esto borrará TODOS los animales, eventos y alertas de la base de datos y te permitirá regenerarlos. ¿Continuar?")) return;
                    setCargandoDemo(true);
                    try {
                        const colecciones = ["animales", "eventos", "alertas", "potreros", "grupos"];
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
