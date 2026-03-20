import React, { useState } from "react";
import { UploadCloud, FileSpreadsheet, CheckCircle2 } from "lucide-react";

export default function ImportadorMasivo() {
  const [archivo, setArchivo] = useState(null);
  const [cargando, setCargando] = useState(false);
  const [mensajeExito, setMensajeExito] = useState(false);

  // Manejar la selección del archivo
  const manejarCambioArchivo = (e) => {
    const file = e.target.files[0];
    if (file) {
      setArchivo(file);
      setMensajeExito(false);
    }
  };

  // Simular la subida al servidor (lo que conectaremos con el Node.js después)
  const subirArchivo = () => {
    if (!archivo) return;
    setCargando(true);

    // Simulamos un tiempo de espera de red de 2 segundos
    setTimeout(() => {
      setCargando(false);
      setMensajeExito(true);
      setArchivo(null); // Limpiamos el formulario
    }, 2000);
  };

  return (
    <div className="admin-container">
      <div className="header">
        <h1>Configuración Inicial: Control Ganadero</h1>
        <p>
          Sube el archivo Excel con el inventario actual de tus animales
          (Vientres, Sementales, Crías).
        </p>
      </div>

      {/* Zona de arrastrar y soltar archivo */}
      <label className="upload-box" htmlFor="excel-upload">
        <UploadCloud size={48} color="#9ca3af" style={{ margin: "0 auto" }} />
        <h3 style={{ color: "#374151", marginTop: "16px" }}>
          Haz clic para subir tu Excel
        </h3>
        <p style={{ color: "#6b7280", fontSize: "14px" }}>
          Archivos soportados: .xlsx, .csv
        </p>
        <input
          id="excel-upload"
          type="file"
          accept=".xlsx, .xls, .csv"
          style={{ display: "none" }}
          onChange={manejarCambioArchivo}
        />
      </label>

      {/* Mostrar el archivo seleccionado */}
      {archivo && (
        <div style={{ marginTop: "24px" }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              color: "#4b5563",
            }}
          >
            <FileSpreadsheet size={24} color="#3b82f6" />
            <span>
              Archivo listo para procesar: <strong>{archivo.name}</strong>
            </span>
          </div>

          <button
            className="btn-primary"
            onClick={subirArchivo}
            disabled={cargando}
          >
            {cargando
              ? "Procesando datos del ganado..."
              : "Importar Datos al Sistema"}
          </button>
        </div>
      )}

      {/* Mensaje de éxito simulado */}
      {mensajeExito && (
        <div className="file-status status-success">
          <CheckCircle2 size={20} />
          <span>
            ¡Carga masiva completada exitosamente! Tu ganado ha sido registrado.
          </span>
        </div>
      )}
    </div>
  );
}
