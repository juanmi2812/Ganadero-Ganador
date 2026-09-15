const fs = require('fs');
let content = fs.readFileSync('src/views/DashboardGanado.js', 'utf8');

// 1. Add import
if (!content.includes('import Select from "react-select"')) {
    content = content.replace('import React, { useState, useEffect } from "react";', 'import React, { useState, useEffect } from "react";\nimport Select from "react-select";');
}

// 2. Change state to arrays
content = content.replace('const [filtroActivo, setFiltroActivo] = useState("Todos");', 'const [filtroActivo, setFiltroActivo] = useState(["Todos"]);');
content = content.replace('const [filtroPotrero, setFiltroPotrero] = useState("Todos");', 'const [filtroPotrero, setFiltroPotrero] = useState(["Todos"]);');
content = content.replace('const [filtroGrupo, setFiltroGrupo] = useState("Todos");', 'const [filtroGrupo, setFiltroGrupo] = useState(["Todos"]);');

// 3. Update KPI clicks (we only care about the first parameter of includes later, but let's just make it array)
content = content.replace(/setFiltroActivo\("([^"]+)"\)/g, 'setFiltroActivo([""])');

// Also update KPI borders to check if array includes it
content = content.replace(/filtroActivo === "Todos"/g, 'filtroActivo.includes("Todos")');
content = content.replace(/filtroActivo === "Machos"/g, 'filtroActivo.includes("Machos")');
content = content.replace(/filtroActivo === "Hembras"/g, 'filtroActivo.includes("Hembras")');
content = content.replace(/filtroActivo === "En Venta"/g, 'filtroActivo.includes("En Venta")');

// 4. Update filtering logic
const oldFilter = 
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
;
const newFilter = 
    const cumplePotrero = filtroPotrero.includes("Todos") || filtroPotrero.includes(animal.potrero || animal.hectarea);
    if (!cumplePotrero) return false;

    const cumpleGrupo = filtroGrupo.includes("Todos") || filtroGrupo.includes(animal.grupo);
    if (!cumpleGrupo) return false;

    if (filtroActivo.includes("Todos")) return true;
    
    // Multiple active filters support
    return filtroActivo.some(f => {
      if (f === "Bajas") return animal.estado?.includes('Baja');
      if (f === "En Venta") return animal.estado === "Disponible para Venta" || animal.estado === "Desecho";
      if (f === "Machos") return animal.sexo?.toLowerCase() === "macho" && !animal.estado?.includes('Baja');
      if (f === "Hembras") return animal.sexo?.toLowerCase() === "hembra" && !animal.estado?.includes('Baja');
      return animal.tipo === f && !animal.estado?.includes('Baja') && animal.estado !== "Disponible para Venta" && animal.estado !== "Desecho";
    });
;
content = content.replace(oldFilter.trim(), newFilter.trim());

// 5. Replace native selects with react-select
const selectBlockStart = '<div style={{ display: "flex", gap: "10px", flexWrap: "wrap", marginBottom: "16px" }}>';
const searchBarStart = '<div className="search-bar"';

const startIndex = content.indexOf(selectBlockStart);
const endIndex = content.indexOf(searchBarStart, startIndex);

if (startIndex !== -1 && endIndex !== -1) {
    const newSelects = \
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "10px", marginBottom: "16px" }}>
          <Select 
            isMulti
            options={["Todos", "Vaca", "Novillona", "Semental", "Torete", "Becerra", "Becerro", "En Venta", "Bajas"].map(t => ({value: t, label: t === "Todos" ? "Todos los Tipos" : t}))}
            value={filtroActivo.map(v => ({ value: v, label: v === "Todos" ? "Todos los Tipos" : v }))}
            onChange={(selected) => setFiltroActivo(selected.length ? selected.map(s => s.value) : ["Todos"])}
            placeholder="Tipos..."
            styles={{ container: base => ({ flex: 1 }) }}
          />
          <Select 
            isMulti
            options={listaPotreros.map(h => ({value: h, label: h === "Todos" ? "🏞️ Todos los Potreros" : \📍 \\}))}
            value={filtroPotrero.map(v => ({ value: v, label: v === "Todos" ? "🏞️ Todos los Potreros" : \📍 \\ }))}
            onChange={(selected) => setFiltroPotrero(selected.length ? selected.map(s => s.value) : ["Todos"])}
            placeholder="Potreros..."
            styles={{ container: base => ({ flex: 1 }) }}
          />
          <Select 
            isMulti
            options={listaGrupos.map(g => ({value: g, label: g === "Todos" ? "🏷️ Todos los Grupos" : \🏷️ \\}))}
            value={filtroGrupo.map(v => ({ value: v, label: v === "Todos" ? "🏷️ Todos los Grupos" : \🏷️ \\ }))}
            onChange={(selected) => setFiltroGrupo(selected.length ? selected.map(s => s.value) : ["Todos"])}
            placeholder="Grupos..."
            styles={{ container: base => ({ flex: 1 }) }}
          />
      </div>

      \;
    content = content.substring(0, startIndex) + newSelects + content.substring(endIndex);
}

fs.writeFileSync('src/views/DashboardGanado.js', content);
console.log("Success");
