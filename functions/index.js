const functions = require("firebase-functions");
const admin = require("firebase-admin");
const { differenceInMonths } = require("date-fns");

admin.initializeApp();
const db = admin.firestore();

exports.actualizarCategoriasGanado = functions.pubsub
  .schedule("0 3 * * *")
  .timeZone("America/Mexico_City")
  .onRun(async (context) => {
    console.log("Iniciando actualización automática de categorías a las 3:00 AM...");
    
    // Obtener todos los animales
    const animalesSnapshot = await db.collection("animales").get();
    
    // Obtener todos los eventos de 'Parto' para cruzar la información
    const eventosSnapshot = await db.collection("eventos").where("tipo", "==", "Parto").get();

    // Crear un diccionario (Set) rápido de los IDs de hembras que han parido
    const hembrasConParto = new Set();
    eventosSnapshot.forEach((doc) => {
      hembrasConParto.add(doc.data().animalId);
    });

    const batch = db.batch();
    let actualizaciones = 0;
    const hoy = new Date();

    animalesSnapshot.forEach((doc) => {
      const animal = doc.data();
      
      // Ignorar animales que ya están marcados como Baja (Venta, Vida, Muerte, etc.)
      if (animal.estado && animal.estado.includes("Baja")) return;
      
      // Si el animal no cruzó la validación de nacimiento, lo saltamos
      if (!animal.fechaNacimiento) return; 
      
      let fechaNac;
      try {
         fechaNac = new Date(animal.fechaNacimiento + "T00:00:00");
         if (isNaN(fechaNac.getTime())) return;
      } catch(e) {
         return;
      }

      const mesesDeEdad = differenceInMonths(hoy, fechaNac);
      const sexo = animal.sexo ? animal.sexo.toLowerCase() : "";
      
      let nuevaCategoria = animal.tipo;

      // === APLICACIÓN DE LAS REGLAS DE NEGOCIO === //
      
      if (mesesDeEdad < 2) {
        // 1. Lactante: < 2 meses
        nuevaCategoria = "Lactante";
        
      } else if (mesesDeEdad >= 2 && mesesDeEdad < 12) {
        // 2. Becerro/a: Entre 2 y 11.9 meses
        nuevaCategoria = sexo === "hembra" ? "Becerra" : "Becerro";
        if (!sexo) nuevaCategoria = "Becerro/a";

      } else if (sexo === "hembra") {
        // Reglas exclusivas para HEMBRAS adultas
        const haParido = hembrasConParto.has(doc.id);
        
        if (haParido || mesesDeEdad >= 48) {
          // 4. Vaca: Ya tuvo cría O ya rebasó los 48 meses
          nuevaCategoria = "Vaca";
        } else if (mesesDeEdad >= 12 && mesesDeEdad < 48 && !haParido) {
          // 3. Novillona: Entre 12 y 48 meses, sin histórico de partos
          nuevaCategoria = "Novillona";
        }

      } else if (sexo === "macho") {
        // Reglas exclusivas para MACHOS adultos
        // 5. Torete: >= 12 meses (Respetando el override manual de "Semental")
        if (mesesDeEdad >= 12 && animal.tipo !== "Semental") {
          nuevaCategoria = "Torete";
        }
      }

      // Si el cálculo dictamina un cambio, lo agregamos al Batch
      if (nuevaCategoria && nuevaCategoria !== animal.tipo) {
        batch.update(doc.ref, { tipo: nuevaCategoria });
        actualizaciones++;
        console.log(`Animal Arete #${animal.arete} cambió automáticamente de ${animal.tipo} a ${nuevaCategoria}`);
      }
    });

    // Ejecutar todas las escrituras a la base de datos de 1 solo golpe (Batch)
    if (actualizaciones > 0) {
      await batch.commit();
      console.log(`✅ ¡Éxito! Se actualizaron correctamente ${actualizaciones} animales.`);
    } else {
      console.log("No hubo animales que requirieran cambio de categoría en este ciclo.");
    }
    
    return null;
  });

// ==========================================
// INTEGRACIÓN CON STRIPE (SUSCRIPCIONES)
// ==========================================

// Para producción o despliegue real, Firebase usa variables de entorno:
const stripeKey = process.env.STRIPE_SECRET_KEY || "CLAVE_SECRETA_AQUI";
const stripe = require("stripe")(stripeKey);

exports.createCheckoutSession = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "Debe iniciar sesión");

  const { priceId, successUrl, cancelUrl } = data;
  const uid = context.auth.uid;
  
  // Buscar si ya tiene customer ID
  const userDoc = await db.collection("usuarios").doc(uid).get();
  const userData = userDoc.data();
  let customerId = userData.stripeCustomerId;

  if (!customerId) {
    const customer = await stripe.customers.create({
      email: context.auth.token.email,
      metadata: { firebaseUID: uid }
    });
    customerId = customer.id;
    await userDoc.ref.update({ stripeCustomerId: customerId });
  }

  const session = await stripe.checkout.sessions.create({
    customer: customerId,
    mode: "subscription",
    payment_method_types: ["card"],
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: successUrl,
    cancel_url: cancelUrl,
    metadata: { firebaseUID: uid }
  });

  return { sessionId: session.id, url: session.url };
});

exports.createPortalSession = functions.https.onCall(async (data, context) => {
  if (!context.auth) throw new functions.https.HttpsError("unauthenticated", "Debe iniciar sesión");

  const uid = context.auth.uid;
  const userDoc = await db.collection("usuarios").doc(uid).get();
  const userData = userDoc.data();
  const customerId = userData.stripeCustomerId;

  if (!customerId) throw new functions.https.HttpsError("failed-precondition", "No hay cliente Stripe");

  const session = await stripe.billingPortal.sessions.create({
    customer: customerId,
    return_url: data.returnUrl,
  });

  return { url: session.url };
});

const stripeWebhookSecret = process.env.STRIPE_WEBHOOK_SECRET || "";

exports.stripeWebhook = functions.https.onRequest(async (req, res) => {
  const sig = req.headers["stripe-signature"];
  let event;

  try {
    if (stripeWebhookSecret) {
      // Producción: Verificar firma usando req.rawBody
      event = stripe.webhooks.constructEvent(req.rawBody, sig, stripeWebhookSecret);
    } else {
      // Desarrollo / Local sin secreto
      event = req.body;
      if (Buffer.isBuffer(req.rawBody)) {
          event = JSON.parse(req.rawBody.toString());
      }
    }
  } catch (err) {
    console.error("Webhook Error", err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  try {
    switch (event.type) {
      case "checkout.session.completed":
      case "invoice.payment_succeeded": {
        const customerId = event.data.object.customer;
        // Buscar al usuario por customerId
        const usersSnap = await db.collection("usuarios").where("stripeCustomerId", "==", customerId).get();
        if (!usersSnap.empty) {
          const userRef = usersSnap.docs[0].ref;
          await userRef.update({ suscripcionActiva: true, estadoSuscripcion: "active" });
        }
        break;
      }
      case "customer.subscription.deleted":
      case "customer.subscription.canceled": {
        const customerId = event.data.object.customer;
        const usersSnap = await db.collection("usuarios").where("stripeCustomerId", "==", customerId).get();
        if (!usersSnap.empty) {
          const userRef = usersSnap.docs[0].ref;
          await userRef.update({ suscripcionActiva: false, estadoSuscripcion: "canceled" });
        }
        break;
      }
    }
    res.json({ received: true });
  } catch (err) {
    console.error(err);
    res.status(500).end();
  }
});

// ==========================================
// BENCHMARK DIARIO (CRON JOB)
// ==========================================

exports.calcularBenchmarksDiarios = functions.pubsub
  .schedule("0 4 * * *") // Se ejecuta a las 4:00 AM todos los días
  .timeZone("America/Mexico_City")
  .onRun(async (context) => {
      await correrBenchmarkGlobal();
      return null;
  });

async function correrBenchmarkGlobal() {
    console.log("Iniciando cálculo de Benchmarks...");
    const ranchosSnap = await db.collection("ranchos").get();
    const animalesSnap = await db.collection("animales").get();
    const eventosSnap = await db.collection("eventos").where("tipo", "==", "Repeso").get();

    const animalesPorRancho = {};
    animalesSnap.forEach(doc => {
      const a = doc.data();
      a.id = doc.id; // Asegurar tener el ID
      if (!a.ranchoId) return;
      if (!animalesPorRancho[a.ranchoId]) animalesPorRancho[a.ranchoId] = [];
      animalesPorRancho[a.ranchoId].push(a);
    });

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

    const promediosPorVocacion = {};
    const promediosPorEstado = {};

    const baseEstructura = () => ({
      totalRanchos: 0,
      totalCabezas: 0,
      mortalidadSuma: 0,
      gdpSuma: 0,
      gdpCount: 0,
      prenezSuma: 0,
      prenezCount: 0,
      valoresMortalidad: [],
      valoresGdp: [],
      valoresPrenez: []
    });

    const inicializarVocacion = (vocacion) => {
      if (!promediosPorVocacion[vocacion]) promediosPorVocacion[vocacion] = baseEstructura();
    };
    const inicializarEstado = (estado) => {
      if (!promediosPorEstado[estado]) promediosPorEstado[estado] = baseEstructura();
    };

    ranchosSnap.forEach(doc => {
      const rancho = doc.data();
      const vocacion = rancho.vocacion || "Desconocida";
      const estado = rancho.estadoRegion || "Desconocido";

      if (vocacion === "Desconocida" && estado === "Desconocido") return;

      const animales = animalesPorRancho[doc.id] || [];
      const totalCabezas = animales.length;
      if (totalCabezas === 0) return;

      const bajasMuerte = animales.filter(a => a.estado === "Baja - Muerte").length;
      const tasaMortalidad = (bajasMuerte / totalCabezas) * 100;
      
      const vientres = animales.filter(a => a.tipo === "Vaca" || a.tipo === "Novillona").length;
      const vientresGestantes = animales.filter(a => a.estado === "Gestante").length;
      const tasaPrenez = vientres > 0 ? (vientresGestantes / vientres) * 100 : null;

      let gdpRancho = null;
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
      if (countGdp > 0) gdpRancho = sumaGdp / countGdp;

      const procesarCategoria = (categoriaObj) => {
        categoriaObj.totalRanchos++;
        categoriaObj.totalCabezas += totalCabezas;
        
        categoriaObj.mortalidadSuma += tasaMortalidad;
        categoriaObj.valoresMortalidad.push(tasaMortalidad);

        if (gdpRancho !== null) {
          categoriaObj.gdpSuma += gdpRancho;
          categoriaObj.gdpCount++;
          categoriaObj.valoresGdp.push(gdpRancho);
        }

        if (tasaPrenez !== null) {
          categoriaObj.prenezSuma += tasaPrenez;
          categoriaObj.prenezCount++;
          categoriaObj.valoresPrenez.push(tasaPrenez);
        }
      };

      if (vocacion !== "Desconocida") {
        inicializarVocacion(vocacion);
        procesarCategoria(promediosPorVocacion[vocacion]);
      }

      if (estado !== "Desconocido") {
        inicializarEstado(estado);
        procesarCategoria(promediosPorEstado[estado]);
      }
    });

    const procesarAgrupacion = (agrupacion) => {
      const result = {};
      Object.keys(agrupacion).forEach(key => {
        const obj = agrupacion[key];
        const tr = obj.totalRanchos;
        if (tr > 0) {
          // Ordenar arrays para poder calcular el ranking exacto.
          // Mortalidad (menor es mejor)
          const rankMortalidad = obj.valoresMortalidad.sort((a, b) => a - b);
          // GDP y Preñez (mayor es mejor)
          const rankGdp = obj.valoresGdp.sort((a, b) => b - a);
          const rankPrenez = obj.valoresPrenez.sort((a, b) => b - a);

          result[key] = {
            ranchosParticipantes: tr,
            promedioCabezas: obj.totalCabezas / tr,
            promedioMortalidad: obj.mortalidadSuma / tr,
            promedioGdp: obj.gdpCount > 0 ? obj.gdpSuma / obj.gdpCount : 0,
            promedioPrenez: obj.prenezCount > 0 ? obj.prenezSuma / obj.prenezCount : 0,
            rankings: {
              mortalidad: rankMortalidad,
              gdp: rankGdp,
              prenez: rankPrenez
            }
          };
        }
      });
      return result;
    };

    const dataFinal = {
      ultimaActualizacion: new Date().toISOString(),
      porVocacion: procesarAgrupacion(promediosPorVocacion),
      porEstado: procesarAgrupacion(promediosPorEstado)
    };

    await db.collection("benchmarks").doc("ultimo").set(dataFinal);
    console.log("Benchmarks calculados y guardados exitosamente.");
}

exports.forzarBenchmark2 = functions.https.onRequest(async (req, res) => {
    await correrBenchmarkGlobal();
    res.send("Forzado 2 GDP Fix");
});
