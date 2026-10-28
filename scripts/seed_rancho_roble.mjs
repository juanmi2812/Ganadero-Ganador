import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword 
} from "firebase/auth";
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDocs, 
  deleteDoc, 
  collection, 
  query, 
  where 
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyAqweiq2mV98N00yWlecQtOE3BUsBM5-Cs",
  authDomain: "control-ganadero-1518e.firebaseapp.com",
  projectId: "control-ganadero-1518e",
  storageBucket: "control-ganadero-1518e.firebasestorage.app",
  messagingSenderId: "327622024275",
  appId: "1:327622024275:web:de43032167c765c8a43aa6",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export const DEMO_USER = {
  email: "demo.roble@ganaderoganador.com",
  password: "DemoRoble2026!",
  nombre: "Ing. Carlos Mendoza (Rancho El Roble)",
  ranchoNombre: "Rancho El Roble - Demo",
  ranchoId: "rancho_el_roble_demo"
};

// Helper fechas
const hoy = new Date();
const formatFecha = (d) => d.toISOString().split("T")[0];
const restarDias = (dias) => {
  const d = new Date();
  d.setDate(d.getDate() - dias);
  return formatFecha(d);
};
const sumarDias = (dias) => {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return formatFecha(d);
};
const restarMeses = (meses) => {
  const d = new Date();
  d.setMonth(d.getMonth() - meses);
  return formatFecha(d);
};

export async function sembrarRanchoElRoble() {
  console.log("==================================================");
  console.log("🌱 INICIANDO SEMBRADO DE 'RANCHO EL ROBLE - DEMO'");
  console.log("==================================================");

  // 1. Iniciar sesión o crear usuario
  let userCred;
  try {
    userCred = await signInWithEmailAndPassword(auth, DEMO_USER.email, DEMO_USER.password);
    console.log("✓ Sesión iniciada con usuario demo:", userCred.user.uid);
  } catch (err) {
    if (err.code === "auth/user-not-found" || err.code === "auth/invalid-credential") {
      userCred = await createUserWithEmailAndPassword(auth, DEMO_USER.email, DEMO_USER.password);
      console.log("✓ Usuario demo creado exitosamente:", userCred.user.uid);
    } else {
      throw err;
    }
  }

  const uid = userCred.user.uid;
  const ranchoId = DEMO_USER.ranchoId;

  // 2. Crear / Actualizar perfil de usuario y rancho con vocación y región oficiales
  console.log("⚙️ Configurando perfil de usuario y rancho...");
  await setDoc(doc(db, "usuarios", uid), {
    nombre: DEMO_USER.nombre,
    correo: DEMO_USER.email,
    rol: "admin",
    tipoEntidad: "rancho",
    ranchoId: ranchoId,
    ranchoNombre: DEMO_USER.ranchoNombre,
    fechaFinPrueba: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    suscripcionActiva: true,
    estadoSuscripcion: "active"
  });

  await setDoc(doc(db, "ranchos", ranchoId), {
    nombre: DEMO_USER.ranchoNombre,
    adminUid: uid,
    vocacion: "LecheEngorda",
    estadoRegion: "Veracruz",
    municipio: "Pánuco",
    upp: "30-184-0921-001",
    fechaCreacion: restarMeses(14)
  }, { merge: true });

  // Configuración financiera
  await setDoc(doc(db, "configuracion", `financiera_${ranchoId}`), {
    ranchoId: ranchoId,
    costoDiario: {
      Vaca: 32,
      Semental: 42,
      Novillona: 26,
      Torete: 28,
      Becerro: 15,
      Becerra: 15
    }
  });

  // 3. Limpiar datos previos del rancho para un estado 100% limpio
  console.log("🧹 Limpiando colecciones anteriores del rancho...");
  const coleccionesALimpiar = [
    "animales",
    "eventos",
    "alertas",
    "potreros",
    "grupos",
    "bitacoras",
    "produccion_leche_tanque",
    "produccion_leche_individual",
    "citas_movilizacion",
    "eventosPotreros"
  ];

  for (const col of coleccionesALimpiar) {
    const snap = await getDocs(query(collection(db, col), where("ranchoId", "==", ranchoId)));
    if (snap.size > 0) {
      console.log(`  - Eliminando ${snap.size} documentos de '${col}'...`);
      for (const d of snap.docs) {
        await deleteDoc(d.ref);
      }
    }
  }

  // 4. Crear los 4 Potreros oficiales
  console.log("📍 Creando 4 Potreros reales...");
  const potrerosDef = [
    {
      nombre: "Potrero El Jobo",
      hectareas: 18,
      tipoPastoNombre: "Estrella Africana",
      porcentajePasto: 92,
      tipoPastoTamano: "mediano",
      numeroPresas: 1,
      numeroBebederos: 2,
      divisiones: ["Sección A (Maternidad)", "Sección B"],
      ranchoId: ranchoId
    },
    {
      nombre: "Las Palmas",
      hectareas: 24,
      tipoPastoNombre: "Brizantha / Marandú",
      porcentajePasto: 88,
      tipoPastoTamano: "alto",
      numeroPresas: 2,
      numeroBebederos: 3,
      divisiones: ["Palmas Norte", "Palmas Sur"],
      ranchoId: ranchoId
    },
    {
      nombre: "Manga 1",
      hectareas: 10,
      tipoPastoNombre: "Bermuda Cruza 1",
      porcentajePasto: 95,
      tipoPastoTamano: "corto",
      numeroPresas: 0,
      numeroBebederos: 2,
      divisiones: ["Corral de Engorda", "Manga de Manejo"],
      ranchoId: ranchoId
    },
    {
      nombre: "La Ciénega",
      hectareas: 15,
      tipoPastoNombre: "Pangola / Humidícola",
      porcentajePasto: 90,
      tipoPastoTamano: "mediano",
      numeroPresas: 1,
      numeroBebederos: 1,
      divisiones: ["Bajo Verde", "Loma Sementales"],
      ranchoId: ranchoId
    }
  ];

  for (const p of potrerosDef) {
    await setDoc(doc(collection(db, "potreros")), p);
  }

  // Grupos de Manejo
  const gruposDef = [
    { nombre: "Vacas de Ordeño", ranchoId },
    { nombre: "Vacas de Cría", ranchoId },
    { nombre: "Novillonas de Desarrollo", ranchoId },
    { nombre: "Engorda / Toretes", ranchoId },
    { nombre: "Sementales", ranchoId },
    { nombre: "Crías Lactantes", ranchoId }
  ];
  for (const g of gruposDef) {
    await setDoc(doc(collection(db, "grupos")), g);
  }

  // 5. Inventario de Ganado (72 Cabezas zootécnicas estructuradas)
  console.log("🐄 Sembrando 72 cabezas de ganado con linajes, aretes SINIIGA y pesajes...");

  const animales = [];

  // --- A. 3 Sementales Élite ---
  const sementales = [
    {
      arete: "SM-3218",
      areteRancho: "ROBLE-01",
      nombre: "Don Titán",
      tipo: "Semental",
      sexo: "Macho",
      raza: "Brahman Rojo",
      fechaNacimiento: restarMeses(72),
      peso: "910 kg",
      pesoActual: 910,
      potrero: "La Ciénega",
      grupo: "Sementales",
      estado: "Sano",
      madre: "VC-REG-980 (Dra. Titana)",
      padre: "SM-REG-01 (Milenio Rojo)",
      fechaRegistro: restarMeses(24),
      ranchoId
    },
    {
      arete: "SM-1084",
      areteRancho: "ROBLE-02",
      nombre: "El Centenario",
      tipo: "Semental",
      sexo: "Macho",
      raza: "Simmental",
      fechaNacimiento: restarMeses(60),
      peso: "960 kg",
      pesoActual: 960,
      potrero: "La Ciénega",
      grupo: "Sementales",
      estado: "Sano",
      madre: "VC-ALE-44 (Helena)",
      padre: "SM-ALE-09 (Hulk)",
      fechaRegistro: restarMeses(20),
      ranchoId
    },
    {
      arete: "SM-4502",
      areteRancho: "ROBLE-03",
      nombre: "Capitán Brangus",
      tipo: "Semental",
      sexo: "Macho",
      raza: "Brangus Negro",
      fechaNacimiento: restarMeses(48),
      peso: "840 kg",
      pesoActual: 840,
      potrero: "Las Palmas",
      grupo: "Sementales",
      estado: "Sano",
      madre: "VC-TEX-12 (Pampa)",
      padre: "SM-TEX-88 (Texas Black)",
      fechaRegistro: restarMeses(16),
      ranchoId
    }
  ];
  animales.push(...sementales);

  // --- B. 35 Vacas de Cría / Ordeño ---
  const nombresVacas = [
    "La Golondrina", "La Consentida", "La Gitana", "Flor de Mayo", "La Paloma",
    "La Sultana", "La Marquesa", "La Faraona", "La Chula", "Reina del Sur",
    "Princesa", "La Canela", "La Tejana", "La Muñeca", "Campesina",
    "La Estrella", "Bella Vista", "La Morena", "Margarita", "La Pinta",
    "Maravilla", "La Baronesa", "Mil Flores", "La Esmeralda", "Flor Silvestre",
    "Diosa Blanca", "La Traviesa", "Tormenta", "La Perla", "La Ilusión",
    "Zafiro", "Paloma Blanca", "La Leona", "Victoria", "La Duquesa"
  ];
  const razasVacas = ["Brahman", "Simmental", "Girolando", "Brangus", "Charolais", "Beefmaster"];

  for (let i = 0; i < 35; i++) {
    const numArete = 2000 + i;
    const nombre = nombresVacas[i];
    const raza = razasVacas[i % razasVacas.length];
    const padre = sementales[i % sementales.length].arete;
    const madre = `VC-FUND-${100 + (i % 8)}`;
    
    let estado = "Sano";
    let potrero = i < 20 ? "Potrero El Jobo" : "Las Palmas";
    let grupo = i < 18 ? "Vacas de Ordeño" : "Vacas de Cría";

    // Manejo de estados para calibrar KPIs zootécnicos realistas:
    // 1. Partos próximos este mes
    if (i === 0 || i === 1) {
      estado = "Gestante";
    } 
    // 2. Solo 2 vacas en revisión de fertilidad (días abiertos altos controlados ~4% infertilidad)
    else if (i === 2) {
      estado = "Alerta: Revisión de Fertilidad"; // La Gitana
    } else if (i === 3) {
      estado = "Alerta: Revisión de Fertilidad"; // Flor de Mayo
    } 
    // 3. 24 vacas gestantes adicionales (Total gestantes vientres = 35 / 49 = 71.4% Tasa de Preñez)
    else if (i < 26) {
      estado = "Gestante";
    } else {
      estado = "Sano";
    }

    // Edad ajustada: nacidas entre 36 y 54 meses atrás (para coherencia con primer parto a los 26-28m)
    const vacaObj = {
      arete: `VC-${numArete}`,
      areteRancho: `${numArete}`,
      nombre: nombre,
      tipo: "Vaca",
      sexo: "Hembra",
      raza: raza,
      fechaNacimiento: restarMeses(40 + (i % 12)),
      peso: `${480 + (i * 3 % 80)} kg`,
      pesoActual: 480 + (i * 3 % 80),
      potrero: potrero,
      grupo: grupo,
      estado: estado,
      madre: madre,
      padre: padre,
      fechaRegistro: restarMeses(18),
      ranchoId
    };

    animales.push(vacaObj);
  }

  // --- C. 14 Novillonas de Desarrollo ---
  for (let i = 0; i < 14; i++) {
    const numArete = 3100 + i;
    const raza = razasVacas[(i + 2) % razasVacas.length];
    // 9 novillonas ya preñadas (gestantes) tras servicio de inseminación
    const estadoNovillona = i < 9 ? "Gestante" : "Sano";
    const novillonaObj = {
      arete: `NV-${numArete}`,
      areteRancho: `${numArete}`,
      nombre: `Novillona ${numArete}`,
      tipo: "Novillona",
      sexo: "Hembra",
      raza: raza,
      fechaNacimiento: restarMeses(20 + (i % 6)),
      peso: `${340 + (i * 6)} kg`,
      pesoActual: 340 + (i * 6),
      potrero: "Las Palmas",
      grupo: "Novillonas de Desarrollo",
      estado: estadoNovillona,
      madre: `VC-${2000 + (i % 25)}`,
      padre: sementales[i % sementales.length].arete,
      fechaRegistro: restarMeses(10),
      ranchoId
    };
    animales.push(novillonaObj);
  }

  // --- D. 12 Toretes / Novillos de Engorda ---
  // Incluye los 3 animales estrella para curva de peso y GDP (4502, 1084, 3218)
  const toretesEspeciales = [
    {
      arete: "TR-4502",
      areteRancho: "4502",
      nombre: "El Alazán - F1",
      tipo: "Torete",
      sexo: "Macho",
      raza: "Brangus",
      fechaNacimiento: restarMeses(17),
      peso: "460 kg",
      pesoActual: 460,
      potrero: "Manga 1",
      grupo: "Engorda / Toretes",
      estado: "Sano",
      madre: "VC-2005",
      padre: "SM-4502",
      fechaRegistro: restarMeses(12),
      ranchoId,
      pesajesEspeciales: [
        { fecha: restarDias(90), peso: 380 },
        { fecha: restarDias(60), peso: 407 },
        { fecha: restarDias(30), peso: 434 },
        { fecha: restarDias(0),  peso: 460 }
      ]
    },
    {
      arete: "TR-1084",
      areteRancho: "1084",
      nombre: "Moro Pampa",
      tipo: "Torete",
      sexo: "Macho",
      raza: "Simmental x Brahman",
      fechaNacimiento: restarMeses(18),
      peso: "488 kg",
      pesoActual: 488,
      potrero: "Manga 1",
      grupo: "Engorda / Toretes",
      estado: "Sano",
      madre: "VC-2008",
      padre: "SM-1084",
      fechaRegistro: restarMeses(12),
      ranchoId,
      pesajesEspeciales: [
        { fecha: restarDias(90), peso: 410 },
        { fecha: restarDias(60), peso: 436 },
        { fecha: restarDias(30), peso: 462 },
        { fecha: restarDias(0),  peso: 488 }
      ]
    },
    {
      arete: "TR-3218",
      areteRancho: "3218",
      nombre: "Rojo Titán Jr",
      tipo: "Torete",
      sexo: "Macho",
      raza: "Brahman Rojo Puro",
      fechaNacimiento: restarMeses(16),
      peso: "444 kg",
      pesoActual: 444,
      potrero: "Manga 1",
      grupo: "Engorda / Toretes",
      estado: "Sano",
      madre: "VC-2012",
      padre: "SM-3218",
      fechaRegistro: restarMeses(12),
      ranchoId,
      pesajesEspeciales: [
        { fecha: restarDias(90), peso: 360 },
        { fecha: restarDias(60), peso: 388 },
        { fecha: restarDias(30), peso: 416 },
        { fecha: restarDias(0),  peso: 444 }
      ]
    }
  ];
  animales.push(...toretesEspeciales);

  // Otros 9 toretes de engorda
  for (let i = 0; i < 9; i++) {
    const numArete = 4100 + i;
    animales.push({
      arete: `TR-${numArete}`,
      areteRancho: `${numArete}`,
      nombre: `Novillo ${numArete}`,
      tipo: "Torete",
      sexo: "Macho",
      raza: razasVacas[(i + 3) % razasVacas.length],
      fechaNacimiento: restarMeses(15 + (i % 4)),
      peso: `${360 + (i * 8)} kg`,
      pesoActual: 360 + (i * 8),
      potrero: "Manga 1",
      grupo: "Engorda / Toretes",
      estado: "Sano",
      madre: `VC-${2000 + i}`,
      padre: sementales[i % sementales.length].arete,
      fechaRegistro: restarMeses(8),
      ranchoId
    });
  }

  // --- E. 8 Crías Lactantes ---
  for (let i = 0; i < 8; i++) {
    const numArete = 501 + i;
    const esMacho = i % 2 === 0;
    const madreArete = `VC-${2004 + i}`;
    animales.push({
      arete: `CR-${numArete}`,
      areteRancho: `${numArete}`,
      nombre: `Cría de ${madreArete}`,
      tipo: esMacho ? "Becerro" : "Becerra",
      sexo: esMacho ? "Macho" : "Hembra",
      raza: razasVacas[i % razasVacas.length],
      fechaNacimiento: restarMeses(2 + (i % 4)),
      peso: `${90 + (i * 12)} kg`,
      pesoActual: 90 + (i * 12),
      potrero: "Potrero El Jobo",
      grupo: "Crías Lactantes",
      estado: "Sano",
      madre: madreArete,
      padre: sementales[i % sementales.length].arete,
      fechaRegistro: restarMeses(2),
      ranchoId
    });
  }

  console.log(`  Guardando ${animales.length} animales en Firestore...`);

  // Guardar animales en Firestore y obtener sus IDs
  const animalesGuardados = [];
  for (const an of animales) {
    const docRef = doc(collection(db, "animales"));
    const anId = docRef.id;
    await setDoc(docRef, an);
    animalesGuardados.push({ id: anId, ...an });
  }

  // 6. Generar Eventos de Pesaje, Partos Calibrados y Sanitarios
  console.log("📈 Generando historial de pesajes y eventos clínicos...");

  // Para calibrar Edad al Primer Parto (~27.5 meses) e Intervalo Entre Partos (~390 días):
  // Seleccionamos 4 vacas con historial completo de 2 partos cada una
  const vacasConHistorialParto = animalesGuardados.filter(a => a.tipo === "Vaca").slice(0, 4);
  
  for (let idx = 0; idx < vacasConHistorialParto.length; idx++) {
    const v = vacasConHistorialParto[idx];
    // Primer parto: a los 27 meses de edad
    const fNac = new Date(v.fechaNacimiento);
    const fPrimerParto = new Date(fNac);
    fPrimerParto.setMonth(fPrimerParto.getMonth() + 27); // 27 meses = edad primer parto
    
    // Segundo parto: 390 días después (Intervalo entre partos = 390 días)
    const fSegundoParto = new Date(fPrimerParto);
    fSegundoParto.setDate(fSegundoParto.getDate() + 390);

    await setDoc(doc(collection(db, "eventos")), {
      animalId: v.id,
      tipo: "Parto",
      resultado: "Cría Macho (38 kg - Normal)",
      fecha: formatFecha(fPrimerParto),
      costo: 0,
      origen: "realizado",
      ranchoId
    });

    await setDoc(doc(collection(db, "eventos")), {
      animalId: v.id,
      tipo: "Parto",
      resultado: "Cría Hembra (36 kg - Normal)",
      fecha: formatFecha(fSegundoParto),
      costo: 0,
      origen: "realizado",
      ranchoId
    });
  }

  // Pesajes e inmunizaciones
  for (const an of animalesGuardados) {
    if (an.pesajesEspeciales) {
      for (const p of an.pesajesEspeciales) {
        await setDoc(doc(collection(db, "eventos")), {
          animalId: an.id,
          tipo: "Repeso",
          resultado: `${p.peso} kg`,
          fecha: p.fecha,
          costo: 0,
          origen: "realizado",
          ranchoId
        });
      }
    } else if (["Becerro", "Becerra", "Torete", "Novillona"].includes(an.tipo)) {
      const pesoBase = an.pesoActual - 50;
      await setDoc(doc(collection(db, "eventos")), {
        animalId: an.id,
        tipo: "Repeso",
        resultado: `${pesoBase} kg`,
        fecha: restarMeses(3),
        costo: 0,
        origen: "realizado",
        ranchoId
      });
      await setDoc(doc(collection(db, "eventos")), {
        animalId: an.id,
        tipo: "Repeso",
        resultado: `${an.pesoActual} kg`,
        fecha: restarDias(10),
        costo: 0,
        origen: "realizado",
        ranchoId
      });
    }

    // Vacunación base de hato
    await setDoc(doc(collection(db, "eventos")), {
      animalId: an.id,
      tipo: "Vacunación",
      resultado: "Bacterina 10 Vías (Clostridiasis)",
      fecha: restarMeses(3),
      costo: 45,
      origen: "realizado",
      ranchoId
    });
  }

  // 7. Calendario Reproductivo y Sanitario Completo (22 Actividades vibrantes)
  console.log("📅 Creando calendario completo y estructurado (22 alertas y actividades)...");
  
  const vaca1 = animalesGuardados.find(a => a.arete === "VC-2000") || animalesGuardados[3];
  const vaca2 = animalesGuardados.find(a => a.arete === "VC-2001") || animalesGuardados[4];
  const vaca3 = animalesGuardados.find(a => a.arete === "VC-2004") || animalesGuardados[5];
  const vaca4 = animalesGuardados.find(a => a.arete === "VC-2005") || animalesGuardados[6];
  const vaca5 = animalesGuardados.find(a => a.arete === "VC-2006") || animalesGuardados[7];
  const vaca6 = animalesGuardados.find(a => a.arete === "VC-2007") || animalesGuardados[8];
  const vaca7 = animalesGuardados.find(a => a.arete === "VC-2008") || animalesGuardados[9];
  const vaca8 = animalesGuardados.find(a => a.arete === "VC-2009") || animalesGuardados[10];

  const alertasPlaneadas = [
    // --- EVENTOS CONCLUIDOS (Semana pasada - Verdes) ---
    {
      tipo: "Parto",
      titulo: `Parto Concluido - ${vaca7.arete} (Cría Viva 39kg)`,
      resultado: "Parto eutócico sin complicaciones",
      fechaProgramada: restarDias(5),
      completada: true,
      origen: "planeado",
      modoAplicacion: "individual",
      animalId: vaca7.id,
      ranchoId
    },
    {
      tipo: "Vacunación",
      titulo: "Vacunación Antirrábica Bovina - Manga 1",
      resultado: "Derriengue / Rabia Paralítica aplicada a lote",
      fechaProgramada: restarDias(3),
      completada: true,
      origen: "planeado",
      modoAplicacion: "potrero",
      filtroPotrero: "Manga 1",
      ranchoId
    },
    {
      tipo: "Pesaje",
      titulo: "Pesaje Trimestral de Control - Lote Novillos",
      resultado: "Promedio de ganancia lote: 0.88 kg/d",
      fechaProgramada: restarDias(2),
      completada: true,
      origen: "planeado",
      modoAplicacion: "potrero",
      filtroPotrero: "Manga 1",
      ranchoId
    },

    // --- EVENTOS PRÓXIMOS ESTE MES (Rojos / Amarillos / Azules) ---
    // 1. Partos Próximos
    {
      tipo: "Parto",
      titulo: `Parto Próximo - ${vaca1.arete} (${vaca1.nombre})`,
      resultado: "Atención de Maternidad / Monitoreo estrecho",
      fechaProgramada: sumarDias(3),
      fechaRecordatorio: sumarDias(1),
      modoAplicacion: "individual",
      animalId: vaca1.id,
      completada: false,
      origen: "planeado",
      ranchoId
    },
    {
      tipo: "Parto",
      titulo: `Parto Próximo - ${vaca2.arete} (${vaca2.nombre})`,
      resultado: "Traslado a Potrero El Jobo (Sección Maternidad)",
      fechaProgramada: sumarDias(9),
      fechaRecordatorio: sumarDias(6),
      modoAplicacion: "individual",
      animalId: vaca2.id,
      completada: false,
      origen: "planeado",
      ranchoId
    },
    {
      tipo: "Parto",
      titulo: `Parto Programado - ${vaca8.arete} (${vaca8.nombre})`,
      resultado: "Vientre Girolando F1 - Segundo Parto",
      fechaProgramada: sumarDias(21),
      fechaRecordatorio: sumarDias(18),
      modoAplicacion: "individual",
      animalId: vaca8.id,
      completada: false,
      origen: "planeado",
      ranchoId
    },

    // 2. Palpaciones Reproductivas
    {
      tipo: "Palpación",
      titulo: `Palpación Post-Servicio - ${vaca3.arete} (${vaca3.nombre})`,
      resultado: "Diagnóstico de Gestación (60 días post-IA)",
      fechaProgramada: sumarDias(5),
      fechaRecordatorio: sumarDias(2),
      modoAplicacion: "individual",
      animalId: vaca3.id,
      completada: false,
      origen: "planeado",
      ranchoId
    },
    {
      tipo: "Palpación",
      titulo: `Palpación Diagnóstica - ${vaca4.arete} (${vaca4.nombre})`,
      resultado: "Confirmación de Preñez por Ultrasonografía",
      fechaProgramada: sumarDias(11),
      fechaRecordatorio: sumarDias(8),
      modoAplicacion: "individual",
      animalId: vaca4.id,
      completada: false,
      origen: "planeado",
      ranchoId
    },
    {
      tipo: "Palpación",
      titulo: `Revisión Ginecológica - ${vaca5.arete} (${vaca5.nombre})`,
      resultado: "Evaluación de Ciclicidad Ovárica / Cuerpo Lúteo",
      fechaProgramada: sumarDias(18),
      fechaRecordatorio: sumarDias(15),
      modoAplicacion: "individual",
      animalId: vaca5.id,
      completada: false,
      origen: "planeado",
      ranchoId
    },

    // 3. Secados de Vacas Lecheras
    {
      tipo: "Secado",
      titulo: `Secado de Vientre - ${vaca6.arete} (${vaca6.nombre})`,
      resultado: "Terapia de Vaca Seca con Infusión Intramamaria",
      fechaProgramada: sumarDias(4),
      fechaRecordatorio: sumarDias(1),
      modoAplicacion: "individual",
      animalId: vaca6.id,
      completada: false,
      origen: "planeado",
      ranchoId
    },
    {
      tipo: "Secado",
      titulo: `Secado Programado - VC-2010 (La Pinta)`,
      resultado: "Descanso preparto reglamentario (60 días)",
      fechaProgramada: sumarDias(16),
      fechaRecordatorio: sumarDias(13),
      modoAplicacion: "individual",
      animalId: animalesGuardados[13]?.id || vaca6.id,
      completada: false,
      origen: "planeado",
      ranchoId
    },

    // 4. Inseminaciones Artificiales a Tiempo Fijo (IATF)
    {
      tipo: "Inseminación",
      titulo: "Protocolo IATF - Lote 8 Novillonas (Las Palmas)",
      resultado: "Semen sexado Simmental alemán de alta pureza",
      fechaProgramada: sumarDias(7),
      fechaRecordatorio: sumarDias(4),
      modoAplicacion: "potrero",
      filtroPotrero: "Las Palmas",
      filtroGrupo: "Novillonas de Desarrollo",
      completada: false,
      origen: "planeado",
      ranchoId
    },
    {
      tipo: "Inseminación",
      titulo: "Inseminación Artificial - VC-2015 (Bella Vista)",
      resultado: "Celo natural detectado a primera hora",
      fechaProgramada: sumarDias(13),
      fechaRecordatorio: sumarDias(12),
      modoAplicacion: "individual",
      animalId: animalesGuardados[18]?.id || vaca1.id,
      completada: false,
      origen: "planeado",
      ranchoId
    },

    // 5. Vacunaciones y Manejos Sanitarios
    {
      tipo: "Vacunación",
      titulo: "Vacunación Clostridial 10 Vías - Potrero El Jobo",
      resultado: "Refuerzo preventivo anual contra carbón y gangrena",
      fechaProgramada: sumarDias(8),
      fechaRecordatorio: sumarDias(5),
      modoAplicacion: "potrero",
      filtroPotrero: "Potrero El Jobo",
      completada: false,
      origen: "planeado",
      ranchoId
    },
    {
      tipo: "Tratamiento",
      titulo: "Baño Garrapaticida por Aspersión - Hato General",
      resultado: "Control de ectoparásitos (Amitraz / Cipermetrina)",
      fechaProgramada: sumarDias(6),
      fechaRecordatorio: sumarDias(3),
      modoAplicacion: "general",
      completada: false,
      origen: "planeado",
      ranchoId
    },
    {
      tipo: "Desparasitante",
      titulo: "Desparasitación Estratégica - Lote Crías Lactantes",
      resultado: "Fenbendazol oral + Complejo ADE hidrosoluble",
      fechaProgramada: sumarDias(14),
      fechaRecordatorio: sumarDias(10),
      modoAplicacion: "grupo",
      filtroGrupo: "Crías Lactantes",
      completada: false,
      origen: "planeado",
      ranchoId
    },

    // 6. Destetes y Manejo de Pasturas
    {
      tipo: "Destete",
      titulo: "Destete Tradicional - Becerros Nacidos en Primavera",
      resultado: "Pesaje al destete, aretado SINIIGA y tatuaje",
      fechaProgramada: sumarDias(17),
      fechaRecordatorio: sumarDias(14),
      modoAplicacion: "grupo",
      filtroGrupo: "Crías Lactantes",
      completada: false,
      origen: "planeado",
      ranchoId
    },
    {
      tipo: "Manejo",
      titulo: "Rotación de Pastoreo: El Jobo hacia Las Palmas",
      resultado: "Aforo de pasto previo: 1.8 kg materia seca/m2",
      fechaProgramada: sumarDias(12),
      fechaRecordatorio: sumarDias(10),
      modoAplicacion: "potrero",
      filtroPotrero: "Potrero El Jobo",
      completada: false,
      origen: "planeado",
      ranchoId
    },
    {
      tipo: "Revisión",
      titulo: "Evaluación Andrológica de Sementales (Prueba de Líbido)",
      resultado: "Medición de circunferencia escrotal y motilidad espermática",
      fechaProgramada: sumarDias(20),
      fechaRecordatorio: sumarDias(16),
      modoAplicacion: "grupo",
      filtroGrupo: "Sementales",
      completada: false,
      origen: "planeado",
      ranchoId
    }
  ];

  for (const alt of alertasPlaneadas) {
    await setDoc(doc(collection(db, "alertas")), alt);
  }

  // 8. Producción de Leche (Tanque Frío + Registros Individuales para calibrar 13.5 L/vaca)
  console.log("🥛 Sembrando producción lechera en tanque e individual...");
  const produccionBase = [
    { diasAtras: 9, total: 385, venta: 325, crias: 42, auto: 18 },
    { diasAtras: 8, total: 392, venta: 330, crias: 44, auto: 18 },
    { diasAtras: 7, total: 405, venta: 342, crias: 45, auto: 18 },
    { diasAtras: 6, total: 398, venta: 335, crias: 43, auto: 20 },
    { diasAtras: 5, total: 412, venta: 348, crias: 44, auto: 20 },
    { diasAtras: 4, total: 420, venta: 355, crias: 45, auto: 20 },
    { diasAtras: 3, total: 418, venta: 352, crias: 46, auto: 20 },
    { diasAtras: 2, total: 428, venta: 362, crias: 46, auto: 20 },
    { diasAtras: 1, total: 435, venta: 368, crias: 47, auto: 20 },
    { diasAtras: 0, total: 442, venta: 374, crias: 48, auto: 20 }
  ];

  for (const reg of produccionBase) {
    await setDoc(doc(collection(db, "produccion_leche_tanque")), {
      ranchoId,
      fecha: restarDias(reg.diasAtras),
      litrosTotales: reg.total,
      litrosVenta: reg.venta,
      litrosCrias: reg.crias,
      litrosAutoconsumo: reg.auto,
      fechaRegistro: new Date().toISOString()
    });
  }

  // Registros de control lechero individual (10 vacas en ordeño con promedio ~13.6 L/vaca)
  const vacasOrdeno = animalesGuardados.filter(a => a.grupo === "Vacas de Ordeño").slice(0, 10);
  const litrosPromedios = [14.2, 13.5, 15.0, 12.8, 14.0, 13.2, 14.5, 12.5, 13.8, 13.0];
  
  for (let d = 0; d < 5; d++) {
    const fechaProd = restarDias(d);
    for (let vi = 0; vi < vacasOrdeno.length; vi++) {
      const v = vacasOrdeno[vi];
      const litros = litrosPromedios[vi] + (d % 2 === 0 ? 0.3 : -0.2);
      await setDoc(doc(collection(db, "produccion_leche_individual")), {
        ranchoId,
        animalId: v.id,
        arete: v.arete,
        nombre: v.nombre,
        fecha: fechaProd,
        litros: litros,
        grasaPorcentaje: 3.8,
        proteinaPorcentaje: 3.2,
        fechaRegistro: new Date().toISOString()
      });
    }
  }

  // 9. Bitácoras Diarias del Rancho (5 reportes reales e impecables)
  console.log("📖 Sembrando bitácoras de campo y reportes del rancho...");
  const bitacorasDemo = [
    {
      fecha: `${restarDias(0)}T08:30:00`,
      autorNombre: "Ing. Carlos Mendoza (Administrador)",
      resumenSistema: "• Ordeño matutino: 442 L recibidos en Tanque Frío.\n• 3 Toretes pesados en Manga 1 con promedio de 464 kg (GDP: 0.910 kg/d).\n• Alerta de parto registrada para Vaca VC-2000 (La Golondrina).",
      notasLocales: "Se revisaron los cercos eléctricos del Potrero El Jobo. Los bebederos automáticos tienen presión óptima y sales minerales al 100%. El lote de novillos muestra excelente pelaje y llenado ruminal.",
      ranchoId
    },
    {
      fecha: `${restarDias(1)}T17:15:00`,
      autorNombre: "Carlos Mendoza Ramos",
      resumenSistema: "• Ordeño diario: 435 L totales (368 L venta comercial, 47 L crías).\n• Monitoreo de 2 vientres gestantes en Potrero Maternidad.",
      notasLocales: "Se suministró silo de maíz suplementado con pollinaza y harina de soya a las novillonas de desarrollo. Sin novedades respiratorias ni cojeras en todo el hato.",
      ranchoId
    },
    {
      fecha: `${restarDias(3)}T09:00:00`,
      autorNombre: "Dr. Arturo Salgado (Médico Veterinario)",
      resumenSistema: "• Aplicación de vacuna Derriengue / Rabia Bovina a lote en Manga 1.\n• Revisión de botiquín zoosanitario y refrigeración de biológicos.",
      notasLocales: "Se completó la inmunización antirrábica preventiva según el calendario epidemiológico de la UGR Norte de Veracruz. Se programó palpación ecográfica para el próximo lunes.",
      ranchoId
    },
    {
      fecha: `${restarDias(5)}T16:45:00`,
      autorNombre: "Ing. Carlos Mendoza (Administrador)",
      resumenSistema: "• 1 Parto atendido con éxito: Vaca VC-2008 parió cría hembra viva (39 kg).\n• Curación de ombligo con yodo al 10% y calostrado asistido a las 2 hrs.",
      notasLocales: "La vaca VC-2008 expulsó la placenta sin retención dentro de las primeras 4 horas. Becerro vigoroso y activo al pie de la madre.",
      ranchoId
    },
    {
      fecha: `${restarDias(7)}T11:20:00`,
      autorNombre: "Carlos Mendoza Ramos",
      resumenSistema: "• Rotación de 35 vacas desde Potrero Las Palmas hacia El Jobo.\n• Aforo de forraje: Estrella Africana en punto óptimo de pastoreo (28 días descanso).",
      notasLocales: "Excelente rebrote de la pastura tras las lluvias recientes. Se cambiaron las cintas del cerco móvil para darles franja de pastoreo controlado.",
      ranchoId
    }
  ];

  for (const b of bitacorasDemo) {
    await setDoc(doc(collection(db, "bitacoras")), b);
  }

  // 10. Benchmarks y Ranking Comunitario (Datos Ricos Regionales y por Vocación)
  console.log("🏆 Sembrando benchmarks y datos comunitarios de Ranking...");
  await setDoc(doc(db, "benchmarks", "ultimo"), {
    porVocacion: {
      LecheEngorda: {
        promedioMortalidad: 2.15,
        promedioPrenez: 62.4,
        promedioGdp: 0.690,
        rankings: {
          mortalidad: [0.0, 0.8, 1.2, 1.5, 1.9, 2.1, 2.4, 2.8, 3.2, 3.5, 4.0, 4.5, 5.1],
          prenez: [75.0, 71.4, 68.0, 65.5, 62.0, 60.0, 58.5, 55.0, 52.0, 48.0, 45.0, 40.0],
          gdp: [0.950, 0.890, 0.820, 0.780, 0.720, 0.690, 0.650, 0.610, 0.580, 0.520, 0.480]
        }
      },
      Carne: {
        promedioMortalidad: 2.40,
        promedioPrenez: 65.0,
        promedioGdp: 0.750,
        rankings: {
          mortalidad: [0.0, 1.0, 1.8, 2.4, 3.0, 3.8, 4.5],
          prenez: [78.0, 72.0, 67.0, 64.0, 58.0, 50.0],
          gdp: [1.05, 0.92, 0.84, 0.76, 0.68, 0.55]
        }
      },
      Leche: {
        promedioMortalidad: 2.80,
        promedioPrenez: 58.0,
        promedioGdp: 0.620,
        rankings: {
          mortalidad: [0.0, 1.2, 2.0, 2.8, 3.6, 4.8],
          prenez: [72.0, 66.0, 60.0, 55.0, 50.0, 42.0],
          gdp: [0.85, 0.75, 0.68, 0.60, 0.52, 0.45]
        }
      }
    },
    porEstado: {
      Veracruz: {
        promedioMortalidad: 2.36,
        promedioPrenez: 60.8,
        promedioGdp: 0.675,
        rankings: {
          mortalidad: [0.0, 0.6, 1.1, 1.4, 1.8, 2.2, 2.4, 2.7, 3.1, 3.6, 4.1, 4.8, 5.5],
          prenez: [76.5, 71.4, 67.0, 64.0, 61.0, 59.0, 56.5, 53.0, 50.0, 47.0, 44.0, 39.0],
          gdp: [0.940, 0.890, 0.810, 0.760, 0.710, 0.670, 0.630, 0.590, 0.550, 0.500, 0.460]
        }
      }
    },
    fechaActualizacion: new Date().toISOString()
  }, { merge: true });

  // 11. Movilización UGR (Borrador de Cita / Trámite B2B)
  console.log("🚚 Creando trámite de movilización hacia la Ganadera Local...");
  const toretesMovilizar = animalesGuardados.filter(a => a.tipo === "Torete").slice(0, 5);
  
  await setDoc(doc(collection(db, "citas_movilizacion")), {
    ranchoId,
    ranchoNombre: DEMO_USER.ranchoNombre,
    ganaderaId: "ugr_norte_veracruz_demo",
    ganaderaNombre: "Asociación Ganadera Local del Norte de Veracruz - UGR",
    tipoMovimiento: "Venta a Rastro / Mercado",
    estado: "Pendiente",
    fechaCita: sumarDias(3),
    horaCita: "10:30",
    destinoUPP: "30-184-0921-001",
    destinoNombre: "Subasta Ganadera Pánuco / Rastro Municipal TIF",
    chofer: "Carlos Mendoza Ramos",
    placas: "XK-8492-B",
    animales: toretesMovilizar.map(t => ({
      id: t.id,
      arete: t.arete,
      tipo: t.tipo,
      sexo: t.sexo,
      pesoActual: t.pesoActual
    })),
    fechaCreacion: new Date().toISOString()
  });

  await setDoc(doc(db, "ganaderas", "ugr_norte_veracruz_demo"), {
    nombre: "Asociación Ganadera Local del Norte de Veracruz - UGR",
    fechaCreacion: restarMeses(12),
    horariosAtencion: {
      dias: ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes"],
      inicio: "08:30",
      fin: "15:00"
    },
    duracionCitaMinutos: 45
  }, { merge: true });

  console.log("==================================================");
  console.log("🎉 ¡SEMBRADO DE 'RANCHO EL ROBLE - DEMO' COMPLETADO!");
  console.log("==================================================");
  console.log(`Credenciales de Acceso:`);
  console.log(`- Correo:     ${DEMO_USER.email}`);
  console.log(`- Contraseña: ${DEMO_USER.password}`);
  console.log(`- Rancho:     ${DEMO_USER.ranchoNombre}`);
  console.log(`- Cabezas:    ${animales.length} animales registrados`);
  console.log(`- Alertas:    ${alertasPlaneadas.length} actividades en Calendario`);
  console.log(`- Bitácoras:  ${bitacorasDemo.length} reportes sembrados`);
  console.log("==================================================");
}

// Ejecución directa si se invoca con node
if (process.argv[1]?.endsWith("seed_rancho_roble.mjs")) {
  sembrarRanchoElRoble()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error("❌ Error en sembrado:", err);
      process.exit(1);
    });
}
