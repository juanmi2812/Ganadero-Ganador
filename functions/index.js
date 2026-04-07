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
