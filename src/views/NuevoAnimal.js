import React, { useState, useEffect } from "react";
import { CheckCircle2 } from "lucide-react";
import { collection, addDoc, onSnapshot, query, where } from "firebase/firestore";
import { db } from "../firebase";

export default function NuevoAnimal({ usuario }) {
  const [exito, setExito] = useState(false);
  const [vientres, setVientres] = useState([]);
  const [sementales, setSementales] = useState([]);

  const [datosFormulario, setDatosFormulario] = useState({
    nombre: "",
    arete: "",
    areteRancho: "",
    tipo: "Desarrollo",
    sexo: "Hembra",
    raza: "",
    peso: "",
    fechaNacimiento: "",
    madre: "",
    padre: "",
    potrero: "",
    grupo: "",
  });

  const [potreros, setPotreros] = useState([]);
  const [grupos, setGrupos] = useState([]);
  
  const [potrerosInventario, setPotrerosInventario] = useState([]);
  const [gruposInventario, setGruposInventario] = useState([]);

  // Cargamos las listas de madres y padres existentes
  useEffect(() => {
    if (!usuario?.ranchoId) return;
    const cancelarSuscripcion = onSnapshot(
      query(collection(db, "animales"), where("ranchoId", "==", usuario.ranchoId)),
      (snapshot) => {
        const lista = snapshot.docs.map((doc) => ({
          id: doc.id,
          ...doc.data(),
        }));
        setVientres(
          lista.filter(
            (a) => {
              const isFemale = a.sexo?.toLowerCase() === "hembra" || ["Vaca", "Novillona", "Vientre", "Becerra"].includes(a.tipo);
              return isFemale && !a.estado?.includes("Baja");
            }
          )
        );
        setSementales(
          lista.filter(
            (a) => a.tipo === "Semental" && !a.estado?.includes("Baja")
          )
        );
        
        // Extraer potreros y grupos dinámicos del inventario
        const potrerosInv = [...new Set(lista.map(a => a.potrero || a.hectarea).filter(Boolean))];
        const gruposInv = [...new Set(lista.map(a => a.grupo).filter(Boolean))];
        
        // Guardarlos temporalmente en variables o directamente en un state si quisieramos,
        // pero mejor lo combinaremos cuando lleguen de la colección
        setPotrerosInventario(potrerosInv);
        setGruposInventario(gruposInv);
      }
    );
    
    // Cargar potreros y grupos
    const unsubPotreros = onSnapshot(query(collection(db, "potreros"), where("ranchoId", "==", usuario.ranchoId)), (snap) => {
      setPotreros(snap.docs.map(doc => doc.data()));
    });
    const unsubGrupos = onSnapshot(query(collection(db, "grupos"), where("ranchoId", "==", usuario.ranchoId)), (snap) => {
      setGrupos(snap.docs.map(doc => doc.data()));
    });

    return () => {
      cancelarSuscripcion();
      unsubPotreros();
      unsubGrupos();
    };
  }, [usuario]);

  const manejarCambio = (e) => {
    setDatosFormulario({ ...datosFormulario, [e.target.name]: e.target.value });
  };

  const guardarAnimal = async (e) => {
    e.preventDefault();

    const animalNuevo = {
      nombre: datosFormulario.nombre || "",
      arete: datosFormulario.arete,
      areteRancho: datosFormulario.areteRancho || "",
      tipo: datosFormulario.tipo,
      sexo: datosFormulario.sexo,
      raza: datosFormulario.raza,
      peso: `${datosFormulario.peso} kg`,
      fechaNacimiento: datosFormulario.fechaNacimiento,
      madre: datosFormulario.madre, // Guardamos el arete o ID de la madre
      padre: datosFormulario.padre, // Guardamos el arete o ID del padre
      potrero: datosFormulario.potrero || "Sin Asignar",
      grupo: datosFormulario.grupo || "",
      estado: "Sano",
      fechaRegistro: new Date().toISOString(),
      ranchoId: usuario?.ranchoId || null
    };

    try {
      await addDoc(collection(db, "animales"), animalNuevo);
      setExito(true);
      setTimeout(() => {
        setExito(false);
        setDatosFormulario({
          nombre: "",
          arete: "",
          areteRancho: "",
          tipo: "Desarrollo",
          sexo: "Hembra",
          raza: "",
          peso: "",
          fechaNacimiento: "",
          madre: "",
          padre: "",
          potrero: "",
        });
      }, 3000);
    } catch (error) {
      console.error(error);
    }
  };

  return (
    <div className="dashboard-container" style={{ padding: "0 16px" }}>
      <div className="header">
        <h1>Registrar Nuevo Animal</h1>
        <p>
          Vincula crías con sus progenitores para llevar la trazabilidad
          genética.
        </p>
      </div>

      <div
        className="login-card"
        style={{ maxWidth: "600px", margin: "0", textAlign: "left" }}
      >
        {exito && (
          <div
            className="file-status status-success"
            style={{ marginBottom: "20px" }}
          >
            <CheckCircle2 size={20} />
            <span>¡Animal y parentesco registrados en la nube!</span>
          </div>
        )}

        <form onSubmit={guardarAnimal}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "16px",
            }}
          >
            <div className="input-group" style={{ gridColumn: "1 / -1" }}>
              <label>Nombre del Animal (Opcional)</label>
              <input
                type="text"
                name="nombre"
                value={datosFormulario.nombre}
                onChange={manejarCambio}
                placeholder="Ej: La Pinta, El Toro"
              />
            </div>
            <div className="input-group">
              <label>Arete Oficial (SINIIGA)</label>
              <input
                type="text"
                name="arete"
                value={datosFormulario.arete}
                onChange={manejarCambio}
                required
              />
            </div>

            <div className="input-group">
              <label>Arete Rancho</label>
              <input
                type="text"
                name="areteRancho"
                value={datosFormulario.areteRancho}
                onChange={manejarCambio}
              />
            </div>

            <div className="input-group">
              <label>Tipo (Categoría Inicial)</label>
              <select
                name="tipo"
                value={datosFormulario.tipo}
                onChange={manejarCambio}
              >
                <option value="Desarrollo">Desarrollo (Cría)</option>
                <option value="Vientre">Vientre (Hembra)</option>
                <option value="Semental">Semental (Macho)</option>
              </select>
            </div>

            <div className="input-group">
              <label>Sexo</label>
              <select
                name="sexo"
                value={datosFormulario.sexo}
                onChange={manejarCambio}
                required
              >
                <option value="Hembra">Hembra</option>
                <option value="Macho">Macho</option>
              </select>
            </div>

            <div className="input-group">
              <label>Raza</label>
              <input
                type="text"
                name="raza"
                value={datosFormulario.raza}
                onChange={manejarCambio}
                required
              />
            </div>

            <div className="input-group">
              <label>Peso Inicial (kg)</label>
              <input
                type="number"
                name="peso"
                value={datosFormulario.peso}
                onChange={manejarCambio}
                required
              />
            </div>

            {/* SELECCIÓN DE PADRES */}
            <div className="input-group">
              <label>Madre (Vientre)</label>
              <select
                name="madre"
                value={datosFormulario.madre}
                onChange={manejarCambio}
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: "6px",
                  border: "1px solid #d1d5db",
                }}
              >
                <option value="">-- Seleccionar --</option>
                {vientres.map((v) => (
                  <option key={v.id} value={v.arete || v.id}>
                    {v.arete || v.nombre || "Sin Arete"} ({v.raza || "Sin Raza"})
                  </option>
                ))}
              </select>
            </div>

            <div className="input-group">
              <label>Padre (Semental)</label>
              <select
                name="padre"
                value={datosFormulario.padre}
                onChange={manejarCambio}
                style={{
                  width: "100%",
                  padding: "12px",
                  borderRadius: "6px",
                  border: "1px solid #d1d5db",
                }}
              >
                <option value="">-- Seleccionar --</option>
                {sementales.map((s) => (
                  <option key={s.id} value={s.arete || s.id}>
                    {s.arete || s.nombre || "Sin Arete"} ({s.raza || "Sin Raza"})
                  </option>
                ))}
              </select>
            </div>

            <div className="input-group">
              <label>Potrero de Ubicación</label>
              <select
                name="potrero"
                value={datosFormulario.potrero}
                onChange={manejarCambio}
                style={{ width: "100%", padding: "12px", borderRadius: "6px", border: "1px solid #d1d5db" }}
              >
                <option value="">Sin Asignar</option>
                {[...new Set([...potreros.map(p => p.nombre), ...potrerosInventario])].sort().map(pot => (
                  <option key={pot} value={pot}>{pot}</option>
                ))}
              </select>
            </div>
            
            <div className="input-group">
              <label>Grupo de Manejo (Clasificación)</label>
              <select
                name="grupo"
                value={datosFormulario.grupo}
                onChange={manejarCambio}
                style={{ width: "100%", padding: "12px", borderRadius: "6px", border: "1px solid #d1d5db" }}
              >
                <option value="">Sin Grupo</option>
                {[...new Set([...grupos.map(g => g.nombre), ...gruposInventario])].sort().map(g => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </div>

            <div className="input-group">
              <label>Fecha de Nacimiento (Calcula automáticamente la categoría)</label>
              <input
                type="date"
                name="fechaNacimiento"
                value={datosFormulario.fechaNacimiento}
                onChange={manejarCambio}
                required
              />
            </div>
          </div>

          <button
            type="submit"
            className="btn-primary"
            style={{ marginTop: "24px" }}
          >
            Guardar con Genealogía
          </button>
        </form>
      </div>
    </div>
  );
}
