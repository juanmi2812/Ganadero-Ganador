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
