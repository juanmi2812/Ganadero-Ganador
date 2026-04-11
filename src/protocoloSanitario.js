/**
 * PROTOCOLO SANITARIO MAESTRO (SOP)
 * Define las actividades sugeridas por defecto para cada mes del año.
 * Basado en mejores prácticas ganaderas.
 */

export const PROTOCOLO_SANITARIO = {
    // Categorías: Vacas, Vaquillas, Becerras, Becerros, Toretes, Crias
    0: { // Enero
        Vacas: ["Advendazol (Desparasitación)", "Vitaminas ADE"],
        Vaquillas: ["Advendazol", "Vitaminas ADE"],
        Becerros: ["Vitaminas ADE"],
        Becerras: ["Vitaminas ADE"],
        Toretes: ["Advendazol", "Vitaminas ADE"],
        Crias: ["Identificación / Arete"]
    },
    1: { // Febrero
        Vacas: ["Control de Garrapatas"],
        Vaquillas: ["Control de Garrapatas"],
        Toretes: ["Vitaminas ADE (Refuerzo)"],
        Becerros: ["Control de Garrapatas"],
        Becerras: ["Control de Garrapatas"]
    },
    2: { // Marzo
        Vacas: ["Vacuna Viral / Lepto"],
        Vaquillas: ["Vacuna Viral / Lepto"],
        Becerras: ["Vacuna Viral / Lepto"],
        Becerros: ["Vacuna Viral / Lepto"],
        Toretes: ["Vacuna Viral / Lepto"],
        Crias: ["Vacuna Clostridial (Sana 7/8)"]
    },
    3: { // Abril
        Vacas: ["Palpación / Diagnóstico"],
        Vaquillas: ["Palpación / Sincronización"],
        Crias: ["Despunte / Descuerne"]
    },
    4: { // Mayo
        Vacas: ["Vitaminas ADE (Preservicio)"],
        Toretes: ["Control Mosca/Tábano"],
        Becerros: ["Control Mosca/Tábano"],
        Becerras: ["Control Mosca/Tábano"]
    },
    5: { // Junio
        Vacas: ["Revisión de Condición Corporal"],
        Vaquillas: ["Suplementación Mineral"]
    },
    6: { // Julio
        // Época de lluvias / Humedad
        Vacas: ["Control de Gabarro (Pezuñas)"],
        Becerros: ["Desparasitación Interna"],
        Becerras: ["Desparasitación Interna"]
    },
    7: { // Agosto
        Vacas: ["Vacuna Ántrax / Fiebre Carbonosa"],
        Vaquillas: ["Vacuna Ántrax"],
        Toretes: ["Vacuna Ántrax"]
    },
    8: { // Septiembre
        Vacas: ["Vacuna Derriengue (Rabia)"],
        Vaquillas: ["Vacuna Derriengue"],
        Becerros: ["Destete / Vacuna Resp."],
        Becerras: ["Destete / Vacuna Resp."]
    },
    9: { // Octubre
        Vacas: ["Control de Fasciola Hepática"],
        Vaquillas: ["Control de Fasciola Hepática"],
        Toretes: ["Selección / Venta"]
    },
    10: { // Noviembre
        Vacas: ["Vitaminas ADE (Preparación Invierno)"],
        Vaquillas: ["Vitaminas ADE"],
        Becerros: ["Advendazol"],
        Becerras: ["Advendazol"]
    },
    11: { // Diciembre
        Vacas: ["Suplementación Energética"],
        Vaquillas: ["Suplementación Energética"]
    }
};

export const NOMBRES_CATEGORIAS_CALENDARIO = [
    "Vacas", "Vaquillas", "Becerras", "Becerros", "Toretes", "Crias Hembras", "Crias Machos"
];
