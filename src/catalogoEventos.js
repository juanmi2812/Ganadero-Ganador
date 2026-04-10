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
  "Repeso": [],
  "Palpación": ["Gestante", "Vacía - Fresca", "Vacía - Ciclando", "Vacía - Anestro", "Dudosa"],
  "Parto": [],
  "Inseminación": [],
  "Revisión General": [],
  "Otro": [],
};

export const TIPOS_EVENTO = Object.keys(CATALOGO_EVENTOS);
