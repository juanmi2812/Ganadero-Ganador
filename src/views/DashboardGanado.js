import React, { useState, useEffect } from "react";
import { Search, X, Plus, Activity, Baby, Scale, AlertTriangle, TrendingUp } from "lucide-react";
import { collection, onSnapshot, addDoc, query, where, doc, updateDoc, getDocs } from "firebase/firestore"; 
import { differenceInMonths } from "date-fns";
import { db } from "../firebase";
import Header from "../components/Header";
import { CATALOGO_EVENTOS, TIPOS_EVENTO_GANADO, EVENTOS_GANADO, TRATAMIENTOS_GANADO } from "../catalogoEventos";

export default function DashboardGanado({ usuario, abrirModalTratamientoMasivo, setAbrirModalTratamientoMasivo }) {
  // --- ESTADOS ---
  const [inventario, setInventario] = useState([]);
  const [potrerosCol, setPotrerosCol] = useState([]);
  const [gruposCol, setGruposCol] = useState([]);
  const [busqueda, setBusqueda] = useState("");
  const [filtroActivo, setFiltroActivo] = useState("Todos");
  const [filtroPotrero, setFiltroPotrero] = useState("Todos");
  const [filtroGrupo, setFiltroGrupo] = useState("Todos");
  const [config, setConfig] = useState(null); // Finanzas
  
  const [animalActivo, setAnimalActivo] = useState(null);
  const [historialEventos, setHistorialEventos] = useState([]);
  const [mostrandoFormulario, setMostrandoFormulario] = useState(false);
  const [mostrandoBaja, setMostrandoBaja] = useState(false);
  const [editandoUbicacion, setEditandoUbicacion] = useState(false);
  const [nuevaUbicacion, setNuevaUbicacion] = useState({ potrero: "", grupo: "" });
  const [editandoEstado, setEditandoEstado] = useState(false);
  const [nuevoEstadoManual, setNuevoEstadoManual] = useState("");
  const [tipoFormularioIndiv, setTipoFormularioIndiv] = useState("evento");
  const [editandoDatosAnimal, setEditandoDatosAnimal] = useState(false);
  const [datosEdicionAnimal, setDatosEdicionAnimal] = useState({});
  
  // Acciones Masivas (Selección)
  const [seleccionados, setSeleccionados] = useState(new Set());
  const [mostrarModalAccionMasiva, setMostrarModalAccionMasiva] = useState(false);
  const [accionMasivaActiva, setAccionMasivaActiva] = useState("mover"); // "mover" | "vender"
  const [nuevaUbicacionMasiva, setNuevaUbicacionMasiva] = useState({ potrero: "", grupo: "" });
  const [guardandoMasivoSelect, setGuardandoMasivoSelect] = useState(false);
  
  const [datosEvento, setDatosEvento] = useState({ 
    tipo: "Desparasitante", resultado: "", fecha: new Date().toISOString().split('T')[0], recordatorio: "1 semana antes", costo: "", condicionCorporal: "", observaciones: ""
  });
  const [datosBaja, setDatosBaja] = useState({ 
    motivo: "Venta", notas: "", fecha: new Date().toISOString().split('T')[0] 
  });
  const [sincronizado, setSincronizado] = useState(false);
  
  // Tratamiento Masivo
  const [mostrarModalMasivo, setMostrarModalMasivo] = useState(false);
  const [datosMasivos, setDatosMasivos] = useState({ tipo: "Desparasitante", resultado: "", fecha: new Date().toISOString().split("T")[0], costo: "" });
  const [filtroGrupoMasivo, setFiltroGrupoMasivo] = useState("Todos");
  const [guardandoMasivo, setGuardandoMasivo] = useState(false);
  const [exitoMasivo, setExitoMasivo] = useState("");
  const [crearRecordatorio, setCrearRecordatorio] = useState(false);
  const [fechaRecordatorio, setFechaRecordatorio] = useState("");

  // Palpación Masiva
  const [mostrarModalPalpacion, setMostrarModalPalpacion] = useState(false);
  const [vientresPalpacion, setVientresPalpacion] = useState([]);
  const [guardandoPalpacion, setGuardandoPalpacion] = useState(false);

  // Cambio de Arete
  const [mostrarModalArete, setMostrarModalArete] = useState(false);
  const [nuevoArete, setNuevoArete] = useState("");
  const [nuevoAreteRancho, setNuevoAreteRancho] = useState("");

  useEffect(() => {
    if (abrirModalTratamientoMasivo) {
      setMostrarModalMasivo(true);
      if (setAbrirModalTratamientoMasivo) setAbrirModalTratamientoMasivo(false);
    }
  }, [abrirModalTratamientoMasivo, setAbrirModalTratamientoMasivo]);

  // --- EFECTOS AUTOMÁTICOS (OPCIÓN A) ---
  useEffect(() => {
    if (inventario.length > 0 && !sincronizado) {
      setSincronizado(true);
      
      const sincronizarCategorias = async () => {
        try {
          const qPartos = query(collection(db, "eventos"), where("tipo", "==", "Parto"), where("ranchoId", "==", usuario?.ranchoId));
          const partosSnap = await getDocs(qPartos);
          const hembrasConParto = new Set();
          partosSnap.forEach(d => hembrasConParto.add(d.data().animalId));

          const qPalpaciones = query(collection(db, "eventos"), where("tipo", "==", "Palpación"), where("resultado", "==", "Gestante"), where("ranchoId", "==", usuario?.ranchoId));
          const palpacionesSnap = await getDocs(qPalpaciones);
          const ultimasPalpaciones = {};
          palpacionesSnap.forEach(d => {
            const data = d.data();
            if (!data.animalId || !data.fecha) return;
            const fechaEvento = new Date(data.fecha + "T00:00:00");
            if (isNaN(fechaEvento.getTime())) return;
            if (!ultimasPalpaciones[data.animalId] || fechaEvento > ultimasPalpaciones[data.animalId].fecha) {
               ultimasPalpaciones[data.animalId] = { fecha: fechaEvento, meses: parseInt(data.detalle) || 1 };
            }
          });

          const qAlertas = query(collection(db, "alertas"), where("titulo", "==", "Revisión de Fertilidad"), where("ranchoId", "==", usuario?.ranchoId));
          const alertasSnap = await getDocs(qAlertas);
          const animalesConAlerta = new Set();
          alertasSnap.forEach(d => animalesConAlerta.add(d.data().animalId));

          const hoy = new Date();
          
          for (const animal of inventario) {
            if (animal.estado?.includes('Baja')) continue;
            if (!animal.fechaNacimiento) continue;

            const fechaNac = new Date(animal.fechaNacimiento + "T00:00:00");
            if (isNaN(fechaNac.getTime())) continue;

            const mesesDeEdad = differenceInMonths(hoy, fechaNac);
            const sexo = animal.sexo ? animal.sexo.toLowerCase() : "";
            let nuevaCategoria = animal.tipo;
            let nuevoEstado = animal.estado || "Sano";

            if (mesesDeEdad < 2) {
              nuevaCategoria = "Lactante";
            } else if (mesesDeEdad >= 2 && mesesDeEdad < 12) {
              nuevaCategoria = sexo === "hembra" ? "Becerra" : "Becerro";
              if (!sexo) nuevaCategoria = "Becerro/a";
            } else if (sexo === "hembra") {
              const haParido = hembrasConParto.has(animal.id);
              if (haParido || mesesDeEdad >= 48) {
                nuevaCategoria = "Vaca";
                if (!haParido && mesesDeEdad >= 48) {
                  if (!nuevoEstado.includes('Baja') && nuevoEstado !== "Desecho" && nuevoEstado !== "Alerta: Revisión de Fertilidad" && nuevoEstado !== "Gestante") {
                    nuevoEstado = "Alerta: Revisión de Fertilidad";
                  }
                }
              } else if (mesesDeEdad >= 12 && mesesDeEdad < 48 && !haParido) {
                nuevaCategoria = "Novillona";
              }
            } else if (sexo === "macho") {
              if (mesesDeEdad >= 12 && animal.tipo !== "Semental") {
                nuevaCategoria = "Torete";
              }
            }

            if (nuevoEstado === "Gestante") {
                const palpacion = ultimasPalpaciones[animal.id];
                if (palpacion) {
                  const mesesDesdePalpacion = differenceInMonths(hoy, palpacion.fecha);
                  const gestacionActual = palpacion.meses + mesesDesdePalpacion;
                  if (gestacionActual >= 10) {
                    nuevoEstado = "Vacía";
                  }
                }
              }

            if (nuevaCategoria !== animal.tipo || nuevoEstado !== animal.estado) {
              await updateDoc(doc(db, "animales", animal.id), { tipo: nuevaCategoria, estado: nuevoEstado });
            }
          }
        } catch (error) {
          console.error("Error al sincronizar categorías:", error);
        }
      };

      sincronizarCategorias();
    }
  }, [inventario, sincronizado, usuario?.ranchoId]);

  // --- EFECTOS (FIREBASE) ---
  useEffect(() => {
    if (!usuario?.ranchoId) return;
    const q = query(collection(db, "animales"), where("ranchoId", "==", usuario.ranchoId));
    const cancelarSuscripcion = onSnapshot(q, (snapshot) => {
        const listaAnimales = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setInventario(listaAnimales);
      }
    );

    const qPotreros = query(collection(db, "potreros"), where("ranchoId", "==", usuario.ranchoId));
    const unsubPotreros = onSnapshot(qPotreros, (snap) => {
      setPotrerosCol(snap.docs.map(doc => doc.data()));
    });

    const qGrupos = query(collection(db, "grupos"), where("ranchoId", "==", usuario.ranchoId));
    const unsubGrupos = onSnapshot(qGrupos, (snap) => {
      setGruposCol(snap.docs.map(doc => doc.data()));
    });

    return () => {
      cancelarSuscripcion();
      unsubPotreros();
      unsubGrupos();
    };
  }, [usuario]);

  useEffect(() => {
    if (!animalActivo) return;
    const q = query(collection(db, "eventos"), where("animalId", "==", animalActivo.id));
    const cancelarEventos = onSnapshot(q, (snapshot) => {
      const eventos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      eventos.sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
      setHistorialEventos(eventos);
    });
    return () => cancelarEventos();
  }, [animalActivo]);

  useEffect(() => {
    if (!usuario?.ranchoId) return;
    const qConf = doc(db, "configuracion", `financiera_${usuario.ranchoId}`);
    const cancelarConfig = onSnapshot(qConf, (docSnap) => {
      if (docSnap.exists()) setConfig(docSnap.data());
    });
    return () => cancelarConfig();
  }, [usuario]);

  useEffect(() => {
    if (mostrarModalPalpacion) {
      const vientres = inventario
        .filter(a => (a.tipo === "Vaca" || a.tipo === "Novillona") && !a.estado?.includes('Baja'))
        .map(a => ({
          id: a.id,
          arete: a.arete,
          tipo: a.tipo,
          estadoActual: a.estado || "Sano",
          resultado: "Gestante",
          detalle: "3", // default 3 meses si es gestante
          condicionCorporal: "",
          observaciones: ""
        }));
      setVientresPalpacion(vientres);
    }
  }, [mostrarModalPalpacion, inventario]);

  // --- LÓGICA DE NEGOCIO (BI & CALCULOS) ---
  const obtenerEstadisticasPeso = () => {
    if (!animalActivo) return null;

    const pesoInicial = parseFloat(animalActivo.peso?.toString().replace(/[^0-9.]/g, '')) || 0;
    
    const repesos = historialEventos
      .filter(ev => ev.tipo === "Repeso")
      .map(ev => ({
        peso: parseFloat(ev.resultado?.toString().replace(/[^0-9.]/g, '')),
        fecha: new Date(ev.fecha)
      }))
      .sort((a, b) => b.fecha - a.fecha);

    if (repesos.length === 0) return { actual: pesoInicial, gananciaTotal: 0, gdp: 0 };

    const pesoActual = repesos[0].peso;
    const gananciaTotal = pesoActual - pesoInicial;
    let gdp = 0;

    if (repesos.length > 1) {
      // Calcular GDP del último periodo entre repesos
      const gananciaPeriodo = repesos[0].peso - repesos[1].peso;
      const diffTiempo = Math.abs(repesos[0].fecha - repesos[1].fecha);
      const dias = Math.ceil(diffTiempo / (1000 * 60 * 60 * 24)) || 1;
      gdp = gananciaPeriodo / dias;
    } else {
      // Si hay solo 1 repeso, usar la fecha de nacimiento si existe (ideal para becerros), si no la de registro
      const fechaInicial = new Date(animalActivo.fechaNacimiento || animalActivo.fechaRegistro || new Date());
      const diffTiempo = Math.abs(repesos[0].fecha - fechaInicial);
      const dias = Math.ceil(diffTiempo / (1000 * 60 * 60 * 24)) || 1;
      gdp = gananciaTotal / dias;
    }

    return { actual: pesoActual, gananciaTotal: gananciaTotal.toFixed(2), gdp: gdp.toFixed(3) };
  };

  const obtenerRentabilidad = () => {
    if (!animalActivo || !config) return null;

    const fechaInicial = new Date(animalActivo.fechaNacimiento ? animalActivo.fechaNacimiento + "T00:00:00" : (animalActivo.fechaRegistro || new Date()));
    const diffTiempo = Math.abs(new Date() - fechaInicial);
    const diasEnRancho = Math.ceil(diffTiempo / (1000 * 60 * 60 * 24)) || 1;

    const tarifaDiaria = config.costoDiario[animalActivo.tipo] || 30;
    const costoMantenimiento = diasEnRancho * tarifaDiaria;
    const costoMedicoTotal = historialEventos.reduce((total, ev) => total + (Number(ev.costo) || 0), 0);
    const costoTotalInvertido = costoMantenimiento + costoMedicoTotal;

    return { costoMantenimiento, costoMedicoTotal, costoTotalInvertido, diasEnRancho };
  };

  const stats = obtenerEstadisticasPeso();
  const finanzas = obtenerRentabilidad();

  const ganadoFiltrado = inventario.filter((animal) => {
    const cumpleBusqueda = animal.arete?.toLowerCase().includes(busqueda.toLowerCase());
    if (!cumpleBusqueda) return false;

    const cumplePotrero = filtroPotrero === "Todos" || (animal.potrero || animal.hectarea) === filtroPotrero;
    if (!cumplePotrero) return false;

    const cumpleGrupo = filtroGrupo === "Todos" || animal.grupo === filtroGrupo;
    if (!cumpleGrupo) return false;

    if (filtroActivo === "Todos") return true;
    if (filtroActivo === "Bajas") return animal.estado?.includes('Baja');
    if (filtroActivo === "En Venta") return animal.estado === "Disponible para Venta" || animal.estado === "Desecho";
    if (filtroActivo === "Machos") return animal.sexo?.toLowerCase() === "macho" && !animal.estado?.includes('Baja');
    if (filtroActivo === "Hembras") return animal.sexo?.toLowerCase() === "hembra" && !animal.estado?.includes('Baja');
    
    return animal.tipo === filtroActivo && !animal.estado?.includes('Baja') && animal.estado !== "Disponible para Venta" && animal.estado !== "Desecho";
  });

  const listaPotreros = ["Todos", ...new Set([...inventario.map(a => a.potrero || a.hectarea), ...potrerosCol.map(p => p.nombre)].filter(Boolean))].sort();
  const listaGrupos = ["Todos", ...new Set([...inventario.map(a => a.grupo), ...gruposCol.map(g => g.nombre)].filter(Boolean))].sort();

  // --- ACCIONES ---
  const guardarEvento = async (e) => {
    e.preventDefault();
    try {
      const eventoPayload = {
        animalId: animalActivo.id,
        tipo: datosEvento.tipo,
        resultado: datosEvento.resultado,
        fecha: datosEvento.fecha,
        costo: Number(datosEvento.costo) || 0,
        origen: "realizado",
        ranchoId: usuario?.ranchoId || null
      };

      if (datosEvento.tipo === "Palpación") {
        eventoPayload.condicionCorporal = datosEvento.condicionCorporal;
        eventoPayload.observaciones = datosEvento.observaciones;
      }

      await addDoc(collection(db, "eventos"), eventoPayload);

      const updates = {};
      if (datosEvento.tipo === "Parto") {
         updates.estado = "Sano";
         if (animalActivo.tipo !== "Vaca") updates.tipo = "Vaca";
      } else if (datosEvento.tipo === "Palpación" && datosEvento.resultado.toLowerCase().includes("gestante")) {
         updates.estado = "Gestante";
      } else if (datosEvento.tipo === "Palpación" && datosEvento.resultado.toLowerCase().includes("vacía")) {
         updates.estado = "Sano";
      }

      if (Object.keys(updates).length > 0) {
         await updateDoc(doc(db, "animales", animalActivo.id), updates);
      }

      setDatosEvento({ tipo: "Desparasitante", resultado: "", fecha: new Date().toISOString().split('T')[0], recordatorio: "1 semana antes", costo: "", condicionCorporal: "", observaciones: "" });
      setMostrandoFormulario(false);
    } catch (error) { console.error(error); }
  };

  const guardarCambioArete = async (e) => {
    e.preventDefault();
    if (!nuevoArete.trim() && !nuevoAreteRancho.trim()) return;
    const areteFinal = nuevoArete.trim() !== "" ? nuevoArete.trim() : (animalActivo.arete || "");
    const ranchoFinal = nuevoAreteRancho.trim() !== "" ? nuevoAreteRancho.trim() : (animalActivo.areteRancho || "");
    try {
      await addDoc(collection(db, "eventos"), {
        animalId: animalActivo.id,
        tipo: "Cambio de Arete",
        resultado: `SINIIGA: ${animalActivo.arete || "--"} -> ${areteFinal || "--"} | Rancho: ${animalActivo.areteRancho || "--"} -> ${ranchoFinal || "--"}`,
        fecha: new Date().toISOString().split('T')[0],
        costo: 0,
        origen: "realizado",
        ranchoId: usuario?.ranchoId || null
      });

      await updateDoc(doc(db, "animales", animalActivo.id), {
        arete: nuevoArete,
        areteRancho: nuevoAreteRancho
      });

      setAnimalActivo({...animalActivo, arete: nuevoArete, areteRancho: nuevoAreteRancho});
      setMostrarModalArete(false);
      setNuevoArete("");
      setNuevoAreteRancho("");
    } catch (error) {
      console.error(error);
      alert("Error al cambiar el arete.");
    }
  };


  const obtenerAnimalesAfectadosMasivo = (tipoEvento, grupo) => {
    return inventario.filter(a => {
      if (a.estado?.includes('Baja')) return false;
      if (grupo !== "Todos" && a.grupo !== grupo) return false;
      
      const soloHembras = ["Palpación", "Parto", "Inseminación"].includes(tipoEvento);
      if (soloHembras && a.sexo?.toLowerCase() !== "hembra") return false;
      
      return true;
    });
  };

  const guardarEventoMasivo = async (e) => {
    e.preventDefault();
    setGuardandoMasivo(true);
    setExitoMasivo("");
    try {
      const animalesAfectados = obtenerAnimalesAfectadosMasivo(datosMasivos.tipo, filtroGrupoMasivo);

      if (animalesAfectados.length === 0) {
        alert("No hay animales que coincidan con estos filtros.");
        setGuardandoMasivo(false);
        return;
      }

      for (const animal of animalesAfectados) {
        await addDoc(collection(db, "eventos"), {
          animalId: animal.id,
          tipo: datosMasivos.tipo,
          resultado: datosMasivos.resultado,
          fecha: datosMasivos.fecha,
          costo: Number(datosMasivos.costo) || 0,
          origen: "realizado",
          ranchoId: usuario?.ranchoId || null
        });

        const updates = {};
        if (datosMasivos.tipo === "Palpación" && datosMasivos.resultado.toLowerCase().includes("gestante")) {
           updates.estado = "Gestante";
        } else if (datosMasivos.tipo === "Palpación" && datosMasivos.resultado.toLowerCase().includes("vacía")) {
           updates.estado = "Sano";
        } else if (datosMasivos.tipo === "Parto") {
           updates.estado = "Sano";
           if (animal.tipo !== "Vaca") updates.tipo = "Vaca";
        }

        if (Object.keys(updates).length > 0) {
           await updateDoc(doc(db, "animales", animal.id), updates);
        }
      }
      if (crearRecordatorio && fechaRecordatorio) {
        const parteGrupo = filtroGrupoMasivo !== "Todos" ? `Grupo: ${filtroGrupoMasivo}` : "Todos los grupos";
        const tituloRecord = `${datosMasivos.tipo}${datosMasivos.resultado ? ` (${datosMasivos.resultado})` : ""} — ${parteGrupo}`;
        await addDoc(collection(db, "alertas"), {
          fechaProgramada: fechaRecordatorio,
          titulo: tituloRecord,
          tipo: datosMasivos.tipo,
          resultado: datosMasivos.resultado,
          costo: 0,
          modoAplicacion: "masivo",
          filtroGrupo: filtroGrupoMasivo,
          completada: false,
          origen: "planeado",
          ranchoId: usuario?.ranchoId || null
        });
      }
      setExitoMasivo(`✅ Aplicado a ${animalesAfectados.length} cabezas.`);
      setCrearRecordatorio(false);
      setFechaRecordatorio("");
      setTimeout(() => { setExitoMasivo(""); setMostrarModalMasivo(false); }, 2000);
    } catch (error) {
      console.error(error);
      alert("Error al aplicar tratamientos.");
    }
    setGuardandoMasivo(false);
  };

  const guardarBaja = async (e) => {
    e.preventDefault();
    try {
      const animalRef = doc(db, "animales", animalActivo.id);
      await updateDoc(animalRef, { estado: `Baja - ${datosBaja.motivo}` });
      await addDoc(collection(db, "eventos"), {
        animalId: animalActivo.id,
        tipo: "Baja",
        resultado: datosBaja.motivo,
        fecha: datosBaja.fecha,
        notas: datosBaja.notas,
        ranchoId: usuario?.ranchoId || null
      });
      setAnimalActivo({ ...animalActivo, estado: `Baja - ${datosBaja.motivo}` });
      setMostrandoBaja(false);
    } catch (error) { console.error(error); }
  };

  const toggleSeleccion = (id, e) => {
    e.stopPropagation();
    const nuevos = new Set(seleccionados);
    if (nuevos.has(id)) nuevos.delete(id);
    else nuevos.add(id);
    setSeleccionados(nuevos);
  };

  const seleccionarTodos = () => {
    if (seleccionados.size === ganadoFiltrado.length) {
      setSeleccionados(new Set());
    } else {
      setSeleccionados(new Set(ganadoFiltrado.map(a => a.id)));
    }
  };

  const ejecutarAccionMasiva = async () => {
    if (seleccionados.size === 0) return;
    setGuardandoMasivoSelect(true);
    
    try {
      const ids = Array.from(seleccionados);
      
      for (const id of ids) {
        const animalRef = doc(db, "animales", id);
        if (accionMasivaActiva === "moverPotrero") {
          if (nuevaUbicacionMasiva.potrero !== "") {
            await updateDoc(animalRef, { potrero: nuevaUbicacionMasiva.potrero === "Sin Asignar" ? "" : nuevaUbicacionMasiva.potrero });
          }
        } else if (accionMasivaActiva === "moverGrupo") {
          if (nuevaUbicacionMasiva.grupo !== "") {
            await updateDoc(animalRef, { grupo: nuevaUbicacionMasiva.grupo === "Sin Asignar" ? "" : nuevaUbicacionMasiva.grupo });
          }
        } else if (accionMasivaActiva === "vender") {
          await updateDoc(animalRef, { estado: "Disponible para Venta" });
        }
      }
      
      setSeleccionados(new Set());
      setMostrarModalAccionMasiva(false);
    } catch (error) {
      console.error("Error en acción masiva:", error);
    }
    
    setGuardandoMasivoSelect(false);
  };

  const guardarCambioUbicacion = async () => {
    try {
      await updateDoc(doc(db, "animales", animalActivo.id), {
        potrero: nuevaUbicacion.potrero,
        grupo: nuevaUbicacion.grupo
      });
      setAnimalActivo({...animalActivo, potrero: nuevaUbicacion.potrero, grupo: nuevaUbicacion.grupo});
      setEditandoUbicacion(false);
    } catch(e) { console.error(e); }
  };

  const guardarCambioEstado = async () => {
    try {
      await updateDoc(doc(db, "animales", animalActivo.id), { estado: nuevoEstadoManual });
      setAnimalActivo({...animalActivo, estado: nuevoEstadoManual});
      setEditandoEstado(false);
    } catch (error) {
      console.error(error);
      alert("Error al actualizar el estado.");
    }
  };

  const guardarEdicionAnimal = async () => {
    try {
      await updateDoc(doc(db, "animales", animalActivo.id), {
        raza: datosEdicionAnimal.raza || "",
        peso: datosEdicionAnimal.peso || "",
        fechaNacimiento: datosEdicionAnimal.fechaNacimiento || "",
        madre: datosEdicionAnimal.madre || "",
        padre: datosEdicionAnimal.padre || ""
      });
      setAnimalActivo({...animalActivo, ...datosEdicionAnimal});
      setEditandoDatosAnimal(false);
    } catch (error) {
      console.error(error);
      alert("Error al guardar los datos del animal.");
    }
  };

  const guardarPalpacionMasiva = async (e) => {
    e.preventDefault();
    setGuardandoPalpacion(true);
    try {
      const promesas = vientresPalpacion.map(async (v) => {
        const resultadoFinal = v.resultado === "Gestante" ? `Gestante ${v.detalle} meses` : v.resultado;
        
        await addDoc(collection(db, "eventos"), {
          animalId: v.id,
          tipo: "Palpación",
          resultado: resultadoFinal,
          fecha: new Date().toISOString().split('T')[0],
          costo: 0,
          origen: "realizado",
          ranchoId: usuario?.ranchoId,
          condicionCorporal: v.condicionCorporal || "",
          observaciones: v.observaciones || ""
        });

        const updates = { 
          estado: v.resultado === "Gestante" ? "Gestante" : "Sano" 
        };
        if (v.tipo === "Novillona" && v.resultado === "Gestante") {
          updates.tipo = "Vaca";
        }

        await updateDoc(doc(db, "animales", v.id), updates);
      });

      await Promise.all(promesas);
      setExitoMasivo("¡Palpaciones guardadas con éxito!");
      setTimeout(() => {
        setMostrarModalPalpacion(false);
        setExitoMasivo("");
      }, 1500);
    } catch (error) {
      console.error(error);
      alert("Error al guardar palpaciones");
    } finally {
      setGuardandoPalpacion(false);
    }
  };

  const actualizarRenglonPalpacion = (id, campo, valor) => {
    setVientresPalpacion(prev => prev.map(v => v.id === id ? { ...v, [campo]: valor } : v));
  };

  const hacerSemental = async () => {
    try {
      const animalRef = doc(db, "animales", animalActivo.id);
      await updateDoc(animalRef, { tipo: "Semental", estado: "Sano" });
      setAnimalActivo({ ...animalActivo, tipo: "Semental", estado: "Sano" });
    } catch (error) { console.error(error); }
  };

  const marcarDesecho = async () => {
    try {
      const animalRef = doc(db, "animales", animalActivo.id);
      await updateDoc(animalRef, { estado: "Desecho" });
      setAnimalActivo({ ...animalActivo, estado: "Desecho" });
    } catch (error) { console.error(error); }
  };

  const conteos = {
    Todos: inventario.filter(a => !a.estado?.includes('Baja')).length,
    Vaca: inventario.filter(a => a.tipo === "Vaca" && !a.estado?.includes('Baja')).length,
    Novillona: inventario.filter(a => a.tipo === "Novillona" && !a.estado?.includes('Baja')).length,
    Semental: inventario.filter(a => a.tipo === "Semental" && !a.estado?.includes('Baja')).length,
    Torete: inventario.filter(a => a.tipo === "Torete" && !a.estado?.includes('Baja')).length,
    "En Venta": inventario.filter(a => a.estado === "Disponible para Venta" || a.estado === "Desecho").length,
    Bajas: inventario.filter(a => a.estado?.includes('Baja')).length,
  };

  const machos = inventario.filter(a => a.sexo?.toLowerCase() === "macho" && !a.estado?.includes('Baja')).length;
  const hembras = inventario.filter(a => a.sexo?.toLowerCase() === "hembra" && !a.estado?.includes('Baja')).length;

  const getStatusClass = (estado) => {
    if (!estado || estado === "Sano") return "status-sano";
    if (estado.includes("Alerta") || estado.includes("Baja")) return "status-alerta";
    if (estado === "Disponible para Venta") return "status-venta";
    if (estado === "Desecho") return "status-desecho";
    return "status-sano";
  };

  const getAnimalEmoji = (tipo, sexo) => {
    if (tipo === "Semental") return "🐂";
    if (tipo === "Vaca") return "🐄";
    if (tipo === "Torete") return "🐃";
    if (tipo === "Novillona") return "🐮";
    if (tipo === "Becerro" || tipo === "Becerra") return "🐄";
    if (sexo?.toLowerCase() === "macho") return "♂️";
    return "♀️";
  };

  return (
    <div className="dashboard-container">
      
      <Header subtitle="Control de inventario y análisis de rendimiento.">
        {usuario?.rol !== "tecnico" && (
          <div style={{ display: "flex", gap: "10px" }}>
            <button 
              className="btn-primary" 
              onClick={() => setMostrarModalPalpacion(true)}
              style={{ margin: 0, width: "auto", display: "flex", alignItems: "center", gap: "6px", backgroundColor: "#7c3aed", borderColor: "#7c3aed", padding: "10px 20px" }}
            >
              🔍 Cargar Palpación
            </button>
            <button 
              className="btn-primary" 
              onClick={() => setMostrarModalMasivo(true)}
              style={{ margin: 0, width: "auto", display: "flex", alignItems: "center", gap: "6px", backgroundColor: "#16a34a", borderColor: "#16a34a", padding: "10px 20px" }}
            >
              💊 Cargar Tratamiento
            </button>
          </div>
        )}
      </Header>

      <div className="kpi-grid">
        <div className="kpi-card" onClick={() => setFiltroActivo("Todos")} style={{cursor: "pointer", border: filtroActivo === "Todos" ? "2px solid var(--verde-primario)" : "1px solid #e5e7eb"}}>
          <div style={{ fontSize: "22px", marginBottom: "6px" }}>🐄</div>
          <div className="kpi-value">{conteos.Todos}</div>
          <div className="kpi-label">Total Cabezas</div>
        </div>
        <div className="kpi-card" onClick={() => setFiltroActivo("Machos")} style={{cursor: "pointer", border: filtroActivo === "Machos" ? "2px solid #1565c0" : "1px solid #e5e7eb"}}>
          <div style={{ fontSize: "22px", marginBottom: "6px" }}>♂️</div>
          <div className="kpi-value" style={{ color: "#1565c0" }}>{machos}</div>
          <div className="kpi-label">Machos</div>
        </div>
        <div className="kpi-card" onClick={() => setFiltroActivo("Hembras")} style={{cursor: "pointer", border: filtroActivo === "Hembras" ? "2px solid #7b1fa2" : "1px solid #e5e7eb"}}>
          <div style={{ fontSize: "22px", marginBottom: "6px" }}>♀️</div>
          <div className="kpi-value" style={{ color: "#7b1fa2" }}>{hembras}</div>
          <div className="kpi-label">Hembras</div>
        </div>
        <div className="kpi-card" onClick={() => setFiltroActivo("En Venta")} style={{cursor: "pointer", border: filtroActivo === "En Venta" ? "2px solid #ef6c00" : "1px solid #e5e7eb"}}>
          <div style={{ fontSize: "22px", marginBottom: "6px" }}>💰</div>
          <div className="kpi-value" style={{ color: "#ef6c00" }}>{conteos["En Venta"]}</div>
          <div className="kpi-label">En Venta</div>
        </div>
      </div>

      <div className="filter-bar">
        {["Todos", "Vaca", "Novillona", "Semental", "Torete", "En Venta", "Bajas"].map((tipo) => (
          <button 
            key={tipo} 
            className={`filter-pill ${filtroActivo === tipo ? "active" : ""}`}
            onClick={() => setFiltroActivo(tipo)}
          >
            {tipo}
            <span className="filter-badge" style={{
              background: filtroActivo === tipo ? "var(--verde-primario)" : "var(--gris-400)"
            }}>
              {conteos[tipo] || 0}
            </span>
          </button>
        ))}
      </div>

      <div className="search-bar" style={{ gap: "10px", alignItems: "center" }}>
        <div style={{ flex: 1, display: "flex", alignItems: "center", gap: "10px", backgroundColor: "#f9fafb", padding: "0 12px", borderRadius: "8px", border: "1px solid #d1d5db" }}>
          <Search size={20} color="#9ca3af" />
          <input 
            type="text" 
            placeholder="Buscar por número de arete..." 
            value={busqueda} 
            onChange={(e) => setBusqueda(e.target.value)} 
            style={{ border: "none", width: "100%", padding: "10px 0", backgroundColor: "transparent", outline: "none" }}
          />
        </div>
      </div>
      
      <div className="search-bar" style={{ gap: "10px", marginTop: "10px" }}>
        <select 
          value={filtroPotrero} 
          onChange={(e) => setFiltroPotrero(e.target.value)}
          style={{ padding: "10px", borderRadius: "8px", border: "1px solid #d1d5db", backgroundColor: "white", color: "#374151", fontSize: "14px", cursor: "pointer", maxWidth: "200px" }}
        >
          {listaPotreros.map(h => <option key={h} value={h}>{h === "Todos" ? "🏞️ Todos los Potreros" : `🚩 ${h}`}</option>)}
        </select>
        <select 
          value={filtroGrupo} 
          onChange={(e) => setFiltroGrupo(e.target.value)}
          style={{ padding: "10px", borderRadius: "8px", border: "1px solid #d1d5db", backgroundColor: "white", color: "#374151", fontSize: "14px", cursor: "pointer", maxWidth: "200px" }}
        >
          {listaGrupos.map(g => <option key={g} value={g}>{g === "Todos" ? "🏷️ Todos los Grupos" : `🏷️ ${g}`}</option>)}
        </select>
      </div>

      <div style={{ paddingBottom: "40px" }}>
        {ganadoFiltrado.length === 0 && (
          <div style={{ textAlign: "center", padding: "40px 16px", color: "var(--gris-400)" }}>
            <div style={{ fontSize: "48px", marginBottom: "12px" }}>🔍</div>
            <p style={{ fontWeight: "600" }}>No se encontraron animales</p>
            <p style={{ fontSize: "13px" }}>Intenta con otro filtro o término de búsqueda.</p>
          </div>
        )}

        {ganadoFiltrado.map((animal) => (
          <div 
            key={animal.id} 
            className="animal-item"
            onClick={() => setAnimalActivo(animal)}
            style={{ opacity: animal.estado?.includes('Baja') ? 0.6 : 1, position: "relative" }}
          >
            <input 
              type="checkbox"
              checked={seleccionados.has(animal.id)}
              onChange={(e) => toggleSeleccion(animal.id, e)}
              onClick={(e) => e.stopPropagation()}
              style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", width: "18px", height: "18px", cursor: "pointer" }}
            />
            <div className={`animal-avatar ${animal.sexo?.toLowerCase() === "macho" ? "macho" : "hembra"}`} style={{ marginLeft: "30px" }}>
              {getAnimalEmoji(animal.tipo, animal.sexo)}
            </div>
            <div className="animal-info">
              <div className="animal-arete">{animal.nombre ? `${animal.nombre} (${animal.arete})` : animal.arete} {animal.areteRancho ? `[Rancho: ${animal.areteRancho}]` : ""}</div>
              <div className="animal-meta">
                {animal.raza} • {animal.tipo} <br/> 
                <span style={{ color: "var(--verde-medio)", fontWeight: "600", fontSize: "11px" }}>📍 {animal.potrero || animal.hectarea || "Sin Lote"} {animal.grupo && ` • 🏷️ ${animal.grupo}`}</span>
              </div>
            </div>
            <span className={`animal-status ${getStatusClass(animal.estado)}`}>
              {animal.estado || "Sano"}
            </span>
          </div>
        ))}
      </div>

      {seleccionados.size > 0 && (
        <div style={{ position: "fixed", bottom: "80px", left: "50%", transform: "translateX(-50%)", backgroundColor: "#1f2937", color: "white", padding: "12px 24px", borderRadius: "30px", display: "flex", alignItems: "center", gap: "20px", boxShadow: "0 10px 25px rgba(0,0,0,0.2)", zIndex: 50, border: "1px solid #374151" }}>
          <span style={{ fontWeight: "bold" }}>{seleccionados.size} seleccionados</span>
          <div style={{ display: "flex", gap: "10px" }}>
            {usuario?.rol !== "tecnico" && (
              <>
                <button onClick={() => { setAccionMasivaActiva("moverPotrero"); setMostrarModalAccionMasiva(true); }} style={{ padding: "6px 12px", backgroundColor: "#3b82f6", color: "white", borderRadius: "20px", border: "none", cursor: "pointer", fontWeight: "600", fontSize: "13px" }}>📍 Mover Potrero</button>
                <button onClick={() => { setAccionMasivaActiva("moverGrupo"); setMostrarModalAccionMasiva(true); }} style={{ padding: "6px 12px", backgroundColor: "#6366f1", color: "white", borderRadius: "20px", border: "none", cursor: "pointer", fontWeight: "600", fontSize: "13px" }}>🏷️ Mover Grupo</button>
                <button onClick={() => { setAccionMasivaActiva("vender"); setMostrarModalAccionMasiva(true); }} style={{ padding: "6px 12px", backgroundColor: "#f59e0b", color: "white", borderRadius: "20px", border: "none", cursor: "pointer", fontWeight: "600", fontSize: "13px" }}>💰 En Venta</button>
              </>
            )}
            <button onClick={() => setSeleccionados(new Set())} style={{ padding: "6px 12px", backgroundColor: "transparent", color: "#9ca3af", borderRadius: "20px", border: "1px solid #4b5563", cursor: "pointer", fontWeight: "600", fontSize: "13px" }}>Cancelar</button>
          </div>
        </div>
      )}

      {mostrarModalAccionMasiva && (
        <div className="modal-overlay" onClick={() => !guardandoMasivoSelect && setMostrarModalAccionMasiva(false)}>
          <div className="modal-content" onClick={e => e.stopPropagation()} style={{ maxWidth: "400px" }}>
            <div className="modal-header">
              <h2>{accionMasivaActiva === "moverPotrero" ? "Mover de Potrero" : accionMasivaActiva === "moverGrupo" ? "Mover de Grupo" : "Marcar para Venta"}</h2>
              <button className="close-btn" onClick={() => !guardandoMasivoSelect && setMostrarModalAccionMasiva(false)}><X size={24} /></button>
            </div>
            <div className="modal-body">
              <p style={{ marginBottom: "20px", color: "#4b5563" }}>
                Aplicarás esta acción a <strong>{seleccionados.size} animal(es)</strong>.
              </p>
              
              {accionMasivaActiva === "moverPotrero" ? (
                  <div style={{ marginBottom: "16px" }}>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: "bold", marginBottom: "4px", color: "#4b5563" }}>NUEVO POTRERO</label>
                    <select value={nuevaUbicacionMasiva.potrero} onChange={e => setNuevaUbicacionMasiva({...nuevaUbicacionMasiva, potrero: e.target.value})} style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #d1d5db" }}>
                      <option value="">Seleccionar potrero...</option>
                      <option value="Sin Asignar">Sin Asignar (Quitar potrero)</option>
                      {listaPotreros.filter(p => p !== "Todos").map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
              ) : accionMasivaActiva === "moverGrupo" ? (
                  <div style={{ marginBottom: "20px" }}>
                    <label style={{ display: "block", fontSize: "12px", fontWeight: "bold", marginBottom: "4px", color: "#4b5563" }}>NUEVO GRUPO</label>
                    <select value={nuevaUbicacionMasiva.grupo} onChange={e => setNuevaUbicacionMasiva({...nuevaUbicacionMasiva, grupo: e.target.value})} style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #d1d5db" }}>
                      <option value="">Seleccionar grupo...</option>
                      <option value="Sin Asignar">Sin Asignar (Quitar grupo)</option>
                      {listaGrupos.filter(g => g !== "Todos").map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
              ) : (
                <div style={{ backgroundColor: "#fffbeb", padding: "12px", borderRadius: "8px", border: "1px solid #fde68a", marginBottom: "20px" }}>
                  <p style={{ color: "#92400e", fontSize: "14px", margin: 0 }}>
                    Los animales seleccionados cambiarán su estado a <strong>"Disponible para Venta"</strong> y aparecerán en la pestaña "En Venta".
                  </p>
                </div>
              )}

              <button 
                onClick={ejecutarAccionMasiva} 
                disabled={guardandoMasivoSelect}
                style={{ width: "100%", padding: "12px", backgroundColor: (accionMasivaActiva === "moverPotrero" || accionMasivaActiva === "moverGrupo") ? "#3b82f6" : "#f59e0b", color: "white", borderRadius: "8px", border: "none", cursor: guardandoMasivoSelect ? "wait" : "pointer", fontWeight: "bold", fontSize: "15px" }}
              >
                {guardandoMasivoSelect ? "Aplicando..." : "Confirmar Cambios"}
              </button>
            </div>
          </div>
        </div>
      )}

      {animalActivo && (
        <div className="modal-overlay" onClick={() => setAnimalActivo(null)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "15px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <h2>{animalActivo.nombre ? `${animalActivo.nombre} (${animalActivo.arete})` : animalActivo.arete} {animalActivo.areteRancho ? ` | Rancho: ${animalActivo.areteRancho}` : ""}</h2>
                <button onClick={() => { setNuevoArete(animalActivo.arete || ""); setNuevoAreteRancho(animalActivo.areteRancho || ""); setMostrarModalArete(true); }} style={{ fontSize: "11px", padding: "4px 8px", backgroundColor: "#f3f4f6", border: "1px solid #d1d5db", borderRadius: "4px", cursor: "pointer", color: "#4b5563" }}>🔄 Cambiar Arete</button>
              </div>
              <button onClick={() => { setAnimalActivo(null); setMostrarModalArete(false); }} style={{ background: "none", border: "none" }}><X size={24} /></button>
            </div>
            
            {mostrarModalArete && (
              <div style={{ backgroundColor: "#fef2f2", padding: "16px", borderRadius: "8px", border: "1px solid #fca5a5", marginBottom: "20px" }}>
                <h4 style={{ margin: "0 0 10px 0", color: "#991b1b" }}>Cambio de Identificación</h4>
                <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                  <input type="text" value={nuevoArete} onChange={e => setNuevoArete(e.target.value)} placeholder="Arete Oficial (SINIIGA)" style={{ flex: 1, minWidth: "150px", padding: "8px", borderRadius: "6px", border: "1px solid #fca5a5" }} />
                  <input type="text" value={nuevoAreteRancho} onChange={e => setNuevoAreteRancho(e.target.value)} placeholder="Arete Rancho" style={{ flex: 1, minWidth: "150px", padding: "8px", borderRadius: "6px", border: "1px solid #fca5a5" }} />
                  <button onClick={guardarCambioArete} style={{ backgroundColor: "#dc2626", color: "white", border: "none", padding: "8px 16px", borderRadius: "6px", cursor: "pointer" }}>Guardar</button>
                  <button onClick={() => setMostrarModalArete(false)} style={{ backgroundColor: "white", color: "#4b5563", border: "1px solid #d1d5db", padding: "8px 16px", borderRadius: "6px", cursor: "pointer" }}>Cancelar</button>
                </div>
              </div>
            )}
            
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "20px" }}>
              <div style={{ backgroundColor: "#f0fdf4", padding: "12px", borderRadius: "8px", border: "1px solid #bbf7d0" }}>
                <div style={{ color: "#166534", fontSize: "11px", fontWeight: "bold", display: "flex", alignItems: "center", gap: "4px" }}>
                  <TrendingUp size={14} /> GANANCIA TOTAL
                </div>
                <span style={{ fontSize: "18px", fontWeight: "bold", color: "#14532d" }}>{stats?.gananciaTotal > 0 ? `+${stats.gananciaTotal} kg` : "--"}</span>
              </div>
              <div style={{ backgroundColor: "#eff6ff", padding: "12px", borderRadius: "8px", border: "1px solid #bfdbfe" }}>
                <div style={{ color: "#1e40af", fontSize: "11px", fontWeight: "bold", display: "flex", alignItems: "center", gap: "4px" }}>
                  <Activity size={14} /> GDP (PROM. DIARIO)
                </div>
                <span style={{ fontSize: "18px", fontWeight: "bold", color: "#1e3a8a" }}>{stats?.gdp > 0 ? `${stats.gdp} kg/d` : "--"}</span>
              </div>
            </div>

            <div style={{ backgroundColor: "#f9fafb", padding: "12px", borderRadius: "8px", border: "1px solid #e5e7eb", marginBottom: "20px", position: "relative" }}>
              {!editandoUbicacion ? (
                <button onClick={() => { setEditandoUbicacion(true); setNuevaUbicacion({potrero: animalActivo.potrero || "", grupo: animalActivo.grupo || ""}); }} style={{position: "absolute", right: "12px", top: "12px", background: "none", border: "none", color: "#3b82f6", cursor: "pointer", fontSize: "12px", fontWeight: "bold"}}>✏️ Mover</button>
              ) : null}

              {editandoUbicacion ? (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px", borderBottom: "1px solid #e5e7eb", paddingBottom: "12px" }}>
                  <div>
                    <div style={{ color: "#6b7280", fontSize: "11px", fontWeight: "bold", marginBottom: "4px" }}>NUEVO POTRERO</div>
                    <select value={nuevaUbicacion.potrero} onChange={e => setNuevaUbicacion({...nuevaUbicacion, potrero: e.target.value})} style={{ width: "100%", padding: "6px", borderRadius: "4px", border: "1px solid #d1d5db", fontSize: "13px" }}>
                      <option value="">Sin Potrero</option>
                      {listaPotreros.filter(p => p !== "Todos").map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                  <div>
                    <div style={{ color: "#6b7280", fontSize: "11px", fontWeight: "bold", marginBottom: "4px" }}>NUEVO GRUPO</div>
                    <select value={nuevaUbicacion.grupo} onChange={e => setNuevaUbicacion({...nuevaUbicacion, grupo: e.target.value})} style={{ width: "100%", padding: "6px", borderRadius: "4px", border: "1px solid #d1d5db", fontSize: "13px" }}>
                      <option value="">Sin Grupo</option>
                      {listaGrupos.filter(g => g !== "Todos").map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
                  <div style={{ gridColumn: "1 / -1", display: "flex", gap: "8px", marginTop: "4px" }}>
                    <button onClick={guardarCambioUbicacion} style={{flex: 1, padding: "6px", backgroundColor: "#3b82f6", color: "white", borderRadius: "4px", border: "none", cursor: "pointer", fontSize: "12px", fontWeight: "bold"}}>Guardar Cambios</button>
                    <button onClick={() => setEditandoUbicacion(false)} style={{padding: "6px 12px", backgroundColor: "#fff", color: "#6b7280", borderRadius: "4px", border: "1px solid #d1d5db", cursor: "pointer", fontSize: "12px"}}>Cancelar</button>
                  </div>
                </div>
              ) : (
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "12px", borderBottom: "1px solid #e5e7eb", paddingBottom: "12px" }}>
                  <div>
                    <div style={{ color: "#6b7280", fontSize: "11px", fontWeight: "bold" }}>POTRERO / LOTE</div>
                    <div style={{ fontSize: "14px", fontWeight: "700", color: "#111827" }}>{animalActivo.potrero || animalActivo.hectarea || "--"}</div>
                  </div>
                  <div>
                    <div style={{ color: "#6b7280", fontSize: "11px", fontWeight: "bold" }}>GRUPO DE MANEJO</div>
                    <div style={{ fontSize: "14px", fontWeight: "700", color: "#111827" }}>{animalActivo.grupo || "--"}</div>
                  </div>
                </div>
              )}
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
                <div>
                  <div style={{ color: "#6b7280", fontSize: "11px", fontWeight: "bold" }}>MADRE</div>
                  <div style={{ fontSize: "14px", fontWeight: "700", color: "#111827" }}>{animalActivo.madre || "--"}</div>
                </div>
                <div>
                  <div style={{ color: "#6b7280", fontSize: "11px", fontWeight: "bold" }}>PADRE</div>
                  <div style={{ fontSize: "14px", fontWeight: "700", color: "#111827" }}>{animalActivo.padre || "--"}</div>
                </div>
              </div>
            </div>

            {(animalActivo.tipo === "Vaca" || animalActivo.tipo === "Semental" || animalActivo.tipo === "Vientre") && (
              <div style={{ marginBottom: "20px" }}>
                <h3 style={{ fontSize: "14px", color: "#374151", marginBottom: "8px", display: "flex", alignItems: "center", gap: "6px" }}>
                  <Baby size={16} color="#ec4899" /> Crías Vinculadas ({inventario.filter(a => a.madre === animalActivo.arete || a.padre === animalActivo.arete).length})
                </h3>
                <div style={{ display: "flex", gap: "8px", overflowX: "auto" }}>
                  {inventario.filter(a => a.madre === animalActivo.arete || a.padre === animalActivo.arete).map(hijo => (
                    <div key={hijo.id} onClick={() => setAnimalActivo(hijo)} style={{ padding: "6px 12px", backgroundColor: "#fdf2f8", border: "1px solid #fbcfe8", borderRadius: "15px", fontSize: "12px", cursor: "pointer", color: "#be185d" }}>
                      {hijo.arete}
                    </div>
                  ))}
                </div>
              </div>
            )}

            <div style={{ backgroundColor: "#f3f4f6", padding: "12px", borderRadius: "8px", marginBottom: "16px", fontSize: "13px", position: "relative" }}>
              {!editandoDatosAnimal && (
                <button onClick={() => { setEditandoDatosAnimal(true); setDatosEdicionAnimal({ raza: animalActivo.raza, peso: animalActivo.peso, fechaNacimiento: animalActivo.fechaNacimiento, madre: animalActivo.madre, padre: animalActivo.padre }); }} style={{ position: "absolute", top: "12px", right: "12px", background: "none", border: "none", color: "#3b82f6", cursor: "pointer", fontSize: "12px", fontWeight: "bold" }}>✏️ Editar Detalles</button>
              )}
              <strong>Ubicación:</strong> <span style={{ color: "var(--verde-medio)", fontWeight: "bold" }}>{animalActivo.potrero || animalActivo.hectarea || "Sin Asignar"}</span> <br/>
              
              {editandoDatosAnimal ? (
                <div style={{ marginTop: "10px", marginBottom: "10px", display: "grid", gap: "8px", gridTemplateColumns: "1fr 1fr" }}>
                  <div><label style={{fontSize: "11px", fontWeight: "bold", display: "block"}}>Raza</label><input type="text" value={datosEdicionAnimal.raza || ""} onChange={e => setDatosEdicionAnimal({...datosEdicionAnimal, raza: e.target.value})} style={{width: "100%", padding: "6px", fontSize:"12px", border: "1px solid #d1d5db", borderRadius: "4px"}}/></div>
                  <div><label style={{fontSize: "11px", fontWeight: "bold", display: "block"}}>Peso Inicial</label><input type="text" value={datosEdicionAnimal.peso || ""} onChange={e => setDatosEdicionAnimal({...datosEdicionAnimal, peso: e.target.value})} style={{width: "100%", padding: "6px", fontSize:"12px", border: "1px solid #d1d5db", borderRadius: "4px"}}/></div>
                  <div><label style={{fontSize: "11px", fontWeight: "bold", display: "block"}}>Nacimiento</label><input type="date" value={datosEdicionAnimal.fechaNacimiento || ""} onChange={e => setDatosEdicionAnimal({...datosEdicionAnimal, fechaNacimiento: e.target.value})} style={{width: "100%", padding: "6px", fontSize:"12px", border: "1px solid #d1d5db", borderRadius: "4px"}}/></div>
                  <div></div>
                  <div><label style={{fontSize: "11px", fontWeight: "bold", display: "block"}}>Madre</label><input type="text" value={datosEdicionAnimal.madre || ""} onChange={e => setDatosEdicionAnimal({...datosEdicionAnimal, madre: e.target.value})} style={{width: "100%", padding: "6px", fontSize:"12px", border: "1px solid #d1d5db", borderRadius: "4px"}}/></div>
                  <div><label style={{fontSize: "11px", fontWeight: "bold", display: "block"}}>Padre</label><input type="text" value={datosEdicionAnimal.padre || ""} onChange={e => setDatosEdicionAnimal({...datosEdicionAnimal, padre: e.target.value})} style={{width: "100%", padding: "6px", fontSize:"12px", border: "1px solid #d1d5db", borderRadius: "4px"}}/></div>
                  <div style={{gridColumn: "1 / -1", display: "flex", gap: "8px", marginTop: "4px"}}>
                    <button onClick={guardarEdicionAnimal} style={{padding: "6px 12px", backgroundColor: "#3b82f6", color: "white", border: "none", borderRadius: "4px", cursor: "pointer"}}>Guardar</button>
                    <button onClick={() => setEditandoDatosAnimal(false)} style={{padding: "6px 12px", backgroundColor: "#e5e7eb", color: "#4b5563", border: "none", borderRadius: "4px", cursor: "pointer"}}>Cancelar</button>
                  </div>
                </div>
              ) : (
                <>
                  <strong>Info:</strong> {animalActivo.raza} | <strong>Peso Inicial:</strong> {animalActivo.peso} <br/>
                  <strong>Nacimiento / Registro:</strong> {animalActivo.fechaNacimiento || animalActivo.fechaRegistro || "--"} {animalActivo.fechaNacimiento ? `(${differenceInMonths(new Date(), new Date(animalActivo.fechaNacimiento + "T00:00:00"))} meses)` : ""} <br/>
                </>
              )}
              <strong>Estado Actual:</strong> 
              {editandoEstado ? (
                <span style={{ display: "inline-flex", gap: "6px", alignItems: "center", marginLeft: "6px" }}>
                  <select value={nuevoEstadoManual} onChange={e => setNuevoEstadoManual(e.target.value)} style={{ padding: "2px 4px", fontSize: "12px", borderRadius: "4px", border: "1px solid #d1d5db" }}>
                    <option value="Sano">Sano</option>
                    <option value="Enfermo">Enfermo</option>
                    <option value="Gestante">Gestante</option>
                    <option value="Alerta: Revisión de Fertilidad">Alerta: Revisión de Fertilidad</option>
                    <option value="Disponible para Venta">Disponible para Venta</option>
                    <option value="Vacía">Vacía</option>
                  </select>
                  <button onClick={guardarCambioEstado} style={{ padding: "2px 6px", fontSize: "11px", backgroundColor: "#3b82f6", color: "white", border: "none", borderRadius: "4px", cursor: "pointer" }}>Guardar</button>
                  <button onClick={() => setEditandoEstado(false)} style={{ padding: "2px 6px", fontSize: "11px", backgroundColor: "#f3f4f6", color: "#4b5563", border: "1px solid #d1d5db", borderRadius: "4px", cursor: "pointer" }}>Cancelar</button>
                </span>
              ) : (
                <span style={{ color: animalActivo.estado?.includes("Alerta") ? "red" : (animalActivo.estado === "Disponible para Venta" ? "orange" : "green") }}>
                  {animalActivo.estado || "Sano"}
                  <button onClick={() => { setEditandoEstado(true); setNuevoEstadoManual(animalActivo.estado || "Sano"); }} style={{ background: "none", border: "none", color: "#3b82f6", cursor: "pointer", marginLeft: "6px", fontSize: "12px", padding: 0 }} title="Editar Estado Manualmente">✏️</button>
                </span>
              )}
            </div>

            {(!animalActivo.estado?.includes('Baja') && usuario?.rol !== "tecnico") && (
              <div style={{ display: "flex", gap: "10px", marginBottom: "20px" }}>
                <button className="btn-primary" style={{ flex: 1, margin: 0 }} onClick={() => { 
                  if (mostrandoFormulario && tipoFormularioIndiv === "evento") { setMostrandoFormulario(false); } 
                  else { setTipoFormularioIndiv("evento"); setDatosEvento(d => ({...d, tipo: EVENTOS_GANADO[0], resultado: ""})); setMostrandoFormulario(true); setMostrandoBaja(false); }
                }}>+ Evento</button>
                <button className="btn-primary" style={{ flex: 1, margin: 0, backgroundColor: "#16a34a", borderColor: "#16a34a" }} onClick={() => { 
                  if (mostrandoFormulario && tipoFormularioIndiv === "tratamiento") { setMostrandoFormulario(false); }
                  else { setTipoFormularioIndiv("tratamiento"); setDatosEvento(d => ({...d, tipo: TRATAMIENTOS_GANADO[0], resultado: ""})); setMostrandoFormulario(true); setMostrandoBaja(false); }
                }}>💊 Tratamiento</button>
                {animalActivo.tipo === "Torete" && (
                  <button className="btn-outline" style={{ flex: 1, margin: 0, borderColor: "#3b82f6", color: "#3b82f6" }} onClick={hacerSemental}>🔥 Hacer Semental</button>
                )}
                <button className="btn-outline" style={{ flex: 1, margin: 0, borderColor: "#f59e0b", color: "#f59e0b" }} onClick={() => updateDoc(doc(db, "animales", animalActivo.id), { estado: "Disponible para Venta" }).then(()=>setAnimalActivo({...animalActivo, estado: "Disponible para Venta"}))}>💰 Vender</button>
                {(["Vaca", "Semental", "Novillona"].includes(animalActivo.tipo)) && animalActivo.estado !== "Desecho" && (
                  <button className="btn-outline" style={{ flex: 1, margin: 0, borderColor: "#6b7280", color: "#6b7280" }} onClick={marcarDesecho}>🗑️ Descartar</button>
                )}
                <button className="btn-outline" style={{ color: "#ef4444", borderColor: "#ef4444" }} onClick={() => { setMostrandoBaja(!mostrandoBaja); setMostrandoFormulario(false); }}><AlertTriangle size={18} /></button>
              </div>
            )}

            {mostrandoBaja && (
              <form onSubmit={guardarBaja} style={{ padding: "15px", background: "#fef2f2", border: "1px solid #fca5a5", borderRadius: "8px", marginBottom: "15px" }}>
                <h4 style={{ margin: "0 0 10px 0", color: "#b91c1c", fontSize: "14px", display: "flex", alignItems: "center", gap: "6px" }}>
                  <AlertTriangle size={16} /> Dar de Baja
                </h4>
                <select value={datosBaja.motivo} onChange={(e) => setDatosBaja({...datosBaja, motivo: e.target.value})} style={{ width: "100%", marginBottom: "10px", padding: "8px", border: "1px solid #f87171", borderRadius: "4px", backgroundColor: "#fff" }} required>
                  <option value="Venta">Venta a mercado</option>
                  <option value="Venta (Desecho)">Venta (Desecho / Rastro)</option>
                  <option value="Muerte">Muerte</option>
                  <option value="Robo o Extravío">Robo o Extravío</option>
                </select>

                <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
                  <input type="date" value={datosBaja.fecha} onChange={(e) => setDatosBaja({...datosBaja, fecha: e.target.value})} style={{ flex: 1, padding: "8px", border: "1px solid #d1d5db", borderRadius: "4px" }} required />
                </div>

                <textarea placeholder="Notas adicionales..." value={datosBaja.notas} onChange={(e) => setDatosBaja({...datosBaja, notas: e.target.value})} style={{ width: "100%", padding: "8px", border: "1px solid #d1d5db", borderRadius: "4px", marginBottom: "10px", boxSizing: "border-box" }} rows="2" />

                <div style={{ display: "flex", gap: "8px" }}>
                  <button type="submit" style={{ flex: 1, backgroundColor: "#ef4444", color: "white", padding: "8px", borderRadius: "6px", border: "none", fontWeight: "bold", cursor: "pointer" }}>Confirmar Baja</button>
                  <button type="button" onClick={() => setMostrandoBaja(false)} style={{ flex: 1, backgroundColor: "#fff", color: "#6b7280", padding: "8px", borderRadius: "6px", border: "1px solid #d1d5db", fontWeight: "bold", cursor: "pointer" }}>Cancelar</button>
                </div>
              </form>
            )}

            {mostrandoFormulario && (
              <form onSubmit={guardarEvento} style={{ padding: "15px", background: "#f9fafb", borderRadius: "8px", marginBottom: "15px" }}>
                <select value={datosEvento.tipo} onChange={(e) => setDatosEvento({...datosEvento, tipo: e.target.value, resultado: ""})} style={{ width: "100%", marginBottom: "10px", padding: "8px", border: "1px solid #d1d5db", borderRadius: "4px" }}>
                  {(tipoFormularioIndiv === "evento" ? EVENTOS_GANADO : TRATAMIENTOS_GANADO).map(t => <option key={t} value={t}>{t}</option>)}
                </select>

                {CATALOGO_EVENTOS[datosEvento.tipo]?.length > 0 && (
                  <select value={datosEvento.resultado} onChange={(e) => setDatosEvento({...datosEvento, resultado: e.target.value})} style={{ width: "100%", marginBottom: "10px", padding: "8px", border: "1px solid #3b82f6", borderRadius: "4px", backgroundColor: "#eff6ff" }} required>
                    <option value="">-- Selecciona el insumo / tipo --</option>
                    {CATALOGO_EVENTOS[datosEvento.tipo].map(sub => <option key={sub} value={sub}>{sub}</option>)}
                  </select>
                )}

                {(!CATALOGO_EVENTOS[datosEvento.tipo] || CATALOGO_EVENTOS[datosEvento.tipo].length === 0) && (
                  <input type="text" placeholder="Resultado..." value={datosEvento.resultado} onChange={(e) => setDatosEvento({...datosEvento, resultado: e.target.value})} style={{ width: "100%", marginBottom: "10px", padding: "8px", border: "1px solid #d1d5db", borderRadius: "4px", boxSizing: "border-box" }} required />
                )}

                {datosEvento.tipo === "Palpación" && (
                  <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
                    <div style={{ flex: 1 }}>
                      <label style={{ fontSize: "12px", fontWeight: "bold", color: "#4b5563", marginBottom: "4px", display: "block" }}>Condición Corporal (C.C.)</label>
                      <select value={datosEvento.condicionCorporal} onChange={(e) => setDatosEvento({...datosEvento, condicionCorporal: e.target.value})} style={{ width: "100%", padding: "8px", border: "1px solid #d1d5db", borderRadius: "4px" }} required>
                        <option value="">Selecciona C.C...</option>
                        {Array.from({ length: 50 }, (_, i) => i + 1).map(num => (
                          <option key={num} value={num}>{num}</option>
                        ))}
                      </select>
                    </div>
                    <div style={{ flex: 2 }}>
                      <label style={{ fontSize: "12px", fontWeight: "bold", color: "#4b5563", marginBottom: "4px", display: "block" }}>Observaciones</label>
                      <input type="text" placeholder="Ej: Aplicar CATOSAL" value={datosEvento.observaciones} onChange={(e) => setDatosEvento({...datosEvento, observaciones: e.target.value})} style={{ width: "100%", padding: "8px", border: "1px solid #d1d5db", borderRadius: "4px", boxSizing: "border-box" }} />
                    </div>
                  </div>
                )}

                <div style={{ display: "flex", gap: "10px", marginBottom: "10px" }}>
                    <input type="date" value={datosEvento.fecha} onChange={(e) => setDatosEvento({...datosEvento, fecha: e.target.value})} style={{ flex: 1, padding: "8px", border: "1px solid #d1d5db", borderRadius: "4px" }} required />
                    {datosEvento.tipo !== "Parto" && (
                      <input type="number" placeholder="Costo ($)" value={datosEvento.costo} onChange={(e) => setDatosEvento({...datosEvento, costo: e.target.value})} style={{ flex: 1, padding: "8px", border: "1px solid #d1d5db", borderRadius: "4px" }} />
                    )}
                  </div>
                
                <button type="submit" className="btn-primary" style={{ width: "100%" }}>Guardar Evento</button>
              </form>
            )}

            <h3>Historial de Eventos</h3>
            <div style={{ maxHeight: "150px", overflowY: "auto" }}>
              {historialEventos.map(ev => (
                <div key={ev.id} style={{ padding: "8px", borderBottom: "1px solid #eee", fontSize: "13px", display: "flex", justifyContent: "space-between" }}>
                  <span>
                    <strong>{ev.tipo}:</strong> {ev.resultado} {ev.tipo === "Repeso" ? "kg" : ""}
                  </span>
                  <span style={{ color: "#9ca3af" }}>{ev.fecha}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {mostrarModalMasivo && (
        <div className="modal-overlay" onClick={() => setMostrarModalMasivo(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "500px" }}>
            <div className="modal-header">
              <h2>💊 Cargar Tratamiento</h2>
              <button onClick={() => setMostrarModalMasivo(false)} style={{ background: "none", border: "none" }}><X size={24} /></button>
            </div>
            
            <form onSubmit={guardarEventoMasivo}>
              <div style={{ backgroundColor: "#f9fafb", padding: "12px", borderRadius: "8px", marginBottom: "15px", border: "1px solid #e5e7eb" }}>
                <h4 style={{ margin: "0 0 10px 0", fontSize: "14px", color: "#374151" }}>Filtros de Aplicación</h4>
                <select 
                  value={filtroGrupoMasivo} 
                  onChange={(e) => setFiltroGrupoMasivo(e.target.value)}
                  style={{ width: "100%", padding: "8px", borderRadius: "6px", border: "1px solid #d1d5db" }}
                >
                  <option value="Todos">Todos los Animales Activos</option>
                  {listaGrupos.filter(g => g !== "Todos").map(g => <option key={g} value={g}>{g}</option>)}
                </select>
                <div style={{ fontSize: "12px", color: "#166534", backgroundColor: "#dcfce7", padding: "8px", borderRadius: "6px", marginTop: "10px" }}>
                  <strong>Animales afectados:</strong> {obtenerAnimalesAfectadosMasivo(datosMasivos.tipo, filtroGrupoMasivo).length} cabezas.
                </div>
              </div>

              <select value={datosMasivos.tipo} onChange={(e) => setDatosMasivos({...datosMasivos, tipo: e.target.value, resultado: ""})} style={{ width: "100%", marginBottom: "10px", padding: "8px", border: "1px solid #16a34a", borderRadius: "4px", backgroundColor: "#f0fdf4" }} required>
                {TRATAMIENTOS_GANADO.map(t => <option key={t} value={t}>{t}</option>)}
              </select>

              {CATALOGO_EVENTOS[datosMasivos.tipo]?.length > 0 && (
                <select value={datosMasivos.resultado} onChange={(e) => setDatosMasivos({...datosMasivos, resultado: e.target.value})} style={{ width: "100%", marginBottom: "10px", padding: "8px", border: "1px solid #d1d5db", borderRadius: "4px" }} required>
                  <option value="">Selecciona una opción...</option>
                  {CATALOGO_EVENTOS[datosMasivos.tipo].map(op => <option key={op} value={op}>{op}</option>)}
                </select>
              )}

              <input type="date" value={datosMasivos.fecha} onChange={(e) => setDatosMasivos({...datosMasivos, fecha: e.target.value})} style={{ width: "100%", marginBottom: "15px", padding: "8px", border: "1px solid #d1d5db", borderRadius: "4px" }} required />

              {exitoMasivo && <div style={{ color: "#166534", backgroundColor: "#dcfce7", padding: "10px", borderRadius: "6px", marginBottom: "10px", textAlign: "center" }}>{exitoMasivo}</div>}

              <button type="submit" className="btn-primary" style={{ width: "100%", backgroundColor: "#16a34a", borderColor: "#16a34a" }} disabled={guardandoMasivo}>
                {guardandoMasivo ? "Guardando..." : "Aplicar a Todos"}
              </button>
            </form>
          </div>
        </div>
      )}

      {mostrarModalPalpacion && (
        <div className="modal-overlay" onClick={() => setMostrarModalPalpacion(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{ maxWidth: "800px", width: "95%" }}>
            <div className="modal-header">
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "24px" }}>🔍</span>
                <div>
                  <h2 style={{ margin: 0 }}>Cargar Palpación Masiva</h2>
                  <p style={{ margin: 0, fontSize: "12px", color: "#6b7280" }}>Registra rápidamente el estado reproductivo de tus vientres.</p>
                </div>
              </div>
              <button onClick={() => setMostrarModalPalpacion(false)} style={{ background: "none", border: "none" }}><X size={24} /></button>
            </div>

            <div style={{ maxHeight: "60vh", overflowY: "auto", marginBottom: "20px", border: "1px solid #e5e7eb", borderRadius: "8px" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "14px" }}>
                <thead style={{ position: "sticky", top: 0, backgroundColor: "#f9fafb", borderBottom: "2px solid #e5e7eb", zIndex: 10 }}>
                  <tr>
                    <th style={{ padding: "12px", textAlign: "left" }}>Arete</th>
                    <th style={{ padding: "12px", textAlign: "left" }}>Estado Actual</th>
                    <th style={{ padding: "12px", textAlign: "left" }}>C.C.</th>
                    <th style={{ padding: "12px", textAlign: "left" }}>Resultado</th>
                    <th style={{ padding: "12px", textAlign: "left" }}>Detalle / Observaciones</th>
                  </tr>
                </thead>
                <tbody>
                  {vientresPalpacion.map((v) => (
                    <tr key={v.id} style={{ borderBottom: "1px solid #f3f4f6" }}>
                      <td style={{ padding: "12px", fontWeight: "bold" }}>
                        <div style={{ display: "flex", flexDirection: "column" }}>
                          <span>{v.arete}</span>
                          <small style={{ color: "#9ca3af", fontWeight: "normal" }}>{v.tipo}</small>
                        </div>
                      </td>
                      <td style={{ padding: "12px" }}>
                        <span className={`status-badge ${v.estadoActual === "Gestante" ? "status-gestante" : "status-sano"}`} style={{ fontSize: "11px", padding: "2px 8px" }}>
                          {v.estadoActual}
                        </span>
                      </td>
                      <td style={{ padding: "12px" }}>
                        <select 
                          value={v.condicionCorporal} 
                          onChange={(e) => actualizarRenglonPalpacion(v.id, "condicionCorporal", e.target.value)}
                          style={{ width: "70px", padding: "6px", borderRadius: "6px", border: "1px solid #d1d5db" }}
                          required
                        >
                          <option value="">--</option>
                          {Array.from({ length: 50 }, (_, i) => i + 1).map(num => (
                            <option key={num} value={num}>{num}</option>
                          ))}
                        </select>
                      </td>
                      <td style={{ padding: "12px" }}>
                        <select 
                          value={v.resultado} 
                          onChange={(e) => actualizarRenglonPalpacion(v.id, "resultado", e.target.value)}
                          style={{ width: "100%", padding: "6px", borderRadius: "6px", border: "1px solid #d1d5db" }}
                        >
                          <option value="Gestante">Gestante</option>
                          <option value="Vacía - Fresca">Vacía - Fresca</option>
                          <option value="Vacía - Ciclando">Vacía - Ciclando</option>
                          <option value="Vacía - Anestro">Vacía - Anestro</option>
                          <option value="Dudosa">Dudosa</option>
                          <option value="No Pasó">No Pasó</option>
                        </select>
                      </td>
                      <td style={{ padding: "12px" }}>
                        <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                          {v.resultado === "Gestante" ? (
                            <select 
                              value={v.detalle} 
                              onChange={(e) => actualizarRenglonPalpacion(v.id, "detalle", e.target.value)}
                              style={{ width: "100%", padding: "6px", borderRadius: "6px", border: "1px solid #d1d5db", backgroundColor: "#f0fdf4" }}
                            >
                              {[1,2,3,4,5,6,7,8,9].map(m => <option key={m} value={m}>{m} meses</option>)}
                            </select>
                          ) : (
                            <span style={{ color: "#9ca3af", fontSize: "12px" }}>N/A (Vacía)</span>
                          )}
                          <input 
                            type="text" 
                            placeholder="Obs. (ej: CATOSAL)" 
                            value={v.observaciones}
                            onChange={(e) => actualizarRenglonPalpacion(v.id, "observaciones", e.target.value)}
                            style={{ padding: "6px", borderRadius: "6px", border: "1px solid #d1d5db", fontSize: "12px" }}
                          />
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {exitoMasivo && <div style={{ color: "#166534", backgroundColor: "#dcfce7", padding: "10px", borderRadius: "6px", marginBottom: "15px", textAlign: "center", fontWeight: "bold" }}>{exitoMasivo}</div>}

            <div style={{ display: "flex", gap: "12px" }}>
              <button onClick={() => setMostrarModalPalpacion(false)} className="btn-secondary" style={{ flex: 1 }}>Cancelar</button>
              <button 
                onClick={guardarPalpacionMasiva} 
                className="btn-primary" 
                style={{ flex: 2, backgroundColor: "#7c3aed", borderColor: "#7c3aed" }}
                disabled={guardandoPalpacion}
              >
                {guardandoPalpacion ? "Guardando..." : `Guardar ${vientresPalpacion.length} Palpaciones`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
