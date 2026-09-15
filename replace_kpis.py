import codecs

with codecs.open('src/views/ReportesBI.js', 'r', 'utf-8') as f:
    content = f.read()

import re

# Find the start of the grid
start_idx = content.find('<div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px", marginBottom: "24px" }}>')
end_idx = content.find('{/* KPI 9: Producción de Leche (Promedio Individual) */}', start_idx)
end_idx = content.find('</div>', end_idx + 100) + 6 # End of KPI 9 div

if start_idx != -1 and end_idx != -1:
    new_grid = '''<div className="kpi-grid" style={{ marginBottom: "24px" }}>
        
        {/* KPI 1: Volumen */}
        <div className="kpi-card" style={{ position: "relative" }}>
            <button onClick={() => setInfoKpi({titulo: "Volumen Filtrado", descripcion: "Muestra el número total de cabezas de ganado que coinciden con los filtros aplicados arriba.", calculo: "Conteo directo de animales activos en el inventario según categoría, estatus y género."})} style={{ position: "absolute", top: "12px", right: "12px", background: "#f3f4f6", border: "none", cursor: "pointer", color: "#6b7280", padding: "4px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }} title="Ver información del cálculo" onMouseOver={e => e.currentTarget.style.background = "#e5e7eb"} onMouseOut={e => e.currentTarget.style.background = "#f3f4f6"}><Info size={16}/></button>
            <div style={{ fontSize: "22px", marginBottom: "6px" }}>🐄</div>
            <div className="kpi-value" style={{ color: "#3b82f6" }}>{cabezasTotales}</div>
            <div className="kpi-label">Volumen Filtrado</div>
            <div style={{ fontSize: "11px", color: "#6b7280", marginTop: "4px" }}>Cabezas totales</div>
        </div>

        {/* KPI 2: Tasa de Preñez */}
        <div className="kpi-card" style={{ position: "relative" }}>
            <button onClick={() => setInfoKpi({titulo: "Tasa de Preñez (Natalidad)", descripcion: "Mide la eficiencia reproductiva del hato, indicando qué proporción de las hembras están preñadas.", calculo: "(Vientres Gestantes / Total de Vientres en el rancho) * 100."})} style={{ position: "absolute", top: "12px", right: "12px", background: "#f3f4f6", border: "none", cursor: "pointer", color: "#6b7280", padding: "4px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }} title="Ver información del cálculo" onMouseOver={e => e.currentTarget.style.background = "#e5e7eb"} onMouseOut={e => e.currentTarget.style.background = "#f3f4f6"}><Info size={16}/></button>
            <div style={{ fontSize: "22px", marginBottom: "6px" }}>📈</div>
            <div className="kpi-value" style={{ color: "#10b981" }}>{tasaPrenez}%</div>
            <div className="kpi-label">Tasa de Preñez</div>
            <div style={{ fontSize: "11px", color: "#6b7280", marginTop: "4px" }}>{vientresGestantes} de {totalVientres} vientres gestantes</div>
        </div>

        {/* KPI: IEP - Intervalo Entre Partos */}
        <div className="kpi-card" style={{ position: "relative" }}>
            <button onClick={() => setInfoKpi({titulo: "Intervalo Entre Partos (IEP)", descripcion: "Promedio de días transcurridos entre dos partos consecutivos de la misma vaca. Es el indicador de oro de la eficiencia reproductiva.", calculo: "Suma de días entre partos / Conteo de intervalos válidos (365-410 días es la meta)."})} style={{ position: "absolute", top: "12px", right: "12px", background: "#f3f4f6", border: "none", cursor: "pointer", color: "#6b7280", padding: "4px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }} title="Ver información del cálculo" onMouseOver={e => e.currentTarget.style.background = "#e5e7eb"} onMouseOut={e => e.currentTarget.style.background = "#f3f4f6"}><Info size={16}/></button>
            <div style={{ fontSize: "22px", marginBottom: "6px" }}>⏱️</div>
            <div className="kpi-value" style={{ color: "#c026d3" }}>{avgIEP || "--"}</div>
            <div className="kpi-label">Int. Entre Partos</div>
            <div style={{ fontSize: "11px", color: "#6b7280", marginTop: "4px" }}>Días (promedio)</div>
        </div>

        {/* KPI 3: Tasa de Infertilidad */}
        <div className="kpi-card" style={{ position: "relative" }}>
            <button onClick={() => setInfoKpi({titulo: "Tasa de Infertilidad", descripcion: "Identifica la proporción de vientres con posible infertilidad debido a su edad avanzada sin reportar crías.", calculo: "(Vientres ≥ 48m de edad sin parto / Total de Vientres) * 100."})} style={{ position: "absolute", top: "12px", right: "12px", background: "#f3f4f6", border: "none", cursor: "pointer", color: "#6b7280", padding: "4px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }} title="Ver información del cálculo" onMouseOver={e => e.currentTarget.style.background = "#e5e7eb"} onMouseOut={e => e.currentTarget.style.background = "#f3f4f6"}><Info size={16}/></button>
            <div style={{ fontSize: "22px", marginBottom: "6px" }}>⚠️</div>
            <div className="kpi-value" style={{ color: "#ef4444" }}>{porcentajeInfertilidad}%</div>
            <div className="kpi-label">Tasa de Infertilidad</div>
            <div style={{ fontSize: "11px", color: "#6b7280", marginTop: "4px" }}>Vientres ≥ 48m sin parto ({vientresInfertiles})</div>
        </div>

        {/* KPI 4: Bajas Generales */}
        <div className="kpi-card" style={{ position: "relative" }}>
            <button onClick={() => setInfoKpi({titulo: "Índice de Bajas Totales", descripcion: "Evalúa las bajas totales del rancho por venta, muerte o robo. Mantener este número bajo es vital para la rentabilidad.", calculo: "(Cabezas dadas de baja / Inventario base estimado) * 100."})} style={{ position: "absolute", top: "12px", right: "12px", background: "#f3f4f6", border: "none", cursor: "pointer", color: "#6b7280", padding: "4px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }} title="Ver información del cálculo" onMouseOver={e => e.currentTarget.style.background = "#e5e7eb"} onMouseOut={e => e.currentTarget.style.background = "#f3f4f6"}><Info size={16}/></button>
            <div style={{ fontSize: "22px", marginBottom: "6px" }}>🪦</div>
            <div className="kpi-value" style={{ color: "#f97316" }}>{tasaBajasGeneral}%</div>
            <div className="kpi-label">Índice de Bajas</div>
            <div style={{ fontSize: "11px", color: "#6b7280", marginTop: "4px" }}>{muertesCount} bajas registradas</div>
        </div>

        {/* KPI 5: Carga Animal */}
        <div className="kpi-card" style={{ position: "relative" }}>
            <button onClick={() => setInfoKpi({titulo: "Carga Animal (Promedio)", descripcion: "Indica cuántos animales tienes pastando en promedio por cada hectárea de tu rancho.", calculo: "Total de Cabezas / Total de Hectáreas en los potreros."})} style={{ position: "absolute", top: "12px", right: "12px", background: "#f3f4f6", border: "none", cursor: "pointer", color: "#6b7280", padding: "4px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }} title="Ver información del cálculo" onMouseOver={e => e.currentTarget.style.background = "#e5e7eb"} onMouseOut={e => e.currentTarget.style.background = "#f3f4f6"}><Info size={16}/></button>
            <div style={{ fontSize: "22px", marginBottom: "6px" }}>🏞️</div>
            <div className="kpi-value" style={{ color: "#8b5cf6" }}>{cargaAnimalGlobal}</div>
            <div className="kpi-label">Carga Animal</div>
            <div style={{ fontSize: "11px", color: "#6b7280", marginTop: "4px" }}>Cabezas por hectárea</div>
        </div>

        {/* KPI 6: Desecho */}
        <div className="kpi-card" style={{ position: "relative" }}>
            <button onClick={() => setInfoKpi({titulo: "Tasa de Desecho (Culling)", descripcion: "Mide el porcentaje de vientres improductivos que fueron retirados o vendidos.", calculo: "(Ventas por Desecho / Total de Vacas actuales) * 100."})} style={{ position: "absolute", top: "12px", right: "12px", background: "#f3f4f6", border: "none", cursor: "pointer", color: "#6b7280", padding: "4px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }} title="Ver información del cálculo" onMouseOver={e => e.currentTarget.style.background = "#e5e7eb"} onMouseOut={e => e.currentTarget.style.background = "#f3f4f6"}><Info size={16}/></button>
            <div style={{ fontSize: "22px", marginBottom: "6px" }}>🗑️</div>
            <div className="kpi-value" style={{ color: "#eab308" }}>{metricas.desecho}%</div>
            <div className="kpi-label">Tasa de Desecho</div>
            <div style={{ fontSize: "11px", color: "#6b7280", marginTop: "4px" }}>{metricas.conteoDesecho} vacas de desecho</div>
        </div>

        {/* KPI 7: Edad al Primer Parto */}
        <div className="kpi-card" style={{ position: "relative" }}>
            <button onClick={() => setInfoKpi({titulo: "Edad al Primer Parto", descripcion: "Promedio de meses que tardan las hembras desde que nacen hasta que tienen su primera cría.", calculo: "Promedio de edad (meses) en la fecha del primer evento de parto registrado por vientre."})} style={{ position: "absolute", top: "12px", right: "12px", background: "#f3f4f6", border: "none", cursor: "pointer", color: "#6b7280", padding: "4px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }} title="Ver información del cálculo" onMouseOver={e => e.currentTarget.style.background = "#e5e7eb"} onMouseOut={e => e.currentTarget.style.background = "#f3f4f6"}><Info size={16}/></button>
            <div style={{ fontSize: "22px", marginBottom: "6px" }}>🎂</div>
            <div className="kpi-value" style={{ color: "#14b8a6" }}>{edadPrimerParto}</div>
            <div className="kpi-label">Edad Primer Parto</div>
            <div style={{ fontSize: "11px", color: "#6b7280", marginTop: "4px" }}>Meses (promedio)</div>
        </div>

        {/* KPI 9: Producción de Leche (Promedio Individual) */}
        <div className="kpi-card" style={{ position: "relative" }}>
            <button onClick={() => setInfoKpi({titulo: "Promedio Leche Individual", descripcion: "Promedio de litros de leche producidos por vaca según los registros individuales.", calculo: "Suma de litros individuales / Número de registros individuales."})} style={{ position: "absolute", top: "12px", right: "12px", background: "#f3f4f6", border: "none", cursor: "pointer", color: "#6b7280", padding: "4px", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s" }} title="Ver información del cálculo" onMouseOver={e => e.currentTarget.style.background = "#e5e7eb"} onMouseOut={e => e.currentTarget.style.background = "#f3f4f6"}><Info size={16}/></button>
            <div style={{ fontSize: "22px", marginBottom: "6px" }}>🥛</div>
            <div className="kpi-value" style={{ color: "#8b5cf6" }}>{promedioLeche}</div>
            <div className="kpi-label">Prom. Leche/Vaca</div>
            <div style={{ fontSize: "11px", color: "#6b7280", marginTop: "4px" }}>Litros (histórico)</div>
        </div>'''
    
    content = content[:start_idx] + new_grid + content[end_idx:]
    with codecs.open('src/views/ReportesBI.js', 'w', 'utf-8') as f:
        f.write(content)
    print("Success")
else:
    print("Could not find start or end index.")
