import React, { useState, useEffect } from "react";
import { UploadCloud, FileSpreadsheet, CheckCircle2, Database, RefreshCw, Download, AlertCircle } from "lucide-react";
import { collection, addDoc, doc, getDoc, setDoc, deleteDoc, getDocs, query, where, updateDoc } from "firebase/firestore";
import { db } from "../firebase";
import { format } from "date-fns";
import * as XLSX from "xlsx";

export default function ImportadorMasivo({ usuario }) {
  const [archivo, setArchivo] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [mensajeExito, setMensajeExito] = useState(false);
  const [contadorImportados, setContadorImportados] = useState(0);
  const [errores, setErrores] = useState([]);

  const [cargandoDemo, setCargandoDemo] = useState(false);
  const [demoYaGenerada, setDemoYaGenerada] = useState(false);

  useEffect(() => {
    if (!usuario?.ranchoId) return;
    const verificarDemo = async () => {
      try {
        const snap = await getDoc(doc(db, "configuracion", `demoGenerada_${usuario.ranchoId}`));
        if (snap.exists()) setDemoYaGenerada(true);
      } catch (e) { console.error(e); }
    };
    verificarDemo();
  }, [usuario]);

  const manejarCambioArchivo = (e) => {
    const file = e.target.files[0];
    if (file) {
      setArchivo(file);
      setMensajeExito(false);
      setErrores([]);
    }
  };

  // ─── Descarga de plantilla con 2 hojas ───────────────────────────────────────

  const descargarPlantilla = () => {
    const wb = XLSX.utils.book_new();

    // ── Hoja 1: Datos ──────────────────────────────────────────────────────────
    const encabezados = [[
      // Datos básicos del animal
      "Arete", "Tipo", "Sexo", "Raza",
      "Fecha_Nacimiento", "Peso_kg", "Estado",
      "Potrero", "Grupo", "Arete_Madre", "Arete_Padre",
      // Genera evento Parto
      "Fecha_Ultimo_Parto",
      // Genera evento Palpación
      "Resultado_Palpacion", "Meses_Gestacion", "Fecha_Palpacion",
      // Genera evento Repeso (para GDP)
      "Peso_Anterior_kg", "Fecha_Peso_Anterior",
      // Genera evento Inseminación
      "Fecha_Inseminacion",
      // Genera evento Vacunación
      "Fecha_Ultima_Vacuna", "Producto_Vacuna"
    ]];

    const ejemplos = [
      // Vaca con historial completo
      ["VC-001", "Vaca", "Hembra", "Brahman",
       "2018-05-15", 480, "Sano",
       "Potrero Norte", "Vacas", "", "SM-001",
       "2024-11-10",
       "Gestante", 4, "2025-01-15",
       430, "2024-09-01",
       "2024-07-20",
       "2024-10-05", "Clostridial"],

      // Vaca vacía ciclando
      ["VC-002", "Vaca", "Hembra", "Angus",
       "2019-03-20", 510, "Sano",
       "Potrero Sur", "Vacas Secas", "", "SM-002",
       "2024-06-01",
       "Vacía - Ciclando", "", "2025-02-10",
       460, "2024-10-15",
       "", "", ""],

      // Novillona sin parto
      ["NV-003", "Novillona", "Hembra", "Hereford",
       "2023-08-01", 300, "Sano",
       "Potrero Norte", "Desarrollo", "VC-001", "SM-001",
       "",
       "", "", "",
       260, "2024-11-01",
       "2025-01-10", "", ""],

      // Torete
      ["TR-004", "Torete", "Macho", "Brangus",
       "2024-01-10", 320, "Disponible para Venta",
       "Corral Engorda", "Engorda", "VC-002", "SM-002",
       "", "", "", "",
       280, "2024-10-20",
       "", "", ""],

      // Becerra lactante
      ["CR-005", "Becerra", "Hembra", "Brahman",
       "2025-02-14", 95, "Sano",
       "Potrero Maternidad", "Crías Lactantes", "VC-001", "SM-001",
       "", "", "", "",
       "", "", "", "", ""],

      // Semental
      ["SM-001", "Semental", "Macho", "Angus",
       "2017-11-05", 950, "Sano",
       "Pradera Abierta", "Sementales", "", "",
       "", "", "", "",
       900, "2024-08-01",
       "", "2024-12-01", "IBR + DVB"],
    ];

    const ws1 = XLSX.utils.aoa_to_sheet([...encabezados, ...ejemplos]);
    ws1["!cols"] = [
      {wch:12},{wch:11},{wch:8},{wch:12},
      {wch:16},{wch:9},{wch:26},
      {wch:17},{wch:17},{wch:13},{wch:13},
      {wch:16},
      {wch:22},{wch:15},{wch:15},
      {wch:16},{wch:17},
      {wch:16},
      {wch:17},{wch:16}
    ];
    XLSX.utils.book_append_sheet(wb, ws1, "Animales");

    // ── Hoja 2: Guía de llenado ────────────────────────────────────────────────
    const guia = [
      ["GUÍA DE LLENADO — IMPORTADOR DE GANADO", "", "", "", ""],
      ["Llena la hoja 'Animales' siguiendo estas instrucciones. Las columnas en ROJO son obligatorias.", "", "", "", ""],
      ["", "", "", "", ""],
      ["COLUMNA", "OBLIGATORIA", "DESCRIPCIÓN", "VALORES VÁLIDOS", "EJEMPLO"],

      // ── Bloque: Datos básicos ──
      ["── DATOS BÁSICOS DEL ANIMAL ──", "", "", "", ""],
      ["Arete",
       "SÍ — obligatorio",
       "Número o código único que identifica al animal. No puede repetirse.",
       "Cualquier texto. Recomendado: prefijo + número (VC-001, SM-003)",
       "VC-001"],
      ["Tipo",
       "SÍ — obligatorio",
       "Categoría del animal. El sistema usa este valor para clasificarlo correctamente.",
       "Vaca | Novillona | Torete | Becerro | Becerra | Semental",
       "Vaca"],
      ["Sexo",
       "SÍ — obligatorio",
       "Sexo biológico del animal.",
       "Hembra | Macho",
       "Hembra"],
      ["Raza",
       "No",
       "Raza genética del animal. Texto libre.",
       "Cualquier texto (Brahman, Angus, Hereford, Brangus, Charolais...)",
       "Brahman"],
      ["Fecha_Nacimiento",
       "No (muy recomendada)",
       "Fecha de nacimiento. Permite calcular edad, GDP y alertas de fertilidad automáticamente.",
       "Formato: YYYY-MM-DD  Ej: 2018-05-15  También acepta DD/MM/YYYY",
       "2018-05-15"],
      ["Peso_kg",
       "No (recomendada)",
       "Peso actual del animal en kilogramos. Solo número, sin 'kg'.",
       "Número entero o decimal. Ej: 480 o 482.5",
       "480"],
      ["Estado",
       "No (default: Sano)",
       "Estado actual del animal. Si se deja vacío se registra como 'Sano'.",
       "Sano | Desecho | Disponible para Venta | Baja - Muerte | Baja - Venta | Baja - Venta (Desecho) | Alerta: Revisión de Fertilidad",
       "Sano"],
      ["Potrero",
       "No",
       "Nombre exacto del potrero donde está el animal. Debe coincidir con los potreros creados en 'Mi Rancho'.",
       "Texto exacto del nombre del potrero ya registrado en la app.",
       "Potrero Norte"],
      ["Grupo",
       "No",
       "Nombre exacto del grupo de manejo. Debe coincidir con los grupos creados en 'Mi Rancho'.",
       "Texto exacto del nombre del grupo ya registrado en la app.",
       "Vacas Secas"],
      ["Arete_Madre",
       "No",
       "Arete de la madre del animal. Permite trazabilidad genética.",
       "Arete de la madre (debe existir en el archivo o en la base de datos)",
       "VC-001"],
      ["Arete_Padre",
       "No",
       "Arete del semental padre.",
       "Arete del padre (debe existir en el archivo o en la base de datos)",
       "SM-001"],

      // ── Bloque: Parto ──
      ["", "", "", "", ""],
      ["── ÚLTIMO PARTO (genera un evento de Parto en el historial) ──", "", "", "", ""],
      ["Fecha_Ultimo_Parto",
       "No — pero MUY recomendada para vacas",
       "Fecha del último parto registrado. SIN este dato, una vaca menor de 48 meses que ya ha parido aparecerá clasificada incorrectamente como 'Novillona'. También alimenta el Reporte de Vientres y las Métricas de Productividad.",
       "Formato: YYYY-MM-DD  Solo aplica para Vacas y Novillonas que ya parieron.",
       "2024-11-10"],

      // ── Bloque: Palpación ──
      ["", "", "", "", ""],
      ["── PALPACIÓN RECIENTE (genera un evento de Palpación en el historial) ──", "", "", "", ""],
      ["Resultado_Palpacion",
       "No — recomendada para vientres",
       "Resultado de la última palpación. Alimenta el Reporte de Reproducción (% de preñez por mes). Si está Gestante, el sistema proyectará automáticamente la fecha estimada de parto.",
       "Gestante | Vacía - Fresca | Vacía - Ciclando | Vacía - Anestro",
       "Gestante"],
      ["Meses_Gestacion",
       "No — requerida si Resultado_Palpacion = Gestante",
       "Meses de gestación al momento de la palpación. Necesario para que la Proyección de Partos calcule la fecha estimada de nacimiento.",
       "Número del 1 al 9. Ej: 4 significa 4 meses de gestación.",
       "4"],
      ["Fecha_Palpacion",
       "No — recomendada si llenaste Resultado_Palpacion",
       "Fecha en que se realizó la palpación. Si se deja vacío se usará la fecha de importación. Importante para que la proyección de partos sea exacta.",
       "Formato: YYYY-MM-DD",
       "2025-01-15"],

      // ── Bloque: Repeso ──
      ["", "", "", "", ""],
      ["── REPESO ANTERIOR (genera un evento de Repeso para calcular GDP) ──", "", "", "", ""],
      ["Peso_Anterior_kg",
       "No — recomendada para desarrollo",
       "Un peso anterior del animal (distinto al peso actual). Junto con Fecha_Peso_Anterior, permite que el sistema calcule la Ganancia Diaria de Peso (GDP) desde el primer día. Sin este dato, el Reporte de Desarrollo mostrará GDP = 0.000 para los animales importados.",
       "Número en kg. Debe ser menor al Peso_kg actual para que el cálculo sea coherente.",
       "430"],
      ["Fecha_Peso_Anterior",
       "No — requerida si llenaste Peso_Anterior_kg",
       "Fecha en que se tomó ese peso anterior.",
       "Formato: YYYY-MM-DD",
       "2024-09-01"],

      // ── Bloque: Inseminación ──
      ["", "", "", "", ""],
      ["── ÚLTIMA INSEMINACIÓN (genera un evento de Inseminación) ──", "", "", "", ""],
      ["Fecha_Inseminacion",
       "No",
       "Fecha de la última inseminación o monta. Se usa como respaldo para la Proyección de Partos: si no hay palpación registrada, el sistema suma 285 días a esta fecha para estimar la fecha de parto.",
       "Formato: YYYY-MM-DD  Solo aplica para Vacas y Novillonas.",
       "2024-07-20"],

      // ── Bloque: Vacunación ──
      ["", "", "", "", ""],
      ["── ÚLTIMA VACUNACIÓN (genera un evento de Vacunación en el historial) ──", "", "", "", ""],
      ["Fecha_Ultima_Vacuna",
       "No",
       "Fecha de la última vacuna aplicada. Aparece en el Reporte de Vientres como 'Último Evento Médico' y sirve para saber cuándo corresponde revacunar.",
       "Formato: YYYY-MM-DD",
       "2024-10-05"],
      ["Producto_Vacuna",
       "No — recomendada si llenaste Fecha_Ultima_Vacuna",
       "Nombre del producto o vacuna aplicada.",
       "Texto libre. Ej: Clostridial, IBR, DVB, Brucella, Leptospira, Triple...",
       "Clostridial"],

      // ── Notas finales ──
      ["", "", "", "", ""],
      ["── NOTAS IMPORTANTES ──", "", "", "", ""],
      ["1. Fechas",
       "",
       "Usa siempre el formato YYYY-MM-DD (año-mes-día). También acepta DD/MM/YYYY.",
       "Correcto: 2024-11-10 | 10/11/2024    Incorrecto: Nov 10, 2024 | 10-Nov-24",
       ""],
      ["2. Potreros y Grupos",
       "",
       "Crea los Potreros y Grupos en 'Mi Rancho' ANTES de importar. El nombre debe ser idéntico (mayúsculas/minúsculas no importan).",
       "Si el potrero no existe, el animal quedará sin potrero asignado. No causará error.",
       ""],
      ["3. La importación AGREGA",
       "",
       "La importación NO borra datos existentes. Cada vez que importas se suman animales nuevos a los que ya existen.",
       "",
       ""],
      ["4. Columnas opcionales vacías",
       "",
       "Si una columna opcional no aplica, déjala completamente vacía (no escribas 'N/A' ni guiones).",
       "",
       ""],
      ["5. Tipo vs Edad",
       "",
       "El sistema recalculará la categoría automáticamente según la Fecha_Nacimiento. Si pones Tipo='Vaca' pero la fecha de nacimiento indica que tiene 8 meses, el sistema la reclasificará como Becerra.",
       "",
       ""],
    ];

    const ws2 = XLSX.utils.aoa_to_sheet(guia);
    ws2["!cols"] = [
      {wch:30}, {wch:22}, {wch:55}, {wch:50}, {wch:18}
    ];
    // Fijar la fila de encabezado de columnas (fila 4) como referencia visual
    ws2["!freeze"] = { xSplit: 0, ySplit: 4 };

    XLSX.utils.book_append_sheet(wb, ws2, "Guía de Llenado");

    XLSX.writeFile(wb, "plantilla_importacion_ganado.xlsx");
  };

  // ─── Helpers ─────────────────────────────────────────────────────────────────

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
        } catch (err) { reject(err); }
      };
      reader.onerror = reject;
      reader.readAsArrayBuffer(file);
    });
  };

  // ─── Importación real ─────────────────────────────────────────────────────────

  const subirArchivo = async () => {
    if (!archivo) return;
    setCargando(true);
    setErrores([]);
    setMensajeExito(false);

    const tiposValidos = ["Vaca", "Novillona", "Torete", "Becerro", "Becerra", "Semental"];
    const sexosValidos = ["Hembra", "Macho"];
    const resultadosPalpValidos = ["Gestante", "Vacía - Fresca", "Vacía - Ciclando", "Vacía - Anestro"];
    const hoy = new Date().toISOString().split("T")[0];

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
        const tipo  = String(fila["Tipo"]  || "").trim();
        const sexo  = String(fila["Sexo"]  || "").trim();

        if (!arete) { erroresEncontrados.push(`Fila ${numFila}: La columna "Arete" está vacía.`); return; }
        if (!tiposValidos.includes(tipo)) {
          erroresEncontrados.push(`Fila ${numFila} (${arete}): Tipo "${tipo}" no válido. Opciones: ${tiposValidos.join(", ")}`);
          return;
        }
        if (!sexosValidos.includes(sexo)) {
          erroresEncontrados.push(`Fila ${numFila} (${arete}): Sexo "${sexo}" no válido. Usa "Hembra" o "Macho".`);
          return;
        }

        // Validar Resultado_Palpacion si está llenado
        const resultadoPalp = String(fila["Resultado_Palpacion"] || "").trim();
        if (resultadoPalp && !resultadosPalpValidos.includes(resultadoPalp)) {
          erroresEncontrados.push(`Fila ${numFila} (${arete}): Resultado_Palpacion "${resultadoPalp}" no válido. Opciones: ${resultadosPalpValidos.join(", ")}`);
          return;
        }

        // Validar Meses_Gestacion si hay palpación Gestante
        const mesesGes = Number(fila["Meses_Gestacion"]) || 0;
        if (resultadoPalp === "Gestante" && (mesesGes < 1 || mesesGes > 9)) {
          erroresEncontrados.push(`Fila ${numFila} (${arete}): Si Resultado_Palpacion es "Gestante", Meses_Gestacion debe ser un número del 1 al 9.`);
          return;
        }

        // Construir objeto del animal
        const animal = {
          arete,
          tipo,
          sexo,
          raza:            String(fila["Raza"] || "").trim(),
          fechaNacimiento: normalizarFecha(fila["Fecha_Nacimiento"]),
          pesoActual:      Number(fila["Peso_kg"]) || 0,
          estado:          String(fila["Estado"] || "Sano").trim() || "Sano",
          potrero:         String(fila["Potrero"] || "").trim(),
          grupo:           String(fila["Grupo"] || "").trim(),
          madre:           String(fila["Arete_Madre"] || "").trim(),
          padre:           String(fila["Arete_Padre"] || "").trim(),
          fechaRegistro:   hoy,
          ranchoId:        usuario?.ranchoId || null,
        };

        // Si hay palpación gestante en el Excel, el estado inicial del animal debe ser Gestante
        if (resultadoPalp === "Gestante") {
          animal.estado = "Gestante";
        }

        // Construir eventos a crear
        const eventos = [];

        // Evento: Parto
        const fechaParto = normalizarFecha(fila["Fecha_Ultimo_Parto"]);
        if (fechaParto) {
          eventos.push({ tipo: "Parto", resultado: "Importado del histórico", fecha: fechaParto, costo: 0 });
        }

        // Evento: Palpación
        if (resultadoPalp) {
          const fechaPalp = normalizarFecha(fila["Fecha_Palpacion"]) || hoy;
          const resultadoFinal = resultadoPalp === "Gestante"
            ? `Gestante ${mesesGes} meses`
            : resultadoPalp;
          eventos.push({ tipo: "Palpación", resultado: resultadoFinal, fecha: fechaPalp, costo: 100 });
        }

        // Evento: Repeso anterior (para GDP)
        const pesoAnterior = Number(fila["Peso_Anterior_kg"]) || 0;
        const fechaPesoAnt = normalizarFecha(fila["Fecha_Peso_Anterior"]);
        if (pesoAnterior > 0 && fechaPesoAnt) {
          eventos.push({ tipo: "Repeso", resultado: `${pesoAnterior} kg`, fecha: fechaPesoAnt, costo: 0 });
        }

        // Evento: Inseminación
        const fechaInsem = normalizarFecha(fila["Fecha_Inseminacion"]);
        if (fechaInsem) {
          eventos.push({ tipo: "Inseminación", resultado: "IA - Importado del histórico", fecha: fechaInsem, costo: 0 });
        }

        // Evento: Vacunación
        const fechaVacuna = normalizarFecha(fila["Fecha_Ultima_Vacuna"]);
        const productoVacuna = String(fila["Producto_Vacuna"] || "").trim();
        if (fechaVacuna) {
          eventos.push({ tipo: "Vacunación", resultado: productoVacuna || "Vacuna importada", fecha: fechaVacuna, costo: 0 });
        }

        animalesValidos.push({ animal, eventos });
      });

      if (erroresEncontrados.length > 0) {
        setErrores(erroresEncontrados);
        setCargando(false);
        return;
      }

      // Subir a Firestore
      for (const { animal, eventos } of animalesValidos) {
        const docRef = await addDoc(collection(db, "animales"), animal);
        for (const evento of eventos) {
          await addDoc(collection(db, "eventos"), { ...evento, animalId: docRef.id, ranchoId: usuario?.ranchoId || null });
        }
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
        const snap = await getDocs(query(collection(db, col), where("ranchoId", "==", usuario?.ranchoId)));
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
      { nombre: "Potrero Norte", hectareas: 50, tipoPastoNombre: "Bermudas", porcentajePasto: 85, tipoPastoTamano: "corto", divisiones: ["Sección A", "Sección B"] },
      { nombre: "Potrero Sur", hectareas: 100, tipoPastoNombre: "Estrella", porcentajePasto: 90, tipoPastoTamano: "mediano", divisiones: ["Sección 1", "Sección 2", "Sección 3"] },
      { nombre: "Potrero Maternidad", hectareas: 20, tipoPastoNombre: "Pangola", porcentajePasto: 95, tipoPastoTamano: "corto", divisiones: ["Lote Único"] },
      { nombre: "Corral Engorda", hectareas: 5, tipoPastoNombre: "Taiwán", porcentajePasto: 100, tipoPastoTamano: "corte", divisiones: ["Corral 1", "Corral 2"] },
      { nombre: "Pradera Abierta", hectareas: 200, tipoPastoNombre: "Mombasa", porcentajePasto: 80, tipoPastoTamano: "alto", divisiones: ["Este", "Oeste", "Norte"] }
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

    // 150 animales totales
    for(let i=0; i<70; i++){
      animalesAGenerar.push({
        arete: `VC-${getRandomInt(1000, 9999)}`,
        tipo: "Vaca", sexo: "Hembra", raza: getRandom(razas),
        fechaNacimiento: restarMesesAFecha(getRandomInt(50, 120)),
        pesoActual: getRandomInt(400, 650),
        estado: Math.random() > 0.1 ? "Sano" : "Desecho", // Casos de desecho
        potrero: getRandom(potrerosNombres), grupo: "Vacas",
        fechaRegistro: new Date().toISOString().split('T')[0],
        ranchoId: usuario?.ranchoId
      });
    }
    for(let i=0; i<20; i++){
      const meses = i < 5 ? 60 : getRandomInt(14, 30); // 5 novillonas de 5 años para activar el KPI de Infertilidad
      animalesAGenerar.push({
        arete: `NV-${getRandomInt(1000, 9999)}`,
        tipo: "Novillona", sexo: "Hembra", raza: getRandom(razas),
        fechaNacimiento: restarMesesAFecha(meses),
        pesoActual: getRandomInt(280, 420),
        estado: "Sano",
        potrero: getRandom(potrerosNombres), grupo: "Desarrollo",
        fechaRegistro: new Date().toISOString().split('T')[0],
        ranchoId: usuario?.ranchoId
      });
    }
    for(let i=0; i<15; i++){
      animalesAGenerar.push({
        arete: `TR-${getRandomInt(1000, 9999)}`,
        tipo: "Torete", sexo: "Macho", raza: getRandom(razas),
        fechaNacimiento: restarMesesAFecha(getRandomInt(13, 20)), // Edad perfecta para ser Torete (1-2 años)
        pesoActual: getRandomInt(350, 500),
        estado: "Sano",
        potrero: getRandom(potrerosNombres), grupo: "Engorda",
        fechaRegistro: new Date().toISOString().split('T')[0],
        ranchoId: usuario?.ranchoId
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
        potrero: getRandom(potrerosNombres), grupo: "Crías Lactantes",
        fechaRegistro: new Date().toISOString().split('T')[0],
        ranchoId: usuario?.ranchoId
      });
    }
    for(let i=0; i<5; i++){
      animalesAGenerar.push({
        arete: `SM-${getRandomInt(100, 999)}`,
        tipo: "Semental", sexo: "Macho", raza: getRandom(razas),
        fechaNacimiento: restarMesesAFecha(getRandomInt(60, 100)),
        pesoActual: getRandomInt(800, 1100),
        estado: "Sano",
        potrero: getRandom(potrerosNombres), grupo: "Sementales",
        fechaRegistro: new Date().toISOString().split('T')[0],
        ranchoId: usuario?.ranchoId
      });
    }

    // Algunos casos de Baja (Índice de Bajas)
    for(let i=0; i<4; i++){
       const a = animalesAGenerar[getRandomInt(0, 149)];
       a.estado = Math.random() > 0.5 ? "Baja - Muerte" : "Baja - Venta";
       a.fechaBaja = new Date().toISOString().split('T')[0];
    }

    animalesAGenerar.forEach(a => {
      const rand = Math.random();
      if (rand < 0.03) { a.estado = "Baja - Muerte"; a.fechaBaja = new Date().toISOString().split('T')[0]; }
      else if (rand < 0.06 && a.tipo === "Vaca") { a.estado = "Baja - Venta (Desecho)"; a.fechaBaja = new Date().toISOString().split('T')[0]; }
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
      for(let p of potrerosDemo) await addDoc(collection(db, "potreros"), { ...p, ranchoId: usuario?.ranchoId });
      for(let g of gruposDemo)   await addDoc(collection(db, "grupos"), { ...g, ranchoId: usuario?.ranchoId });

      const batchSize = animalesAGenerar.length;
      for(let i=0; i<batchSize; i++) {
        const docRef  = await addDoc(collection(db, "animales"), animalesAGenerar[i]);
        const animalId = docRef.id;
        const animal  = animalesAGenerar[i];
        const misPromesas = [];

        // Historial de Peso (Mínimo 2 pesajes para GDP)
        if (["Becerro","Becerra","Novillona","Torete"].includes(animal.tipo)) {
          misPromesas.push(addDoc(collection(db, "eventos"), {
            animalId, tipo: "Repeso",
            resultado: `${getRandomInt(animal.pesoActual - 60, animal.pesoActual - 40)} kg`,
            fecha: restarMesesAFecha(6), costo: 0, ranchoId: usuario?.ranchoId
          }));
          misPromesas.push(addDoc(collection(db, "eventos"), {
            animalId, tipo: "Repeso",
            resultado: `${getRandomInt(animal.pesoActual - 30, animal.pesoActual - 15)} kg`,
            fecha: restarMesesAFecha(3), costo: 0, ranchoId: usuario?.ranchoId
          }));
        }

        // Otros eventos médicos aleatorios
        for(let j=0; j<getRandomInt(1,3); j++) {
          const tipoEv = getRandom(tiposEvento);
          const resultado = tipoEv === "Vacunación"  ? getRandom(vacunas) :
                            tipoEv === "Repeso"      ? `${getRandomInt(animal.pesoActual - 5, animal.pesoActual + 10)} kg` :
                            tipoEv === "Tratamiento" ? getRandom(tratamientos) : "Ivermectina 1%";
          misPromesas.push(addDoc(collection(db, "eventos"), {
            animalId, tipo: tipoEv, resultado,
            fecha: generarFechaAleatoria(j === 0 ? 1 : 12), costo: getRandomInt(50, 400), ranchoId: usuario?.ranchoId
          }));
        }

        // Reproducción realista para Vacas y Novillonas
        if (["Vaca","Novillona"].includes(animal.tipo)) {
          const rand = Math.random();
          if (rand > 0.4) { // 60% probabilidad de estar gestante en la demo
            const meses = getRandomInt(2, 7);
            const resG = `Gestante ${meses} meses`;
            misPromesas.push(addDoc(collection(db, "eventos"), {
              animalId, tipo: "Palpación", resultado: resG,
              fecha: format(new Date(), "yyyy-MM-dd"), costo: 100, ranchoId: usuario?.ranchoId
            }));
            misPromesas.push(updateDoc(doc(db, "animales", animalId), { estado: "Gestante" }));
          } else {
            misPromesas.push(addDoc(collection(db, "eventos"), {
              animalId, tipo: "Palpación", resultado: "Vacía - Ciclando",
              fecha: generarFechaAleatoria(2), costo: 100, ranchoId: usuario?.ranchoId
            }));
          }
          
          if (animal.tipo === "Vaca") {
            // Un parto reciente para alimentar KPIs de productividad
            const mesesAtrasParto1 = getRandomInt(3, 10);
            const fechaParto1 = restarMesesAFecha(mesesAtrasParto1);
            misPromesas.push(addDoc(collection(db, "eventos"), { 
              animalId, tipo: "Parto", resultado: "Cría sana", fecha: fechaParto1, costo: 0, ranchoId: usuario?.ranchoId 
            }));

            // Segundo parto anterior para habilitar el KPI de IEP (Intervalo Entre Partos)
            // Calculamos un intervalo realista de entre 12 y 14 meses atrás del primer parto
            const mesesAtrasParto2 = mesesAtrasParto1 + getRandomInt(12, 14); 
            const fechaParto2 = restarMesesAFecha(mesesAtrasParto2);
            misPromesas.push(addDoc(collection(db, "eventos"), { 
              animalId, tipo: "Parto", resultado: "Cría sana", fecha: fechaParto2, costo: 0, ranchoId: usuario?.ranchoId 
            }));
          }
        }
        await Promise.all(misPromesas);
      }

      // Generar alertas/recordatorios (futuras actividades)
      const alertasPromesas = [];
      const generarFechaFutura = (diasAdelante) => {
        let d = new Date();
        d.setDate(d.getDate() + diasAdelante);
        return d.toISOString().split('T')[0];
      };

      alertasPromesas.push(addDoc(collection(db, "alertas"), {
        titulo: "Vacunación - Crías Lactantes",
        tipo: "Vacunación",
        fechaProgramada: generarFechaFutura(getRandomInt(5, 15)),
        objetivoTipo: "Grupo",
        objetivoNombre: "Crías Lactantes",
        completada: false,
        origen: "planeado",
        ranchoId: usuario?.ranchoId
      }));

      alertasPromesas.push(addDoc(collection(db, "alertas"), {
        titulo: "Desparasitación - Potrero Norte",
        tipo: "Desparasitación",
        fechaProgramada: generarFechaFutura(getRandomInt(10, 25)),
        objetivoTipo: "Potrero",
        objetivoNombre: "Potrero Norte",
        completada: false,
        origen: "planeado",
        ranchoId: usuario?.ranchoId
      }));

      alertasPromesas.push(addDoc(collection(db, "alertas"), {
        titulo: "Palpación - Vacas",
        tipo: "Palpación",
        fechaProgramada: generarFechaFutura(getRandomInt(2, 8)),
        objetivoTipo: "Grupo",
        objetivoNombre: "Vacas",
        completada: false,
        origen: "planeado",
        ranchoId: usuario?.ranchoId
      }));
      
      if (animalesAGenerar.length > 0) {
        alertasPromesas.push(addDoc(collection(db, "alertas"), {
          titulo: "Tratamiento - " + animalesAGenerar[0].arete,
          tipo: "Tratamiento",
          fechaProgramada: generarFechaFutura(getRandomInt(1, 3)),
          objetivoTipo: "Animal",
          objetivoNombre: animalesAGenerar[0].arete,
          completada: false,
          origen: "planeado",
          ranchoId: usuario?.ranchoId
        }));
      }

      await Promise.all(alertasPromesas);

      setContadorImportados(batchSize);
      setMensajeExito(true);
      await setDoc(doc(db, "configuracion", `demoGenerada_${usuario?.ranchoId}`), { fecha: new Date().toISOString(), cantidad: batchSize });
      setDemoYaGenerada(true);
    } catch (e) { console.error("Error inyectando data", e); }

    setCargandoDemo(false);
  };

  // ─── UI ──────────────────────────────────────────────────────────────────────

  return (
    <div className="admin-container">
      <div className="header">
        <h1>Importar Inventario de Ganado</h1>
        <p>Sube tu Excel con el inventario actual. Descarga la plantilla para ver el formato y la guía de llenado.</p>
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
        Descargar Plantilla Excel (con Guía de Llenado)
      </button>

      {/* Zona de carga */}
      <label className="upload-box" htmlFor="excel-upload" style={{ display: "block" }}>
        <UploadCloud size={48} color="#9ca3af" style={{ margin: "0 auto" }} />
        <h3 style={{ color: "#374151", marginTop: "16px" }}>Haz clic para subir tu Excel</h3>
        <p style={{ color: "#6b7280", fontSize: "14px" }}>Archivos soportados: .xlsx, .xls, .csv</p>
        <input id="excel-upload" type="file" accept=".xlsx, .xls, .csv"
          style={{ display: "none" }} onChange={manejarCambioArchivo} />
      </label>

      {archivo && (
        <div style={{ marginTop: "24px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", color: "#4b5563" }}>
            <FileSpreadsheet size={24} color="#3b82f6" />
            <span>Archivo listo: <strong>{archivo.name}</strong></span>
          </div>
          <button className="btn-primary" onClick={subirArchivo} disabled={cargando}>
            {cargando ? "Procesando animales..." : "Importar al Sistema"}
          </button>
        </div>
      )}

      {/* Errores de validación */}
      {errores.length > 0 && (
        <div style={{
          marginTop: "20px", backgroundColor: "#fef2f2",
          border: "1px solid #fca5a5", borderRadius: "8px", padding: "16px"
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
          <span>¡{contadorImportados} animales importados exitosamente! Ve a "Mi Ganado" para verlos.</span>
        </div>
      )}

      {/* Generador de Demo */}
      {usuario?.rol === "admin" && (
        <>
          {!demoYaGenerada ? (
        <div style={{ marginTop: "50px", paddingTop: "30px", borderTop: "2px dashed #e5e7eb", textAlign: "center" }}>
          <Database size={40} color="#10b981" style={{ margin: "0 auto" }} />
          <h3 style={{ color: "#374151", marginTop: "10px" }}>¿Necesitas datos para probar la aplicación?</h3>
          <p style={{ color: "#6b7280", fontSize: "14px", marginBottom: "20px" }}>
            Esta función inyectará 150 cabezas de ganado simuladas con historial médico completo.
          </p>
          <button
            className="btn-primary"
            style={{ backgroundColor: "#10b981", maxWidth: "300px", margin: "0 auto" }}
            onClick={generarBaseDemo} disabled={cargandoDemo}
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
              if (!window.confirm("⚠️ Esto borrará TODOS los animales, eventos y alertas. ¿Continuar?")) return;
              setCargandoDemo(true);
              try {
                const cols = ["animales", "eventos", "alertas", "potreros", "grupos"];
                for (const col of cols) {
                  const snap = await getDocs(query(collection(db, col), where("ranchoId", "==", usuario?.ranchoId)));
                  await Promise.all(snap.docs.map(d => deleteDoc(doc(db, col, d.id))));
                }
                await deleteDoc(doc(db, "configuracion", `demoGenerada_${usuario?.ranchoId}`));
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

          <button
            className="btn-outline"
            style={{ borderColor: "#3b82f6", color: "#3b82f6", display: "inline-flex", alignItems: "center", gap: "6px", padding: "8px 16px", marginLeft: "10px" }}
            onClick={async () => {
              try {
                const snap = await getDocs(query(collection(db, "animales"), where("ranchoId", "==", usuario?.ranchoId)));
                const data = snap.docs.map(doc => doc.data());
                if (data.length === 0) return alert("No hay datos para exportar.");
                const ws = XLSX.utils.json_to_sheet(data);
                const wb = XLSX.utils.book_new();
                XLSX.utils.book_append_sheet(wb, ws, "Inventario");
                XLSX.writeFile(wb, "Base_Prueba_Ganado.xlsx");
              } catch (e) { console.error(e); }
            }}
          >
            <Download size={16} />
            Descargar Base en Excel
          </button>
        </div>
      )}
        </>
      )}
    </div>
  );
}
