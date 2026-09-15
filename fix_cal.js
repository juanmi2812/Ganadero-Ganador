const fs = require('fs');

let content = fs.readFileSync('src/views/CalendarioAlertas.js', 'utf8');

const oldBlock =                   return (
                    <div key={alerta.id} style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      padding: "12px 0", borderBottom: "1px solid #f3f4f6",
                    }}>;

const newBlock =                   return (
                    <div key={alerta.id} style={{
                      display: "flex", flexDirection: "column", gap: "10px",
                      padding: "12px 0", borderBottom: "1px solid #f3f4f6",
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "12px" }}>;

content = content.replace(oldBlock, newBlock);

const oldEstado =                       {/* Estado + Botones de Acción */}
                      <div style={{ display: "flex", flexDirection: "row", alignItems: "center", flexWrap: "wrap", width: "100%", justifyContent: "space-between", gap: "6px", flexShrink: 0, marginLeft: "0" }}>
                        <span style={{;

const newEstado =                       </div> {/* Cierre del row superior */}
                      {/* Estado + Botones de Acción */}
                      <div style={{ display: "flex", flexDirection: "row", alignItems: "center", flexWrap: "wrap", width: "100%", justifyContent: "space-between", gap: "8px", marginTop: "4px" }}>
                        <span style={{;

content = content.replace(oldEstado, newEstado);

fs.writeFileSync('src/views/CalendarioAlertas.js', content);
console.log("Success!");
