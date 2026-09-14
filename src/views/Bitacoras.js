import React, { useState, useEffect, useRef } from "react";
import { collection, addDoc, query, where, getDocs, onSnapshot, orderBy } from "firebase/firestore";
import { ref, uploadString, getDownloadURL } from "firebase/storage";
import { db, storage } from "../firebase";
import Header from "../components/Header";
import { BookOpen, Plus, Camera, Send, X, FileText, CheckCircle2 } from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function Bitacoras({ usuario }) {
  const [bitacoras, setBitacoras] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [mostrarModal, setMostrarModal] = useState(false);
  
  // Estado para nueva bitácora
  const [notas, setNotas] = useState("");
  const [fotoB64, setFotoB64] = useState("");
  const [resumenEventos, setResumenEventos] = useState("");
  const [guardando, setGuardando] = useState(false);
  
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (!usuario?.ranchoId) return;
    const q = query(collection(db, "bitacoras"), where("ranchoId", "==", usuario.ranchoId), orderBy("fecha", "desc"));
    const unsub = onSnapshot(q, (snap) => {
      setBitacoras(snap.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setCargando(false);
    });
    return () => unsub();
  }, [usuario]);

  // Cargar resumen automático de eventos del día
  const cargarResumenDelDia = async () => {
    const hoy = new Date().toISOString().split('T')[0];
    const q = query(
      collection(db, "eventos"), 
      where("ranchoId", "==", usuario.ranchoId),
      where("fecha", "==", hoy)
    );
    try {
      const snap = await getDocs(q);
      const conteo = {};
      let detalles = "";
      
      snap.docs.forEach(doc => {
        const ev = doc.data();
        conteo[ev.tipo] = (conteo[ev.tipo] || 0) + 1;
      });

      if (Object.keys(conteo).length === 0) {
        detalles = "Sin eventos registrados en la app el día de hoy.";
      } else {
        detalles = "Eventos registrados hoy:\n" + Object.entries(conteo).map(([tipo, cant]) => `- ${cant} ${tipo}(s)`).join("\n");
      }
      setResumenEventos(detalles);
    } catch (error) {
      console.error("Error al cargar eventos del día", error);
    }
  };

  const abrirNuevaBitacora = () => {
    setNotas("");
    setFotoB64("");
    setResumenEventos("Cargando eventos del día...");
    setMostrarModal(true);
    cargarResumenDelDia();
  };

  // Compresión de imagen usando Canvas
  const procesarFoto = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;
        let width = img.width;
        let height = img.height;

        if (width > height) {
          if (width > MAX_WIDTH) {
            height *= MAX_WIDTH / width;
            width = MAX_WIDTH;
          }
        } else {
          if (height > MAX_HEIGHT) {
            width *= MAX_HEIGHT / height;
            height = MAX_HEIGHT;
          }
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, width, height);
        // Comprimir a JPEG con 70% de calidad
        const dataUrl = canvas.toDataURL("image/jpeg", 0.7);
        setFotoB64(dataUrl);
      };
    };
  };

  const guardarBitacora = async (e) => {
    e.preventDefault();
    setGuardando(true);
    const hoy = new Date().toISOString();
    
    try {
      let urlFoto = "";
      // Si hay foto, subirla a Firebase Storage
      if (fotoB64) {
        try {
          const fotoRef = ref(storage, `bitacoras/${usuario.ranchoId}/${Date.now()}.jpg`);
          await uploadString(fotoRef, fotoB64, 'data_url');
          urlFoto = await getDownloadURL(fotoRef);
        } catch (storageError) {
          console.error("Error al subir foto:", storageError);
          alert("Aviso: No se pudo guardar la foto. Se guardará solo con el texto.");
        }
      }

      await addDoc(collection(db, "bitacoras"), {
        ranchoId: usuario.ranchoId,
        autorId: usuario.uid,
        autorNombre: usuario.nombre || usuario.correo,
        fecha: hoy,
        resumenSistema: resumenEventos,
        notasLocales: notas,
        fotoUrl: urlFoto
      });

      setMostrarModal(false);
    } catch (error) {
      console.error("Error al guardar bitácora:", error);
      alert("Hubo un error al guardar la bitácora.");
    }
    setGuardando(false);
  };

  const compartirBitacoraWA = (bitacora) => {
    const textoCompartir = `*Bitácora del Rancho - ${format(new Date(bitacora.fecha), "dd MMM yyyy", { locale: es })}*\n\n` +
                           `*Autor:* ${bitacora.autorNombre}\n\n` +
                           `*Reporte del Sistema:*\n${bitacora.resumenSistema}\n\n` +
                           `*Notas del Encargado:*\n${bitacora.notasLocales || "Ninguna"}` +
                           (bitacora.fotoUrl ? `\n\n*Foto adjunta:* ${bitacora.fotoUrl}` : "");
    
    if (navigator.share) {
      navigator.share({ title: 'Bitácora Diaria', text: textoCompartir }).catch(console.error);
    } else {
      window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(textoCompartir)}`, "_blank");
    }
  };

  const compartirBitacoraCorreo = (bitacora) => {
    const asunto = `Bitácora Diaria - ${format(new Date(bitacora.fecha), "dd MMM yyyy", { locale: es })}`;
    const textoCompartir = `Bitácora del Rancho\n\n` +
                           `Autor: ${bitacora.autorNombre}\n\n` +
                           `Reporte del Sistema:\n${bitacora.resumenSistema}\n\n` +
                           `Notas del Encargado:\n${bitacora.notasLocales || "Ninguna"}` +
                           (bitacora.fotoUrl ? `\n\nFoto adjunta: ${bitacora.fotoUrl}` : "");
    
    window.location.href = `mailto:?subject=${encodeURIComponent(asunto)}&body=${encodeURIComponent(textoCompartir)}`;
  };

  return (
    <div className="dashboard-container">
      <Header subtitle="Registro y reportes diarios del rancho." logo={require("../assets/logo_ganado.jpg")}>
        <button className="btn-primary" onClick={abrirNuevaBitacora} style={{ display: "flex", alignItems: "center", gap: "6px", margin: 0, width: "auto" }}>
          <Plus size={18} /> Nueva Bitácora
        </button>
      </Header>

      <div style={{ padding: "20px" }}>
        {cargando ? (
          <p>Cargando bitácoras...</p>
        ) : bitacoras.length === 0 ? (
          <div style={{ textAlign: "center", padding: "40px", color: "#6b7280" }}>
            <BookOpen size={48} style={{ margin: "0 auto 10px", opacity: 0.5 }} />
            <h3>No hay bitácoras registradas</h3>
            <p>Crea tu primer reporte diario para mantener al tanto al equipo.</p>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "20px" }}>
            {bitacoras.map(b => (
              <div key={b.id} style={{ background: "#fff", borderRadius: "8px", boxShadow: "0 2px 4px rgba(0,0,0,0.05)", border: "1px solid #e5e7eb", padding: "15px", display: "flex", flexDirection: "column" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px", borderBottom: "1px solid #f3f4f6", paddingBottom: "10px" }}>
                  <strong>{format(new Date(b.fecha), "dd MMM yyyy - HH:mm", { locale: es })}</strong>
                  <span style={{ fontSize: "12px", color: "#6b7280" }}>{b.autorNombre}</span>
                </div>
                
                <div style={{ flex: 1, fontSize: "14px", color: "#374151" }}>
                  <p style={{ whiteSpace: "pre-line", marginBottom: "10px" }}><strong>Automático:</strong><br/>{b.resumenSistema}</p>
                  {b.notasLocales && <p style={{ whiteSpace: "pre-line", marginBottom: "10px" }}><strong>Notas:</strong><br/>{b.notasLocales}</p>}
                  
                  {b.fotoUrl && (
                    <img src={b.fotoUrl} alt="Adjunto" style={{ width: "100%", maxHeight: "150px", objectFit: "cover", borderRadius: "6px", marginTop: "10px" }} />
                  )}
                </div>

                <div style={{ display: "flex", gap: "10px", marginTop: "15px" }}>
                  <button className="btn-outline" onClick={() => compartirBitacoraWA(b)} style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center", gap: "6px", borderColor: "#10b981", color: "#10b981" }}>
                    <Send size={16} /> WhatsApp
                  </button>
                  <button className="btn-outline" onClick={() => compartirBitacoraCorreo(b)} style={{ flex: 1, display: "flex", justifyContent: "center", alignItems: "center", gap: "6px", borderColor: "#3b82f6", color: "#3b82f6" }}>
                    <FileText size={16} /> Correo
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {mostrarModal && (
        <div style={{ position: "fixed", top: 0, left: 0, width: "100%", height: "100%", backgroundColor: "rgba(0,0,0,0.5)", display: "flex", justifyContent: "center", alignItems: "center", zIndex: 1000, padding: "20px", boxSizing: "border-box" }}>
          <div style={{ backgroundColor: "#fff", padding: "25px", borderRadius: "12px", width: "100%", maxWidth: "500px", maxHeight: "90vh", overflowY: "auto", position: "relative" }}>
            <button onClick={() => setMostrarModal(false)} style={{ position: "absolute", top: "15px", right: "15px", background: "none", border: "none", cursor: "pointer", color: "#6b7280" }}>
              <X size={24} />
            </button>
            
            <h2 style={{ marginTop: 0, marginBottom: "20px", fontSize: "20px", color: "#111827", display: "flex", alignItems: "center", gap: "8px" }}>
              <BookOpen size={20} /> Bitácora del Día
            </h2>

            <form onSubmit={guardarBitacora}>
              <div style={{ marginBottom: "15px", padding: "10px", backgroundColor: "#f3f4f6", borderRadius: "6px", fontSize: "14px" }}>
                <strong>Resumen automático del sistema:</strong>
                <p style={{ whiteSpace: "pre-line", margin: "5px 0 0", color: "#4b5563" }}>{resumenEventos}</p>
              </div>

              <div style={{ marginBottom: "15px" }}>
                <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold", fontSize: "14px", color: "#374151" }}>Notas del Encargado (Opcional)</label>
                <textarea 
                  value={notas} 
                  onChange={(e) => setNotas(e.target.value)}
                  placeholder="Reporta incidencias, clima, o cosas que no están en la app..."
                  style={{ width: "100%", padding: "10px", borderRadius: "6px", border: "1px solid #d1d5db", minHeight: "80px", boxSizing: "border-box", resize: "vertical" }}
                />
              </div>

              <div style={{ marginBottom: "20px" }}>
                <label style={{ display: "block", marginBottom: "5px", fontWeight: "bold", fontSize: "14px", color: "#374151" }}>Foto Adjunta (Opcional)</label>
                {!fotoB64 ? (
                  <button type="button" onClick={() => fileInputRef.current.click()} style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", width: "100%", padding: "20px", border: "2px dashed #d1d5db", borderRadius: "8px", background: "none", cursor: "pointer", color: "#6b7280" }}>
                    <Camera size={32} style={{ marginBottom: "8px" }} />
                    <span>Tomar o subir foto</span>
                  </button>
                ) : (
                  <div style={{ position: "relative" }}>
                    <img src={fotoB64} alt="Previa" style={{ width: "100%", maxHeight: "200px", objectFit: "cover", borderRadius: "8px" }} />
                    <button type="button" onClick={() => setFotoB64("")} style={{ position: "absolute", top: "10px", right: "10px", background: "rgba(0,0,0,0.6)", color: "#fff", border: "none", borderRadius: "50%", width: "30px", height: "30px", display: "flex", justifyContent: "center", alignItems: "center", cursor: "pointer" }}>
                      <X size={16} />
                    </button>
                  </div>
                )}
                <input type="file" accept="image/*" capture="environment" ref={fileInputRef} onChange={procesarFoto} style={{ display: "none" }} />
              </div>

              <button type="submit" disabled={guardando} className="btn-primary" style={{ width: "100%", padding: "12px", display: "flex", justifyContent: "center", alignItems: "center", gap: "8px" }}>
                {guardando ? "Guardando..." : <><CheckCircle2 size={18} /> Guardar Bitácora</>}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}