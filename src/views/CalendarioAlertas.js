import React, { useState, useEffect } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";

// Importaciones para el Calendario Visual
import { Calendar, dateFnsLocalizer } from "react-big-calendar";
import { format, parse, startOfWeek, getDay } from "date-fns";
import { es } from "date-fns/locale";
import "react-big-calendar/lib/css/react-big-calendar.css";

const locales = {
  es: es,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

export default function CalendarioAlertas() {
  const [eventosCalendario, setEventosCalendario] = useState([]);

  // --- NUEVOS ESTADOS PARA CONTROLAR LOS BOTONES ---
  const [vista, setVista] = useState("month");
  const [fechaActual, setFechaActual] = useState(new Date());

  useEffect(() => {
    const cancelarAlertas = onSnapshot(
      collection(db, "alertas"),
      (snapshot) => {
        const alertasData = snapshot.docs
          .map((doc) => {
            const data = doc.data();
            if (!data.fechaProgramada) return null;

            const [year, month, day] = data.fechaProgramada.split("-");
            const dateObj = new Date(year, month - 1, day);

            return {
              id: doc.id,
              title: `🔔 Alerta: ${data.titulo} (${data.areteAnimal})`,
              start: dateObj,
              end: dateObj,
              allDay: true,
              tipo: "alerta",
              completada: data.completada,
            };
          })
          .filter(Boolean);

        const cancelarEventos = onSnapshot(
          collection(db, "eventos"),
          (snapEventos) => {
            const eventosData = snapEventos.docs
              .map((doc) => {
                const data = doc.data();
                if (!data.fecha) return null;

                const [year, month, day] = data.fecha.split("-");
                const dateObj = new Date(year, month - 1, day);

                return {
                  id: doc.id,
                  title: `🐄 ${data.tipo}: ${data.resultado}`,
                  start: dateObj,
                  end: dateObj,
                  allDay: true,
                  tipo: "evento",
                };
              })
              .filter(Boolean);

            setEventosCalendario([...alertasData, ...eventosData]);
          }
        );

        return () => cancelarEventos();
      }
    );

    return () => cancelarAlertas();
  }, []);

  const estiloDeEventos = (event) => {
    let backgroundColor = "#3b82f6";
    if (event.tipo === "alerta") {
      backgroundColor = event.completada ? "#10b981" : "#f59e0b";
    }
    return {
      style: {
        backgroundColor,
        borderRadius: "6px",
        color: "white",
        border: "none",
        display: "block",
        padding: "4px",
        fontSize: "12px",
      },
    };
  };

  return (
    <div className="dashboard-container" style={{ padding: "0 16px" }}>
      <div className="header">
        <h1>Calendario General</h1>
        <p>
          Visualiza el historial de actividades y las próximas alertas
          programadas.
        </p>
      </div>

      <div
        className="login-card"
        style={{
          maxWidth: "100%",
          width: "100%",
          margin: "0",
          padding: "24px",
          boxSizing: "border-box",
          height: "700px",
        }}
      >
        <Calendar
          localizer={localizer}
          events={eventosCalendario}
          startAccessor="start"
          endAccessor="end"
          style={{ height: "100%" }}
          culture="es"
          messages={{
            next: "Sig",
            previous: "Ant",
            today: "Hoy",
            month: "Mes",
            week: "Semana",
            day: "Día",
          }}
          eventPropGetter={estiloDeEventos}
          // --- CONEXIÓN DE LOS BOTONES ---
          view={vista}
          onView={(nuevaVista) => setVista(nuevaVista)}
          date={fechaActual}
          onNavigate={(nuevaFecha) => setFechaActual(nuevaFecha)}
        />
      </div>
    </div>
  );
}
