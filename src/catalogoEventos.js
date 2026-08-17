// Catálogo Maestro de Tipos de Eventos y Sub-Eventos
// Se usa en CalendarioAlertas.js y DashboardGanado.js

export const CATALOGO_EVENTOS = {
  "Desparasitante": ["Ivermectina", "Advendazol", "Febendazol", "Levamisol"],
  "Garrapaticida": ["Amitraz", "Organofosforado"],
  "Vacuna": ["Viral", "Rabia", "Clostridium", "Leptospira"],
  "Mosquicida": ["Cipemetrina", "Organofosforado"],
  "Antibióticos": ["Tilmicosina", "Enrofloxavina", "Oxitetraciclina", "Penicilina"],
  "Vitamina": ["Vitamina ADE", "Vitamina B"],
  "Herbicida": ["Picloram", "24D", "Paraquat"],
  "Fertilizante": ["Urea", "DAP", "Sulfato de amonio", "Triple 17"],
  "Plaguicida": ["Cipermetrina"],
  "Tratamiento": ["Antibiótico", "Antiinflamatorio", "Vitaminas", "Suero Oral", "Otro"],
  "Repeso": [],
  "Palpación": ["Gestante", "Vacía - Fresca", "Vacía - Ciclando", "Vacía - Anestro", "Dudosa", "No Pasó"],
  "Parto": [],
  "Aborto": [],
  "Inseminación": [],
  "Revisión General": [],
  "Otro": [],
};

export const TIPOS_EVENTO = Object.keys(CATALOGO_EVENTOS);

// Tipos exclusivos para tratamientos de GANADO (excluye insumos de campo)
export const TRATAMIENTOS_GANADO = [
  "Desparasitante",
  "Garrapaticida",
  "Vacuna",
  "Mosquicida",
  "Antibióticos",
  "Vitamina",
  "Tratamiento",
  "Otro"
];

// Tipos de EVENTOS
export const EVENTOS_GANADO = [
  "Repeso",
  "Palpación",
  "Parto",
  "Aborto",
  "Inseminación",
  "Revisión General",
  "Otro"
];

// Exportado por retrocompatibilidad donde se requiera todo junto
export const TIPOS_EVENTO_GANADO = [...TRATAMIENTOS_GANADO, ...EVENTOS_GANADO].filter((v, i, a) => a.indexOf(v) === i);

// Tipos exclusivos para tratamientos de POTREROS
export const CATALOGO_EVENTOS_POTRERO = {
  "Herbicida": ["Picloram", "24D", "Paraquat"],
  "Fertilizante": ["Urea", "DAP", "Sulfato de amonio", "Triple 17"],
  "Plaguicida": ["Cipermetrina"],
  "Riego": [],
};
export const TIPOS_EVENTO_POTRERO = Object.keys(CATALOGO_EVENTOS_POTRERO);
