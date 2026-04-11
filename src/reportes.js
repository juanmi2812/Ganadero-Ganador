import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { saveAs } from "file-saver";
import { differenceInMonths, format } from "date-fns";
import { es } from "date-fns/locale";

// ================================================
// REPORTE 1: INVENTARIO DE VIENTRES
// ================================================

function prepararDatosVientres(animales, eventos, config) {
  // Filtramos solo vientres activos (Vacas + Novillonas que no estén de baja)
  const vientres = animales.filter(
    (a) =>
      ["Vaca", "Novillona"].includes(a.tipo) &&
      !a.estado?.includes("Baja")
  );

  const hoy = new Date();

  return vientres.map((animal) => {
    // Edad
    const fechaNac = animal.fechaNacimiento
      ? new Date(animal.fechaNacimiento + "T00:00:00")
      : null;
    const edadMeses = fechaNac && !isNaN(fechaNac.getTime())
      ? differenceInMonths(hoy, fechaNac)
      : "--";

    // Eventos de este animal
    const eventosAnimal = eventos.filter((e) => e.animalId === animal.id);

    // Partos
    const partos = eventosAnimal.filter((e) => e.tipo === "Parto");
    const numPartos = partos.length;
    const ultimoParto = partos.length > 0
      ? partos.sort((a, b) => new Date(b.fecha) - new Date(a.fecha))[0].fecha
      : "--";

    // Último evento médico
    const eventosMedicos = eventosAnimal.filter((e) =>
      ["Desparasitante", "Garrapaticida", "Vacuna", "Mosquicida", "Antibióticos", "Vitamina", "Vacunación", "Tratamiento"].includes(e.tipo)
    );
    const ultimoMedico = eventosMedicos.length > 0
      ? eventosMedicos.sort((a, b) => new Date(b.fecha) - new Date(a.fecha))[0]
      : null;

    // Costos
    let costoMantenimiento = 0;
    let costoMedico = 0;
    if (config) {
      const fechaInicial = fechaNac || new Date(animal.fechaRegistro || hoy);
      const dias = Math.ceil(Math.abs(hoy - fechaInicial) / (1000 * 60 * 60 * 24)) || 1;
      const tarifa = config.costoDiario?.[animal.tipo] || 30;
      costoMantenimiento = dias * tarifa;
      costoMedico = eventosAnimal.reduce((sum, e) => sum + (Number(e.costo) || 0), 0);
    }

    return {
      arete: animal.arete || "--",
      raza: animal.raza || "--",
      tipo: animal.tipo,
      edadMeses: edadMeses !== "--" ? `${edadMeses} m` : "--",
      pesoActual: animal.pesoActual ? `${animal.pesoActual} kg` : (animal.peso ? `${animal.peso} kg` : "--"),
      estado: animal.estado || "Sana",
      numPartos,
      ultimoParto,
      ultimoEvento: ultimoMedico ? `${ultimoMedico.tipo}: ${ultimoMedico.resultado || ""} (${ultimoMedico.fecha})` : "--",
      costoMantenimiento: Math.round(costoMantenimiento),
      costoMedico: Math.round(costoMedico),
      costoTotal: Math.round(costoMantenimiento + costoMedico),
      madre: animal.madre || "--",
      padre: animal.padre || "--",
    };
  });
}

// ======================== PDF ========================
export function generarPDFVientres(animales, eventos, config) {
  try {
    const datos = prepararDatosVientres(animales, eventos, config);
    const doc = new jsPDF({ orientation: "landscape" });
    const fechaHoy = format(new Date(), "dd 'de' MMMM yyyy", { locale: es });

    // Header del reporte
    doc.setFillColor(27, 94, 32);
    doc.rect(0, 0, doc.internal.pageSize.width, 28, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("REPORTE DE VIENTRES", 14, 14);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Inventario actual al ${fechaHoy}`, 14, 22);
    doc.text(`Total: ${datos.length} vientres activos`, doc.internal.pageSize.width - 14, 14, { align: "right" });

    // Resumen rápido
    const vacas = datos.filter((d) => d.tipo === "Vaca").length;
    const novillonas = datos.filter((d) => d.tipo === "Novillona").length;
    const alertas = datos.filter((d) => d.estado.includes("Alerta")).length;
    const costoGlobal = datos.reduce((s, d) => s + (d.costoTotal || 0), 0);

    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9);
    doc.setFont("helvetica", "bold");
    doc.text(`Vacas: ${vacas}  |  Novillonas: ${novillonas}  |  Alertas Fertilidad: ${alertas}  |  Inversión Acumulada: $${(costoGlobal || 0).toLocaleString()}`, 14, 36);

    // Tabla principal usando autoTable directamente como función para mayor robustez
    autoTable(doc, {
      startY: 42,
      theme: "grid",
      headStyles: {
        fillColor: [46, 125, 50],
        textColor: 255,
        fontSize: 8,
        fontStyle: "bold",
        halign: "center",
      },
      bodyStyles: { fontSize: 7.5, cellPadding: 3 },
      alternateRowStyles: { fillColor: [232, 245, 233] },
      columnStyles: {
        0: { fontStyle: "bold", halign: "center" },
        6: { halign: "center" },
        7: { halign: "center" },
        9: { halign: "right" },
        10: { halign: "right" },
      },
      head: [
        [
          "Arete",
          "Raza",
          "Categoría",
          "Edad",
          "Peso",
          "Estado",
          "# Partos",
          "Último Parto",
          "Último Evento Médico",
          "Costo Mant.",
          "Inversión Total",
        ],
      ],
      body: datos.map((d) => [
        String(d.arete || ""),
        String(d.raza || ""),
        String(d.tipo || ""),
        String(d.edadMeses || ""),
        String(d.pesoActual || ""),
        String(d.estado || ""),
        String(d.numPartos || "0"),
        String(d.ultimoParto || ""),
        String(d.ultimoEvento || ""),
        `$${(d.costoMantenimiento || 0).toLocaleString()}`,
        `$${(d.costoTotal || 0).toLocaleString()}`,
      ]),
      didDrawPage: (data) => {
        // Footer en cada página
        const pageCount = doc.internal.getNumberOfPages();
        doc.setFontSize(7);
        doc.setTextColor(150);
        doc.text(
          `Ganadero Ganador — Página ${data.pageNumber} de ${pageCount}`,
          doc.internal.pageSize.width / 2,
          doc.internal.pageSize.height - 8,
          { align: "center" }
        );
      },
    });

    doc.save(`Reporte_Vientres_${format(new Date(), "yyyy-MM-dd")}.pdf`);
  } catch (error) {
    console.error("Error al generar PDF:", error);
    alert("Hubo un error al generar el PDF. Revisa la consola.");
  }
}

// ======================== EXCEL ========================
export function generarExcelVientres(animales, eventos, config) {
  try {
    const datos = prepararDatosVientres(animales, eventos, config);
    const fechaHoy = format(new Date(), "dd-MM-yyyy");

    const datosExcel = datos.map((d) => ({
      "Arete": d.arete,
      "Raza": d.raza,
      "Categoría": d.tipo,
      "Edad": d.edadMeses,
      "Peso Actual": d.pesoActual,
      "Estado": d.estado,
      "# Partos": d.numPartos,
      "Último Parto": d.ultimoParto,
      "Último Evento Médico": d.ultimoEvento,
      "Madre": d.madre,
      "Padre": d.padre,
      "Costo Mantenimiento ($)": d.costoMantenimiento,
      "Costo Médico ($)": d.costoMedico,
      "Inversión Total ($)": d.costoTotal,
    }));

    const ws = XLSX.utils.json_to_sheet(datosExcel);
    
    // Anchos de columna
    ws["!cols"] = [
      { wch: 14 }, { wch: 12 }, { wch: 12 }, { wch: 8 }, { wch: 12 },
      { wch: 25 }, { wch: 10 }, { wch: 14 }, { wch: 35 },
      { wch: 14 }, { wch: 14 }, { wch: 18 }, { wch: 15 }, { wch: 16 },
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Vientres");
    
    const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    saveAs(blob, `Reporte_Vientres_${fechaHoy}.xlsx`);
  } catch (error) {
    console.error("Error al generar Excel:", error);
    alert("Hubo un error al generar el Excel. Revisa la consola.");
  }
}

// ================================================
// REPORTE 2: REPRODUCCIÓN (Últimos 12 Meses)
// ================================================

function prepararDatosReproduccion(eventos) {
  const palpaciones = eventos.filter((e) => e.tipo === "Palpación");
  const hoy = new Date();

  // Crear mapa de los últimos 12 meses (incluyendo el actual)
  const mesesRelativos = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
    const key = format(d, "yyyy-MM");
    mesesRelativos.push({
      key,
      label: format(d, "MMM-yy", { locale: es }).toUpperCase(),
      palpadas: 0,
      gestantes: 0,
      frescas: 0,
      ciclando: 0,
      anestro: 0,
      otras: 0,
    });
  }

  palpaciones.forEach((e) => {
    const fechaE = new Date(e.fecha + "T00:00:00");
    if (isNaN(fechaE.getTime())) return;

    const key = format(fechaE, "yyyy-MM");
    const mesData = mesesRelativos.find((m) => m.key === key);

    if (mesData) {
      mesData.palpadas++;
      const res = (e.resultado || "").toLowerCase();
      if (res.includes("gestante")) mesData.gestantes++;
      else if (res.includes("fresca")) mesData.frescas++;
      else if (res.includes("ciclando")) mesData.ciclando++;
      else if (res.includes("anestro")) mesData.anestro++;
      else mesData.otras++;
    }
  });

  return mesesRelativos.map((m) => ({
    ...m,
    porcentaje:
      m.palpadas > 0
        ? `${Math.round((m.gestantes / m.palpadas) * 100)}%`
        : "0%",
  }));
}

export function generarPDFReproduccion(eventos) {
  try {
    const datos = prepararDatosReproduccion(eventos);
    const doc = new jsPDF();
    const fechaHoy = format(new Date(), "dd 'de' MMMM yyyy", { locale: es });

    doc.setFillColor(27, 94, 32);
    doc.rect(0, 0, doc.internal.pageSize.width, 28, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("REPORTE DE REPRODUCCIÓN", 14, 14);
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Análisis de palpaciones — Últimos 12 meses (${fechaHoy})`, 14, 22);

    autoTable(doc, {
      startY: 35,
      theme: "grid",
      headStyles: { fillColor: [46, 125, 50], textColor: 255, halign: "center" },
      bodyStyles: { halign: "center" },
      columnStyles: {
        0: { fontStyle: "bold" },
        7: { fontStyle: "bold", textColor: [27, 94, 32] },
      },
      head: [
        [
          "FECHA",
          "PALPADAS",
          "GESTANTES",
          "FRESCAS",
          "CICLANDO",
          "ANESTRO",
          "OTRAS",
          "% PREÑEZ",
        ],
      ],
      body: datos.map((d) => [
        d.label,
        d.palpadas,
        d.gestantes,
        d.frescas,
        d.ciclando,
        d.anestro,
        d.otras,
        d.porcentaje,
      ]),
    });

    doc.save(`Reporte_Reproduccion_${format(new Date(), "yyyy-MM-dd")}.pdf`);
  } catch (error) {
    console.error(error);
    alert("Error al generar PDF de Reproducción");
  }
}

export function generarExcelReproduccion(eventos) {
  try {
    const datos = prepararDatosReproduccion(eventos);
    const fechaHoy = format(new Date(), "yyyy-MM-dd");

    const datosExcel = datos.map((d) => ({
      FECHA: d.label,
      PALPADAS: d.palpadas,
      GESTANTES: d.gestantes,
      FRESCAS: d.frescas,
      CICLANDO: d.ciclando,
      ANESTRO: d.anestro,
      OTRAS: d.otras,
      "% PREÑEZ": d.porcentaje,
    }));

    const ws = XLSX.utils.json_to_sheet(datosExcel);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Reproduccion");

    const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    saveAs(blob, `Reporte_Reproduccion_${fechaHoy}.xlsx`);
  } catch (error) {
    console.error(error);
    alert("Error al generar Excel de Reproducción");
  }
}

// ================================================
// REPORTE 3: PROYECCIÓN DE PARTOS E INDICADORES
// ================================================

function prepararDatosProyeccionPartos(animales, eventos) {
  const hoy = new Date();
  const unAnioAtras = new Date(hoy.getFullYear() - 1, hoy.getMonth(), hoy.getDate());

  // --- 1. INDICADORES HISTÓRICOS ---
  const vacas = animales.filter(a => ["Vaca", "Novillona"].includes(a.tipo));
  const partosRecientes = eventos.filter(e => e.tipo === "Parto" && new Date(e.fecha) >= unAnioAtras).length;
  
  // % Pariciones: (Partos en 12m / Total Vacas) * 100
  const tasaParicion = vacas.length > 0 ? Math.round((partosRecientes / vacas.length) * 100) : 0;

  // IEP y Días Abiertos
  let totalIEP = 0;
  let conteoIEP = 0;

  vacas.forEach(v => {
    const misPartos = eventos
      .filter(e => e.tipo === "Parto" && e.animalId === v.id)
      .sort((a, b) => new Date(a.fecha) - new Date(b.fecha));

    if (misPartos.length >= 2) {
      for (let i = 1; i < misPartos.length; i++) {
        const d1 = new Date(misPartos[i-1].fecha);
        const d2 = new Date(misPartos[i].fecha);
        const diff = Math.ceil(Math.abs(d2 - d1) / (1000 * 60 * 60 * 24));
        if (diff > 250 && diff < 800) { // Filtro de coherencia biológica
          totalIEP += diff;
          conteoIEP++;
        }
      }
    }
  });

  const avgIEP = conteoIEP > 0 ? Math.round(totalIEP / conteoIEP) : 0;
  const avgDiasAbiertos = avgIEP > 0 ? avgIEP - 285 : 0;

  // --- 2. PROYECCIÓN DE PARTOS (Próximos 9 meses) ---
  const proyeccion = [];
  for (let i = 0; i < 9; i++) {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() + i, 1);
    proyeccion.push({
      key: format(d, "yyyy-MM"),
      label: format(d, "MMMM yyyy", { locale: es }),
      conteo: 0,
      detalles: []
    });
  }

  animales.forEach(a => {
    if (!["Vaca", "Novillona"].includes(a.tipo)) return;

    const misEventos = eventos.filter(e => e.animalId === a.id);
    let fechaPartoEstimada = null;

    // A. Buscar la palpación MÁS RECIENTE
    const misEventosDesc = [...misEventos].sort((a, b) => new Date(b.fecha) - new Date(a.fecha));
    
    const palp = misEventosDesc.find(e => e.tipo === "Palpación" && e.resultado?.toLowerCase().includes("gestante"));
    if (palp) {
      const match = palp.resultado.match(/(\d+)/);
      const mesesGes = match ? parseInt(match[0]) : 3;
      const mesesFaltantes = 9 - mesesGes;
      const fechaBase = new Date(palp.fecha + "T00:00:00");
      fechaPartoEstimada = new Date(fechaBase.getFullYear(), fechaBase.getMonth() + mesesFaltantes, fechaBase.getDate());
    } 
    // B. Buscar Inseminación reciente (si no hay palpación activa)
    else {
      const insem = misEventosDesc.find(e => e.tipo === "Inseminación");
      if (insem) {
        const fechaBase = new Date(insem.fecha + "T00:00:00");
        fechaPartoEstimada = new Date(fechaBase.getTime() + (285 * 24 * 60 * 60 * 1000));
      }
    }

    if (fechaPartoEstimada && fechaPartoEstimada > hoy) {
      const key = format(fechaPartoEstimada, "yyyy-MM");
      const mesProy = proyeccion.find(m => m.key === key);
      if (mesProy) {
        mesProy.conteo++;
        mesProy.detalles.push(a.arete);
      }
    }
  });

  return {
    stats: { avgIEP, avgDiasAbiertos, tasaParicion, partosAnuales: partosRecientes, totalVacas: vacas.length },
    proyeccion
  };
}

export function generarPDFProyeccionPartos(animales, eventos) {
  try {
    const { stats, proyeccion } = prepararDatosProyeccionPartos(animales, eventos);
    const doc = new jsPDF();
    const fechaHoy = format(new Date(), "dd 'de' MMMM yyyy", { locale: es });

    doc.setFillColor(27, 94, 32);
    doc.rect(0, 0, doc.internal.pageSize.width, 28, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("PROYECCIÓN DE PARTOS", 14, 14);
    doc.setFontSize(10);
    doc.text(`Análisis de eficiencia reproductiva y nacimientos esperados`, 14, 22);

    // Indicadores clave
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(12);
    doc.text("Indicadores de Eficiencia (Herd Health)", 14, 40);
    
    autoTable(doc, {
      startY: 45,
      theme: "plain",
      headStyles: { fillColor: [240, 240, 240], textColor: 50, fontStyle: "bold" },
      head: [["Métrica", "Valor Actual", "Meta Recomendada"]],
      body: [
        ["Intervalo Entre Partos (IEP)", `${stats.avgIEP} días`, "365 - 410 días"],
        ["Días Abiertos (Promedio)", `${stats.avgDiasAbiertos} días`, "80 - 110 días"],
        ["Tasa de Parición (Últimos 12m)", `${stats.tasaParicion}%`, "80% - 90%"],
        ["Partos registrados (Histórico 1y)", stats.partosAnuales, "-"],
      ],
    });

    // Proyección de partos
    doc.text("Próximos Nacimientos por Mes", 14, doc.lastAutoTable.finalY + 15);
    autoTable(doc, {
      startY: doc.lastAutoTable.finalY + 20,
      theme: "grid",
      headStyles: { fillColor: [46, 125, 50], textColor: 255, halign: "center" },
      bodyStyles: { halign: "center" },
      head: [["MES ESTIMADO", "PARTOS ESPERADOS", "ARETES PROYECTADOS"]],
      body: proyeccion.map(p => [
        p.label.toUpperCase(),
        p.conteo,
        p.detalles.join(", ") || "-"
      ])
    });

    doc.save(`Proyeccion_Partos_${format(new Date(), "yyyy-MM-dd")}.pdf`);
  } catch (error) {
    console.error(error);
    alert("Error al generar PDF de Proyección de Partos");
  }
}

export function generarExcelProyeccionPartos(animales, eventos) {
  try {
    const { stats, proyeccion } = prepararDatosProyeccionPartos(animales, eventos);
    const wb = XLSX.utils.book_new();

    // Hoja 1: Indicadores
    const wsStats = XLSX.utils.json_to_sheet([
      { Indicador: "Intervalo Entre Partos (IEP)", Valor: stats.avgIEP, Unidad: "Días" },
      { Indicador: "Días Abiertos", Valor: stats.avgDiasAbiertos, Unidad: "Días" },
      { Indicador: "Tasa de Parición", Valor: stats.tasaParicion, Unidad: "%" },
      { Indicador: "Partos últimos 12 meses", Valor: stats.partosAnuales, Unidad: "Eventos" }
    ]);
    XLSX.utils.book_append_sheet(wb, wsStats, "Indicadores_KPIs");

    // Hoja 2: Proyección
    const wsProy = XLSX.utils.json_to_sheet(proyeccion.map(p => ({
      "Mes Estimado": p.label,
      "Cantidad de Partos": p.conteo,
      "Aretes de Vacas": p.detalles.join(", ")
    })));
    XLSX.utils.book_append_sheet(wb, wsProy, "Proyeccion_Nacimientos");
    
    const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    saveAs(blob, `Proyeccion_Partos_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
  } catch (error) {
    console.error(error);
    alert("Error al generar Excel de Proyección de Partos");
  }
}

// ================================================
// REPORTE 4: PRODUCCIÓN POR HECTÁREA
// ================================================

function prepararDatosHectareas(animales) {
  const grupos = {};

  animales.forEach((a) => {
    if (a.estado?.includes("Baja")) return;
    const h = a.hectarea || "Sin Asignar";
    if (!grupos[h]) {
      grupos[h] = { nombre: h, cabezas: 0, pesoTotal: 0 };
    }
    grupos[h].cabezas++;
    // Usamos pesoActual si existe, si no, intentamos parsear peso (inicial)
    const p = parseFloat(a.pesoActual) || parseFloat(a.peso?.toString().replace(/[^0-9.]/g, "")) || 0;
    grupos[h].pesoTotal += p;
  });

  return Object.values(grupos).map((g) => ({
    ...g,
    pesoPromedio: g.cabezas > 0 ? Math.round(g.pesoTotal / g.cabezas) : 0,
    pesoTotal: Math.round(g.pesoTotal),
  }));
}

export function generarPDFHectareas(animales) {
  try {
    const datos = prepararDatosHectareas(animales);
    const doc = new jsPDF();
    const fechaHoy = format(new Date(), "dd 'de' MMMM yyyy", { locale: es });

    doc.setFillColor(46, 125, 50);
    doc.rect(0, 0, doc.internal.pageSize.width, 28, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("REPORTE DE PRODUCCIÓN POR HECTÁREA", 14, 14);
    doc.setFontSize(10);
    doc.text(`Carga animal y rendimiento de biomasa por ubicación (${fechaHoy})`, 14, 22);

    autoTable(doc, {
      startY: 35,
      theme: "grid",
      headStyles: { fillColor: [27, 94, 32], textColor: 255, halign: "center" },
      bodyStyles: { halign: "center" },
      head: [["HECTÁREA / LOTE", "CABEZAS (STOCK)", "PESO TOTAL (KG)", "PROMEDIO POR CABEZA"]],
      body: datos.map((d) => [
        d.nombre.toUpperCase(),
        d.cabezas,
        `${d.pesoTotal.toLocaleString()} kg`,
        `${d.pesoPromedio} kg`,
      ]),
    });

    doc.save(`Reporte_Hectareas_${format(new Date(), "yyyy-MM-dd")}.pdf`);
  } catch (error) {
    console.error(error);
    alert("Error al generar PDF de Hectáreas");
  }
}

export function generarExcelHectareas(animales) {
  try {
    const datos = prepararDatosHectareas(animales);
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(
      datos.map((d) => ({
        HECTAREA: d.nombre,
        CABEZAS: d.cabezas,
        "PESO TOTAL (KG)": d.pesoTotal,
        "PESO PROMEDIO (KG)": d.pesoPromedio,
      }))
    );
    XLSX.utils.book_append_sheet(wb, ws, "Produccion_Hectareas");
    const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([excelBuffer], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    });
    saveAs(blob, `Reporte_Hectareas_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
  } catch (error) {
    console.error(error);
    alert("Error al generar Excel de Hectáreas");
  }
}

// ================================================
// REPORTE 5: DESARROLLO (PESAJES Y GDP)
// ================================================

function prepararDatosDesarrollo(animales, eventos) {
  const hoy = new Date();
  
  // Categorías base según el ejemplo del cliente
  const resumen = {
    "VAQUILLAS": { cantidad: 0, sumaGDP: 0, sumaDias: 0, ultimaFecha: null, conteoValidos: 0 },
    "BECERRAS": { cantidad: 0, sumaGDP: 0, sumaDias: 0, ultimaFecha: null, conteoValidos: 0 },
    "BECERROS": { cantidad: 0, sumaGDP: 0, sumaDias: 0, ultimaFecha: null, conteoValidos: 0 },
    "CRIAS HEMBRAS": { cantidad: 0, sumaGDP: 0, sumaDias: 0, ultimaFecha: null, conteoValidos: 0 },
    "CRIAS MACHOS": { cantidad: 0, sumaGDP: 0, sumaDias: 0, ultimaFecha: null, conteoValidos: 0 },
    "TORETES/OTROS": { cantidad: 0, sumaGDP: 0, sumaDias: 0, ultimaFecha: null, conteoValidos: 0 }
  };

  animales.forEach(a => {
    if (a.estado?.includes("Baja")) return;

    // 1. Clasificación específica para este reporte
    const fechaNac = a.fechaNacimiento ? new Date(a.fechaNacimiento + "T00:00:00") : null;
    const meses = fechaNac && !isNaN(fechaNac.getTime()) ? differenceInMonths(hoy, fechaNac) : 99;
    const sexo = (a.sexo || "").toLowerCase();
    
    let cat = "TORETES/OTROS";
    if (meses < 2) {
      cat = sexo === "hembra" ? "CRIAS HEMBRAS" : "CRIAS MACHOS";
    } else if (meses < 12) {
      cat = sexo === "hembra" ? "BECERRAS" : "BECERROS";
    } else if (sexo === "hembra" && a.tipo === "Novillona") {
      cat = "VAQUILLAS";
    } else if (sexo === "macho" && a.tipo === "Torete") {
      cat = "BECERROS"; // En muchas zonas, toretes jóvenes se siguen reportando como becerros pesados
    } else {
        return; // No entra en reporte de desarrollo (ej: Vacas adultas, Sementales)
    }

    resumen[cat].cantidad++;

    // 2. Cálculo de GDP (Ganancia Diaria de Peso)
    // Buscamos los eventos de repeso
    const misRepesos = eventos
      .filter(e => e.animalId === a.id && e.tipo === "Repeso")
      .sort((a, b) => new Date(b.fecha) - new Date(a.fecha)); // De más reciente a más viejo

    if (misRepesos.length > 0) {
      const elUltimo = misRepesos[0];
      const pesoFinal = parseFloat(elUltimo.resultado) || 0;
      const fechaFinal = new Date(elUltimo.fecha + "T00:00:00");

      // Actualizar última fecha del grupo
      if (!resumen[cat].ultimaFecha || fechaFinal > resumen[cat].ultimaFecha) {
        resumen[cat].ultimaFecha = fechaFinal;
      }

      let pesoInicial = 0;
      let fechaInicial = null;

      if (misRepesos.length >= 2) {
        // Caso A: Tenemos dos repesos
        pesoInicial = parseFloat(misRepesos[1].resultado) || 0;
        fechaInicial = new Date(misRepesos[1].fecha + "T00:00:00");
      } else {
        // Caso B: Solo un repeso, comparamos contra el peso de registro
        pesoInicial = parseFloat(a.peso?.toString().replace(/[^0-9.]/g, "")) || 0;
        fechaInicial = new Date(a.fechaRegistro || a.fechaNacimiento || elUltimo.fecha);
      }

      const diffMs = Math.abs(fechaFinal - fechaInicial);
      const dias = Math.ceil(diffMs / (1000 * 60 * 60 * 24)) || 1;

      if (pesoFinal > pesoInicial && dias > 0) {
        const gdp = (pesoFinal - pesoInicial) / dias;
        resumen[cat].sumaGDP += gdp;
        resumen[cat].sumaDias += dias;
        resumen[cat].conteoValidos++;
      }
    }
  });

  // Formatear para la tabla
  return Object.keys(resumen)
    .filter(k => resumen[k].cantidad > 0)
    .map(k => {
      const r = resumen[k];
      return {
        categoria: k,
        cantidad: r.cantidad,
        ultimaFecha: r.ultimaFecha ? format(r.ultimaFecha, "dd-MMM-yy", { locale: es }).toLowerCase() : "--",
        gdp: r.conteoValidos > 0 ? (r.sumaGDP / r.conteoValidos).toFixed(3) : "0.000",
        dias: r.conteoValidos > 0 ? Math.round(r.sumaDias / r.conteoValidos) : "--"
      };
    });
}

export function generarPDFDesarrollo(animales, eventos) {
  try {
    const datos = prepararDatosDesarrollo(animales, eventos);
    const doc = new jsPDF();
    const fechaHoy = format(new Date(), "dd 'de' MMMM yyyy", { locale: es });

    doc.setFillColor(27, 94, 32);
    doc.rect(0, 0, doc.internal.pageSize.width, 28, "F");
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.text("REPORTE DE DESARROLLO (GDP)", 14, 14);
    doc.setFontSize(10);
    doc.text(`Monitoreo de crecimiento y ganancia de peso por categoría (${fechaHoy})`, 14, 22);

    autoTable(doc, {
      startY: 35,
      theme: "grid",
      headStyles: { fillColor: [46, 125, 50], textColor: 255, halign: "center" },
      bodyStyles: { halign: "center" },
      columnStyles: {
          0: { halign: "left", fontStyle: "bold" },
          3: { fontStyle: "bold", textColor: [27, 94, 32] }
      },
      head: [["CATEGORÍA", "CANTIDAD", "ÚLTIMA FECHA", "GDP (PROM. KG/DÍAS)", "DÍAS (PERIODO)"]],
      body: datos.map((d) => [
        d.categoria,
        d.cantidad,
        d.ultimaFecha,
        d.gdp,
        d.dias
      ]),
    });

    doc.save(`Reporte_Desarrollo_GDP_${format(new Date(), "yyyy-MM-dd")}.pdf`);
  } catch (error) {
    console.error(error);
    alert("Error al generar PDF de Desarrollo");
  }
}

export function generarExcelDesarrollo(animales, eventos) {
  try {
    const datos = prepararDatosDesarrollo(animales, eventos);
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(
      datos.map((d) => ({
        CATEGORIA: d.categoria,
        CANTIDAD: d.cantidad,
        "ULTIMA FECHA": d.ultimaFecha,
        "GDP (PROM)": d.gdp,
        "DIAS PROMEDIO": d.dias
      }))
    );
    XLSX.utils.book_append_sheet(wb, ws, "Desarrollo_GDP");
    const excelBuffer = XLSX.write(wb, { bookType: "xlsx", type: "array" });
    const blob = new Blob([excelBuffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
    saveAs(blob, `Reporte_Desarrollo_GDP_${format(new Date(), "yyyy-MM-dd")}.xlsx`);
  } catch (error) {
    console.error(error);
    alert("Error al generar Excel de Desarrollo");
  }
}

// ================================================
// REPORTE 6: CALENDARIO DE MANEJO (SOP + REAL)
// ================================================
import { PROTOCOLO_SANITARIO } from "./protocoloSanitario";

function prepararDatosCalendario(animales, eventos, alertas) {
    const hoy = new Date();
    const mesActualIdx = hoy.getMonth();
    const mesSiguienteIdx = (mesActualIdx + 1) % 12;

    const nombresMeses = ["ENERO", "FEBRERO", "MARZO", "ABRIL", "MAYO", "JUNIO", "JULIO", "AGOSTO", "SEPTIEMBRE", "OCTUBRE", "NOVIEMBRE", "DICIEMBRE"];
    
    const mesActualNombre = nombresMeses[mesActualIdx];
    const mesSiguienteNombre = nombresMeses[mesSiguienteIdx];

    const categoriasSolicitadas = [
        { label: "VACAS", tipos: ["Vaca"] },
        { label: "VAQUILLAS", tipos: ["Novillona"] },
        { label: "BECERRAS", tipos: ["Becerra"] },
        { label: "BECERROS", tipos: ["Becerro"] },
        { label: "TORETES", tipos: ["Torete"] },
        { label: "CRIAS HEMBRAS", tipos: ["Becerra", "Lactante"], sexo: "hembra" }, // Mapeo flexible
        { label: "CRIAS MACHOS", tipos: ["Becerro", "Lactante"], sexo: "macho" }
    ];

    const formatActividades = (lista) => {
        const result = ["", "", ""];
        lista.slice(0, 3).forEach((item, i) => result[i] = item);
        return result;
    };

    return categoriasSolicitadas.map(cat => {
        // En el reporte el cliente usa CRIAS pero en mi DB son Lactantes o Becerros muy jóvenes
        const animalesDeCat = animales.filter(a => {
            if (a.estado?.includes("Baja")) return false;
            
            // Especial para CRÍAS (basado en edad < 4 meses)
            const edadM = a.fechaNacimiento ? differenceInMonths(hoy, new Date(a.fechaNacimiento + "T00:00:00")) : 99;
            if (cat.label.includes("CRIAS")) {
                if (edadM > 4) return false;
                return (a.sexo || "").toLowerCase() === cat.sexo;
            }

            const cumpleTipo = cat.tipos.includes(a.tipo);
            if (!cumpleTipo) return false;
            return true;
        });

        const idsAnimales = animalesDeCat.map(a => a.id);
        const aretesAnimales = animalesDeCat.map(a => a.arete);

        // --- REAL / ALERTAS ---
        const evMesActual = eventos.filter(e => {
            const f = new Date(e.fecha + "T00:00:00");
            return idsAnimales.includes(e.animalId) && f.getMonth() === mesActualIdx;
        });
        const alMesActual = alertas.filter(al => {
            const f = new Date(al.fechaProgramada + "T00:00:00");
            return aretesAnimales.includes(al.areteAnimal) && f.getMonth() === mesActualIdx;
        });
        const alMesSig = alertas.filter(al => {
            const f = new Date(al.fechaProgramada + "T00:00:00");
            return aretesAnimales.includes(al.areteAnimal) && f.getMonth() === mesSiguienteIdx;
        });

        // --- SUGERIDO (SOP) ---
        let keySOP = cat.label.includes("CRIAS") ? "Crias" : 
                     (cat.label === "VACAS" ? "Vacas" : 
                     (cat.label === "VAQUILLAS" ? "Vaquillas" : 
                     (cat.label === "TORETES" ? "Toretes" : 
                     (cat.label === "BECERROS" ? "Becerros" : "Becerras"))));

        const sopActual = PROTOCOLO_SANITARIO[mesActualIdx]?.[keySOP] || [];
        const sopSig = PROTOCOLO_SANITARIO[mesSiguienteIdx]?.[keySOP] || [];

        // Mezclar
        const resActual = [
            ...new Set(evMesActual.map(e => `(✓) ${e.tipo}`)),
            ...new Set(alMesActual.map(al => `(🔔) ${al.titulo.split(" ")[0]}`))
        ];
        if (resActual.length === 0) resActual.push(...sopActual.map(s => `(📋) ${s}`));

        const resSig = [
            ...new Set(alMesSig.map(al => `(🔔) ${al.titulo.split(" ")[0]}`))
        ];
        if (resSig.length === 0) resSig.push(...sopSig.map(s => `(📋) ${s}`));

        return {
            categoria: cat.label,
            mesActual: mesActualNombre,
            actividadesActual: formatActividades(resActual),
            mesSiguiente: mesSiguienteNombre,
            actividadesSiguiente: formatActividades(resSig)
        };
    });
}

export function generarPDFCalendario(animales, eventos, alertas) {
    try {
        const datos = prepararDatosCalendario(animales, eventos, alertas);
        const doc = new jsPDF({ orientation: "landscape" });
        const hoy = new Date();
        const mesStr = format(hoy, "MMMM", { locale: es }).toUpperCase();

        doc.setFillColor(27, 94, 32);
        doc.rect(0, 0, doc.internal.pageSize.width, 28, "F");
        doc.setTextColor(255, 255, 255);
        doc.setFontSize(18);
        doc.text("CALENDARIO DE MANEJO SANITARIO", 14, 14);
        doc.setFontSize(10);
        doc.text(`Planificación vs Ejecución — Mes: ${mesStr}`, 14, 22);

        // LEYENDA
        doc.setFillColor(245, 245, 245);
        doc.rect(14, 32, 269, 10, "F");
        doc.setTextColor(50, 50, 50);
        doc.setFontSize(8);
        doc.text("LEYENDA: (✓) Realizado | (🔔) Programado | (📋) Sugerencia Estándar por Temporada (Personalizable)", 20, 38);

        autoTable(doc, {
            startY: 45, theme: "grid",
            headStyles: { fillColor: [46, 125, 50], textColor: 255, halign: "center" },
            bodyStyles: { fontSize: 7, cellPadding: 2 },
            head: [["CATEGORIA", `MES ACTUAL (${datos[0].mesActual})`, "ACT 1", "ACT 2", "ACT 3", `MES SIGUIENTE (${datos[0].mesSiguiente})`, "ACT 1", "ACT 2", "ACT 3"]],
            body: datos.map(d => [
                d.categoria, d.mesActual, ...d.actividadesActual, d.mesSiguiente, ...d.actividadesSiguiente
            ])
        });

        doc.save(`Calendario_Manejo_${format(new Date(), "yyyy-MM")}.pdf`);
    } catch (e) { console.error(e); }
}

export function generarExcelCalendario(animales, eventos, alertas) {
    try {
        const datos = prepararDatosCalendario(animales, eventos, alertas);
        const wb = XLSX.utils.book_new();
        const wsData = datos.map(d => ({
            "CATEGORIA": d.categoria,
            "MES ACTUAL": d.mesActual,
            "ACT 1": d.actividadesActual[0],
            "ACT 2": d.actividadesActual[1],
            "ACT 3": d.actividadesActual[2],
            "MES SIGUIENTE": d.mesSiguiente,
            "S_ACT 1": d.actividadesSiguiente[0],
            "S_ACT 2": d.actividadesSiguiente[1],
            "S_ACT 3": d.actividadesSiguiente[2]
        }));
        const ws = XLSX.utils.json_to_sheet(wsData);
        XLSX.utils.book_append_sheet(wb, ws, "Calendario");
        XLSX.writeFile(wb, `Calendario_Manejo_${format(new Date(), "yyyy-MM")}.xlsx`);
    } catch (e) { console.error(e); }
}
