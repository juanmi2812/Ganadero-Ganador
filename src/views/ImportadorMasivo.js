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
      "Arete", "Nombre", "Arete_SINIIGA", "Tipo", "Sexo", "Raza", "Fecha_Nacimiento", "Peso_kg", 
      "Estado", "Potrero", "Grupo", "Arete_Madre", "Arete_Padre",
      "Fecha_Ultimo_Parto", "Fecha_Parto_1", "Fecha_Parto_2", "Fecha_Parto_3", "Fecha_Parto_4",
      "Fecha_Parto_5", "Fecha_Parto_6", "Fecha_Parto_7", "Fecha_Parto_8", "Fecha_Parto_9", "Fecha_Parto_10",
      "Resultado_Palpacion", "Meses_Gestacion", "Fecha_Palpacion",
      "Peso_Anterior_kg", "Fecha_Peso_Anterior",
      "Fecha_Inseminacion",
      "Fecha_Ultima_Vacuna", "Producto_Vacuna"
    ]];

    const ejemplos = [
      ["VC-001", "La Pinta", "0900000001", "Vaca", "Hembra", "Brahman",
       "2018-05-15", 480, "Sano",
       "Potrero Norte", "Vacas", "", "SM-001",
       "2024-11-10", "", "", "", "", "", "", "", "", "", "",
       "Gestante", 4, "2025-01-15",
       430, "2024-09-01",
       "2024-07-20",
       "2024-10-05", "Clostridial"]
    ];

    const ws1 = XLSX.utils.aoa_to_sheet([...encabezados, ...ejemplos]);
    ws1["!cols"] = [
      {wch:12},{wch:15},{wch:15},{wch:10},{wch:8},{wch:12},
      {wch:16},{wch:9},{wch:10},
      {wch:15},{wch:15},{wch:13},{wch:13},
      {wch:16},{wch:12},{wch:12},{wch:12},{wch:12},{wch:12},{wch:12},{wch:12},{wch:12},{wch:12},{wch:12},
      {wch:20},{wch:15},{wch:15},
      {wch:16},{wch:17},
      {wch:16},
      {wch:17},{wch:16}
    ];
    XLSX.utils.book_append_sheet(wb, ws1, "Animales");

    // ── Hoja 2: Guía de llenado ────────────────────────────────────────────────
    const guia = [
      ["GUÍA DE LLENADO — IMPORTADOR DE GANADO", "", "", "", ""],
      ["Llena la hoja 'Animales' siguiendo estas instrucciones.", "", "", "", ""],
      ["", "", "", "", ""],
      ["COLUMNA", "OBLIGATORIA", "DESCRIPCIÓN", "VALORES VÁLIDOS", "EJEMPLO"],

      ["Arete",
       "SÍ — obligatorio",
       "Identificador interno o número de control principal (corto). Ejemplo: VC-002, 105",
       "Cualquier texto o número corto.",
       "VC-002"],
      ["Nombre",
       "No",
       "Nombre de pila del animal si lo tiene.",
       "Texto.",
       "La Pinta"],
      ["Arete_SINIIGA",
       "No",
       "Arete Oficial o de SINIIGA (largo).",
       "Número oficial (ej. 09 123 4567 8)",
       "0912345678"],
      ["Tipo",
       "SÍ — obligatorio",
       "Categoría del animal.",
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
       "Fecha de nacimiento.",
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

      // ── Bloque: Partos ──
      ["", "", "", "", ""],
      ["── HISTORIAL DE PARTOS (genera eventos de Parto en el historial) ──", "", "", "", ""],
      ["Fecha_Ultimo_Parto",
       "No — pero MUY recomendada para vacas",
       "Fecha del último parto registrado. Permite calcular métricas productivas.",
       "Formato: YYYY-MM-DD",
       "2024-11-10"],
      ["Fecha_Parto_1", "No", "Fecha de un parto histórico (1).", "Formato: YYYY-MM-DD", "2023-11-10"],
      ["Fecha_Parto_2", "No", "Fecha de un parto histórico (2).", "Formato: YYYY-MM-DD", "2022-11-10"],
      ["Fecha_Parto_3", "No", "Fecha de un parto histórico (3).", "Formato: YYYY-MM-DD", ""],
      ["Fecha_Parto_4", "No", "Fecha de un parto histórico (4).", "Formato: YYYY-MM-DD", ""],
      ["Fecha_Parto_5", "No", "Fecha de un parto histórico (5).", "Formato: YYYY-MM-DD", ""],
      ["Fecha_Parto_6", "No", "Fecha de un parto histórico (6).", "Formato: YYYY-MM-DD", ""],
      ["Fecha_Parto_7", "No", "Fecha de un parto histórico (7).", "Formato: YYYY-MM-DD", ""],
      ["Fecha_Parto_8", "No", "Fecha de un parto histórico (8).", "Formato: YYYY-MM-DD", ""],
      ["Fecha_Parto_9", "No", "Fecha de un parto histórico (9).", "Formato: YYYY-MM-DD", ""],
      ["Fecha_Parto_10", "No", "Fecha de un parto histórico (10).", "Formato: YYYY-MM-DD", ""],

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
        let tipo  = String(fila["Tipo"]  || "").trim();
        let sexo  = String(fila["Sexo"]  || "").trim();

        if (!arete) { erroresEncontrados.push(`Fila ${numFila}: La columna "Arete" está vacía.`); return; }
        
        // Auto-corrección de Sexo
        if (sexo.toLowerCase() === "macho" || sexo.toLowerCase() === "m") sexo = "Macho";
        else sexo = "Hembra"; // Default a Hembra si está mal escrito o vacío

        // Auto-corrección de Tipo
        if (tipo) {
            tipo = tipo.charAt(0).toUpperCase() + tipo.slice(1).toLowerCase();
        }
        if (!tiposValidos.includes(tipo)) {
            tipo = sexo === "Macho" ? "Torete" : "Vaca"; // Default razonable
        }

        // Auto-corrección de Palpación
        let rawPalp = String(fila["Resultado_Palpacion"] || "").trim().toLowerCase();
        let resultadoPalp = "";
        if (rawPalp.includes("gestante") || rawPalp.includes("preñada") || rawPalp === "si") resultadoPalp = "Gestante";
        else if (rawPalp.includes("fresca")) resultadoPalp = "Vacía - Fresca";
        else if (rawPalp.includes("anestro")) resultadoPalp = "Vacía - Anestro";
        else if (rawPalp.includes("vacia") || rawPalp.includes("vacía") || rawPalp.includes("ciclando")) resultadoPalp = "Vacía - Ciclando";

        // Auto-corrección Meses Gestación
        let mesesGes = Number(fila["Meses_Gestacion"]) || 0;
        if (resultadoPalp === "Gestante" && (mesesGes < 1 || mesesGes > 9)) {
            mesesGes = 1; // Default a 1 mes si no lo pusieron bien
        }

        // Construir objeto del animal
        const animal = {
          arete,
          nombre:          String(fila["Nombre"] || "").trim(),
          areteSiniiga:    String(fila["Arete_SINIIGA"] || "").trim(),
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

        // Eventos: Partos (Último parto y hasta 10 históricos)
        const posiblesFechasPartos = [normalizarFecha(fila["Fecha_Ultimo_Parto"])];
        for (let i = 1; i <= 10; i++) {
          posiblesFechasPartos.push(normalizarFecha(fila[`Fecha_Parto_${i}`]));
        }
        
        // Quitar duplicados o vacíos (por si alguien repite la fecha)
        const fechasPartosUnicas = [...new Set(posiblesFechasPartos.filter(f => f))];
        
        fechasPartosUnicas.forEach(fechaP => {
          eventos.push({ tipo: "Parto", resultado: "Importado del histórico", fecha: fechaP, costo: 0 });
        });

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

      // Autocreación de potreros y grupos
      const potrerosUnicos = [...new Set(animalesValidos.map(a => a.animal.potrero).filter(p => p !== ""))];
      const gruposUnicos = [...new Set(animalesValidos.map(a => a.animal.grupo).filter(g => g !== ""))];

      const snapPotreros = await getDocs(query(collection(db, "potreros"), where("ranchoId", "==", usuario?.ranchoId)));
      const potrerosExistentes = snapPotreros.docs.map(d => d.data().nombre);
      const snapGrupos = await getDocs(query(collection(db, "grupos"), where("ranchoId", "==", usuario?.ranchoId)));
      const gruposExistentes = snapGrupos.docs.map(d => d.data().nombre);

      for (const p of potrerosUnicos) {
        if (!potrerosExistentes.includes(p)) {
          await addDoc(collection(db, "potreros"), { nombre: p, hectareas: 0, ranchoId: usuario?.ranchoId || null });
        }
      }
      for (const g of gruposUnicos) {
        if (!gruposExistentes.includes(g)) {
          await addDoc(collection(db, "grupos"), { nombre: g, ranchoId: usuario?.ranchoId || null });
        }
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

  // ─── Limpiar Base de Datos (Peligro) ──────────────────────────────────────────
  const limpiarRanchoCompletamente = async () => {
    if (!window.confirm("⚠️ ALERTA ROJA: Esto borrará de forma irreversible TODOS tus animales, eventos, potreros y grupos. Tu cuenta quedará totalmente en blanco. ¿Estás absolutamente seguro de continuar?")) return;
    
    setCargandoDemo(true);
    try {
      const colecciones = ["animales", "eventos", "alertas", "potreros", "grupos", "eventosPotreros"];
      for (const col of colecciones) {
        const snap = await getDocs(query(collection(db, col), where("ranchoId", "==", usuario?.ranchoId)));
        await Promise.all(snap.docs.map(d => deleteDoc(doc(db, col, d.id))));
      }
      setMensajeExito(false);
      alert("La cuenta ha sido borrada. Está lista para una importación desde cero.");
    } catch (e) {
      console.error("Error limpiando rancho:", e);
      alert("Hubo un error borrando los datos.");
    }
    setCargandoDemo(false);
  };

  // ─── Generador de Demo ────────────────────────────────────────────────────────

  const generarBaseDemo = async () => {
    if(!window.confirm("Esto limpiará cualquier dato existente y generará 150 animales con historial médico completo. ¿Continuar?")) return;

    setCargandoDemo(true);
    setMensajeExito(false);

    try {
      const colecciones = ["animales", "eventos", "alertas", "potreros", "grupos", "produccion_leche_tanque", "produccion_leche_individual"];
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
        animal.id = animalId; // Guardar ID para registros de leche
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
            // Número de partos realista según la edad del animal
            // Vacas jóvenes (24-47 m) → 1-2 partos
            // Vacas maduras (48-84 m) → 2-4 partos
            // Vacas viejas (85+ m)    → 4-7 partos
            const edadMesesAnimal = (new Date() - new Date(animal.fechaNacimiento + "T00:00:00")) / (1000 * 60 * 60 * 24 * 30.44);
            let numPartos;
            if (edadMesesAnimal < 48)      numPartos = getRandomInt(1, 2);
            else if (edadMesesAnimal < 85) numPartos = getRandomInt(2, 4);
            else                            numPartos = getRandomInt(4, 7);

            // Generar partos hacia atrás con intervalos realistas (12-15 meses entre cada uno)
            let mesesAtrasAcumulado = getRandomInt(2, 8); // último parto fue hace 2-8 meses
            const resultadosParto = ["Cría sana", "Cría sana", "Cría sana", "Cría macho sano", "Cría hembra sana", "Gemelar - 2 crías sanas", "Cría con dificultades - Sobrevivió"];
            for (let p = 0; p < numPartos; p++) {
              const fechaParto = restarMesesAFecha(mesesAtrasAcumulado);
              misPromesas.push(addDoc(collection(db, "eventos"), {
                animalId, tipo: "Parto",
                resultado: getRandom(resultadosParto),
                fecha: fechaParto, costo: 0, ranchoId: usuario?.ranchoId
              }));
              // Siguiente parto fue 12-15 meses antes
              mesesAtrasAcumulado += getRandomInt(12, 15);
            }
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

      // Generar Producción de Leche de prueba
      const lechePromesas = [];
      
      // 14 días de Tanque
      for (let i = 0; i < 14; i++) {
        const fechaProd = generarFechaFutura(-i); 
        const totales = getRandomInt(120, 200);
        const crias = getRandomInt(15, 30);
        const autoconsumo = getRandomInt(2, 5);
        lechePromesas.push(addDoc(collection(db, "produccion_leche_tanque"), {
          ranchoId: usuario?.ranchoId,
          fecha: fechaProd,
          litrosTotales: totales,
          litrosCrias: crias,
          litrosAutoconsumo: autoconsumo,
          litrosVenta: totales - crias - autoconsumo,
          fechaRegistro: new Date().toISOString()
        }));
      }

      // 30 registros individuales (aleatorios en los últimos 14 días)
      const vacasGeneradas = animalesAGenerar.filter(a => a.tipo === "Vaca");
      for (let i = 0; i < 30; i++) {
        if (vacasGeneradas.length === 0) break;
        const vaca = getRandom(vacasGeneradas);
        const fechaProd = generarFechaFutura(-getRandomInt(0, 14));
        lechePromesas.push(addDoc(collection(db, "produccion_leche_individual"), {
          ranchoId: usuario?.ranchoId,
          animalId: vaca.id,
          animalArete: vaca.arete,
          animalAreteRancho: "",
          fecha: fechaProd,
          periodo: "Diario",
          litros: getRandomInt(8, 25) + (Math.random() > 0.5 ? 0.5 : 0),
          fechaRegistro: new Date().toISOString()
        }));
      }
      await Promise.all(lechePromesas);

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

      {/* Botón Peligro - Limpiar Todo */}
      {usuario?.rol === "admin" && (
        <div style={{ marginTop: "50px", paddingTop: "30px", borderTop: "2px dashed #fca5a5", textAlign: "center" }}>
          <h3 style={{ color: "#991b1b", marginTop: "10px" }}>Zona de Peligro</h3>
          <p style={{ color: "#6b7280", fontSize: "14px", marginBottom: "20px" }}>
            Si deseas reiniciar desde cero para probar la importación masiva automática, puedes vaciar tu rancho aquí.
          </p>
          <button
            className="btn-outline"
            style={{ backgroundColor: "#fef2f2", borderColor: "#ef4444", color: "#dc2626", maxWidth: "300px", margin: "0 auto", display: "inline-flex", alignItems: "center", gap: "6px", padding: "10px 16px" }}
            onClick={limpiarRanchoCompletamente} disabled={cargandoDemo}
          >
            <AlertCircle size={18} />
            {cargandoDemo ? "Borrando todo..." : "Vaciar Todo Mi Rancho"}
          </button>
        </div>
      )}
    </div>
  );
}
