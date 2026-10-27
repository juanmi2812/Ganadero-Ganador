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
  where,
  writeBatch
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

  // 2. Crear / Actualizar perfil de usuario y rancho
  console.log("⚙️ Configurando perfil de usuario y rancho...");
  await setDoc(doc(db, "usuarios", uid), {
    nombre: DEMO_USER.nombre,
    correo: DEMO_USER.email,
    rol: "admin",
    tipoEntidad: "rancho",
    ranchoId: ranchoId,
    ranchoNombre: DEMO_USER.ranchoNombre,
    fechaFinPrueba: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
    suscripcionActiva: true
  });

  await setDoc(doc(db, "ranchos", ranchoId), {
    nombre: DEMO_USER.ranchoNombre,
    adminUid: uid,
    fechaCreacion: restarMeses(12)
  });

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
  const eventosPorAnimal = {}; // animalId -> array eventos

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

    // 1. Dos vacas con parto próximo este mes (Alerta roja)
    if (i === 0) { // La Golondrina
      estado = "Gestante";
      potrero = "Potrero El Jobo";
      grupo = "Vacas de Ordeño";
    } else if (i === 1) { // La Consentida
      estado = "Gestante";
      potrero = "Potrero El Jobo";
      grupo = "Vacas de Ordeño";
    }
    // 2. Dos vacas con semáforo de días abiertos altos (>120 días)
    else if (i === 2) { // La Gitana
      estado = "Alerta: Revisión de Fertilidad";
      potrero = "Potrero El Jobo";
      grupo = "Vacas de Cría";
    } else if (i === 3) { // Flor de Mayo
      estado = "Vacía";
      potrero = "Potrero El Jobo";
      grupo = "Vacas de Cría";
    } else if (i < 15) {
      estado = "Gestante";
    }

    const vacaObj = {
      arete: `VC-${numArete}`,
      areteRancho: `${numArete}`,
      nombre: nombre,
      tipo: "Vaca",
      sexo: "Hembra",
      raza: raza,
      fechaNacimiento: restarMeses(36 + (i * 2)),
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
    const novillonaObj = {
      arete: `NV-${numArete}`,
      areteRancho: `${numArete}`,
      nombre: `Novillona ${numArete}`,
      tipo: "Novillona",
      sexo: "Hembra",
      raza: raza,
      fechaNacimiento: restarMeses(14 + (i % 8)),
      peso: `${320 + (i * 5)} kg`,
      pesoActual: 320 + (i * 5),
      potrero: "Las Palmas",
      grupo: "Novillonas de Desarrollo",
      estado: "Sano",
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
        { fecha: restarDias(60), peso: 406 }, // +26 kg en 30d => 0.867 kg/d
        { fecha: restarDias(30), peso: 433 }, // +27 kg en 30d => 0.900 kg/d
        { fecha: restarDias(2),  peso: 460 }  // +27 kg en 28d => 0.964 kg/d  -> GDP global ~0.889 kg/d
      ]
    },
    {
      arete: "TR-1084",
      areteRancho: "1084",
      nombre: "El Morocho",
      tipo: "Torete",
      sexo: "Macho",
      raza: "Simmental",
      fechaNacimiento: restarMeses(16),
      peso: "438 kg",
      pesoActual: 438,
      potrero: "Manga 1",
      grupo: "Engorda / Toretes",
      estado: "Sano",
      madre: "VC-2010",
      padre: "SM-1084",
      fechaRegistro: restarMeses(12),
      ranchoId,
      pesajesEspeciales: [
        { fecha: restarDias(90), peso: 360 },
        { fecha: restarDias(60), peso: 385 }, // +25 kg en 30d => 0.833 kg/d
        { fecha: restarDias(30), peso: 411 }, // +26 kg en 30d => 0.867 kg/d
        { fecha: restarDias(2),  peso: 438 }  // +27 kg en 28d => 0.964 kg/d  -> GDP global ~0.867 kg/d
      ]
    },
    {
      arete: "TR-3218",
      areteRancho: "3218",
      nombre: "El Pinto Élite",
      tipo: "Torete",
      sexo: "Macho",
      raza: "Brahman",
      fechaNacimiento: restarMeses(15),
      peso: "424 kg",
      pesoActual: 424,
      potrero: "Manga 1",
      grupo: "Engorda / Toretes",
      estado: "Sano",
      madre: "VC-2015",
      padre: "SM-3218",
      fechaRegistro: restarMeses(11),
      ranchoId,
      pesajesEspeciales: [
        { fecha: restarDias(90), peso: 340 },
        { fecha: restarDias(60), peso: 367 }, // +27 kg en 30d => 0.900 kg/d
        { fecha: restarDias(30), peso: 395 }, // +28 kg en 30d => 0.933 kg/d
        { fecha: restarDias(2),  peso: 424 }  // +29 kg en 28d => 1.035 kg/d  -> GDP global ~0.933 kg/d
      ]
    }
  ];
  animales.push(...toretesEspeciales);

  // 9 toretes adicionales
  for (let i = 0; i < 9; i++) {
    const numArete = 4100 + i;
    animales.push({
      arete: `TR-${numArete}`,
      areteRancho: `${numArete}`,
      nombre: `Novillo ${numArete}`,
      tipo: "Torete",
      sexo: "Macho",
      raza: razasVacas[(i + 3) % razasVacas.length],
      fechaNacimiento: restarMeses(14 + (i % 5)),
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

  // 6. Generar Eventos de Pesaje, Partos y Sanitarios
  console.log("📈 Generando historial de pesajes y eventos clínicos...");

  for (const an of animalesGuardados) {
    // Si tiene pesajes especiales definidos
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
      // 2 pesajes automáticos para que todos tengan GDP coherente
      const pesoBase = an.pesoActual - 50;
      await setDoc(doc(collection(db, "eventos")), {
        animalId: an.id,
        tipo: "Repeso",
        resultado: `${pesoBase} kg`,
        fecha: restarMeses(4),
        costo: 0,
        origen: "realizado",
        ranchoId
      });
      await setDoc(doc(collection(db, "eventos")), {
        animalId: an.id,
        tipo: "Repeso",
        resultado: `${an.pesoActual} kg`,
        fecha: restarDias(15),
        costo: 0,
        origen: "realizado",
        ranchoId
      });
    }

    // Vacunas y desparasitaciones para historial
    await setDoc(doc(collection(db, "eventos")), {
      animalId: an.id,
      tipo: "Vacunación",
      resultado: "Bacterina 10 Vías (Clostridiasis)",
      fecha: restarMeses(3),
      costo: 45,
      origen: "realizado",
      ranchoId
    });
    await setDoc(doc(collection(db, "eventos")), {
      animalId: an.id,
      tipo: "Desparasitante",
      resultado: "Ivermectina al 3.15%",
      fecha: restarMeses(2),
      costo: 35,
      origen: "realizado",
      ranchoId
    });

    // Eventos específicos para vacas con días abiertos altos
    if (an.arete === "VC-2018") { // La Gitana - 150 días abiertos
      await setDoc(doc(collection(db, "eventos")), {
        animalId: an.id,
        tipo: "Parto",
        resultado: "Cría Hembra (Parto Normal)",
        fecha: restarDias(150),
        costo: 0,
        origen: "realizado",
        ranchoId
      });
      await setDoc(doc(collection(db, "eventos")), {
        animalId: an.id,
        tipo: "Parto",
        resultado: "Cría Macho (Parto Normal)",
        fecha: restarDias(440),
        costo: 0,
        origen: "realizado",
        ranchoId
      });
    } else if (an.arete === "VC-2024") { // Flor de Mayo - 140 días abiertos
      await setDoc(doc(collection(db, "eventos")), {
        animalId: an.id,
        tipo: "Parto",
        resultado: "Cría Macho",
        fecha: restarDias(140),
        costo: 0,
        origen: "realizado",
        ranchoId
      });
      await setDoc(doc(collection(db, "eventos")), {
        animalId: an.id,
        tipo: "Parto",
        resultado: "Cría Hembra",
        fecha: restarDias(430),
        costo: 0,
        origen: "realizado",
        ranchoId
      });
    }
  }

  // 7. Calendario Reproductivo y Sanitario (Alertas Solicitadas)
  console.log("📅 Creando alertas reproductivas y sanitarias...");
  const vacaGolondrina = animalesGuardados.find(a => a.arete === "VC-2000") || animalesGuardados[3];
  const vacaConsentida = animalesGuardados.find(a => a.arete === "VC-2001") || animalesGuardados[4];
  const vacaPaloma     = animalesGuardados.find(a => a.arete === "VC-2004") || animalesGuardados[5];
  const vacaSultana    = animalesGuardados.find(a => a.arete === "VC-2005") || animalesGuardados[6];
  const vacaMarquesa   = animalesGuardados.find(a => a.arete === "VC-2006") || animalesGuardados[7];

  const alertasPlaneadas = [
    // 2 partos próximos programados para este mes (alerta roja)
    {
      tipo: "Parto",
      titulo: `Parto Próximo - ${vacaGolondrina.arete} (${vacaGolondrina.nombre})`,
      resultado: "Atención de Maternidad / Monitoreo",
      fechaProgramada: sumarDias(4),
      fechaRecordatorio: sumarDias(1),
      modoAplicacion: "individual",
      animalId: vacaGolondrina.id,
      completada: false,
      origen: "planeado",
      ranchoId
    },
    {
      tipo: "Parto",
      titulo: `Parto Próximo - ${vacaConsentida.arete} (${vacaConsentida.nombre})`,
      resultado: "Traslado a Potrero Maternidad",
      fechaProgramada: sumarDias(10),
      fechaRecordatorio: sumarDias(7),
      modoAplicacion: "individual",
      animalId: vacaConsentida.id,
      completada: false,
      origen: "planeado",
      ranchoId
    },
    // 2 palpaciones pendientes (alerta amarilla)
    {
      tipo: "Palpación",
      titulo: `Palpación Post-Servicio - ${vacaPaloma.arete} (${vacaPaloma.nombre})`,
      resultado: "Diagnóstico de Gestación (60 días post-inseminación)",
      fechaProgramada: sumarDias(6),
      fechaRecordatorio: sumarDias(3),
      modoAplicacion: "individual",
      animalId: vacaPaloma.id,
      completada: false,
      origen: "planeado",
      ranchoId
    },
    {
      tipo: "Palpación",
      titulo: `Palpación Diagnóstica - ${vacaSultana.arete} (${vacaSultana.nombre})`,
      resultado: "Confirmación de Preñez Ecografía",
      fechaProgramada: sumarDias(12),
      fechaRecordatorio: sumarDias(9),
      modoAplicacion: "individual",
      animalId: vacaSultana.id,
      completada: false,
      origen: "planeado",
      ranchoId
    },
    // 1 secado programado
    {
      tipo: "Secado",
      titulo: `Secado de Vientre - ${vacaMarquesa.arete} (${vacaMarquesa.nombre})`,
      resultado: "Suspensión de Ordeño y Aplicación de Sellador / Terapia de Vaca Seca",
      fechaProgramada: sumarDias(5),
      fechaRecordatorio: sumarDias(2),
      modoAplicacion: "individual",
      animalId: vacaMarquesa.id,
      completada: false,
      origen: "planeado",
      ranchoId
    },
    // 1 vacunación por lote
    {
      tipo: "Vacunación",
      titulo: "Vacunación por Lote - Manga 1 (10 ha)",
      resultado: "Vacuna Clostridial 8 Vías + Rabia Paralítica Bovina",
      fechaProgramada: sumarDias(8),
      fechaRecordatorio: sumarDias(4),
      modoAplicacion: "masivo_potreros",
      filtroPotrero: "Manga 1",
      filtroGrupo: "Engorda / Toretes",
      completada: false,
      origen: "planeado",
      ranchoId
    }
  ];

  for (const alt of alertasPlaneadas) {
    await setDoc(doc(collection(db, "alertas")), alt);
  }

  // 8. Producción de Leche (Últimos 10 días continuos en Tanque Frío)
  console.log("🥛 Sembrando 10 días de producción lechera en tanque frío...");
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

  // 9. Movilización UGR (Borrador de Cita / Trámite B2B)
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

  // Asegurar que exista la ganadera demo para que se enlace perfectamente
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
