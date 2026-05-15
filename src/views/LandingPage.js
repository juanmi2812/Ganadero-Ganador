import React, { useState } from 'react';
import {
  BarChart3,
  WifiOff,
  Map as MapIcon,
  Clock,
  ChevronRight,
  CheckCircle2,
  Phone,
  Mail,
  User,
  MapPin,
  Tractor,
  Layers
} from 'lucide-react';
import { db } from '../firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import logoConvivet from '../assets/logo_convivet.jpg';
import appDashboardMockup from '../assets/app_dashboard_mockup.png';
import appReportsMockup from '../assets/app_reports_mockup.png';

export default function LandingPage({ onLoginClick }) {
  const [formData, setFormData] = useState({
    nombre: '',
    telefono: '',
    correo: '',
    ciudad: '',
    tamano: '',
    actividad: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitSuccess, setSubmitSuccess] = useState(false);

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      await addDoc(collection(db, "leads_landing"), {
        ...formData,
        fecha: serverTimestamp()
      });
      setSubmitSuccess(true);
      setFormData({
        nombre: '', telefono: '', correo: '', ciudad: '', tamano: '', actividad: ''
      });
    } catch (error) {
      console.error("Error guardando lead:", error);
      alert("Hubo un error al enviar tus datos. Por favor, intenta de nuevo.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="landing-container">
      {/* HEADER */}
      <header className="landing-header">
        <div className="landing-logo">
          <img src={logoConvivet} alt="Ganadero Ganador" />
          <span>Ganadero Ganador</span>
        </div>
        <button onClick={onLoginClick} className="btn-login-outline">
          Iniciar Sesión
        </button>
      </header>

      {/* HERO SECTION */}
      <section className="hero-section">
        <div className="hero-grid">
          <div className="hero-content">
            <div className="badge-beta">🚀 Early Access - Cupos Limitados</div>
            <h1 className="hero-title">
              Toma el Control Total de tu Rancho. <br />
              <span className="text-highlight">Adiós a las libretas.</span>
            </h1>
            <p className="hero-subtitle">
              Registra pesajes, controla la reproducción (IEP), gestiona potreros y obtén reportes financieros al instante desde tu celular, incluso sin internet.
            </p>
            <div className="hero-actions">
              <a href="#contacto" className="btn-primary-large">
                Solicitar Demostración <ChevronRight size={20} />
              </a>
            </div>
          </div>
          <div className="hero-image-wrapper">
            <img src={appDashboardMockup} alt="Ganadero Ganador Dashboard" className="hero-mockup" />
          </div>
        </div>
      </section>

      {/* BENEFICIOS GRID */}
      <section className="benefits-section">
        <div className="section-title">
          <h2>Todo lo que necesitas en tu bolsillo</h2>
          <p>Un asistente digital diseñado específicamente para ganaderos exitosos.</p>
        </div>

        <div className="benefits-grid">
          <div className="benefit-card">
            <div className="icon-wrapper green"><Clock size={28} /></div>
            <h3>Control Reproductivo</h3>
            <p>Calcula automáticamente el Intervalo Entre Partos (IEP) y recibe alertas de palpación y secado para evitar tener vacas vacías.</p>
          </div>

          <div className="benefit-card">
            <div className="icon-wrapper blue"><BarChart3 size={28} /></div>
            <h3>Reportes BI y Finanzas</h3>
            <p>Gráficos de productividad de leche, ingresos y egresos. Conoce exactamente cuánto estás ganando o perdiendo a un clic de distancia.</p>
          </div>

          <div className="benefit-card">
            <div className="icon-wrapper orange"><MapIcon size={28} /></div>
            <h3>Gestión de Potreros</h3>
            <p>Visualiza tu rancho, controla los aforos, el tiempo de descanso y la rotación estratégica de tus animales.</p>
          </div>

          <div className="benefit-card">
            <div className="icon-wrapper gray"><WifiOff size={28} /></div>
            <h3>Trabaja Sin Internet</h3>
            <p>¿No hay señal en el rancho? No hay problema. Registra todo en el campo y la app se sincronizará automáticamente al llegar a casa.</p>
          </div>
        </div>
      </section>

      {/* APP PREVIEW SECTION */}
      <section className="app-preview-section">
        <div className="section-title">
          <h2>Una experiencia de usuario superior</h2>
          <p>Diseñada para ser rápida, intuitiva y verse increíble.</p>
        </div>
        <div className="preview-grid">
          <div className="preview-item">
            <img src={appDashboardMockup} alt="Gestión de Ganado" className="preview-image" />
            <div className="preview-caption">
              <h3>Gestión Individual</h3>
              <p>Fichas completas por animal con su historial médico, pesajes y estado reproductivo.</p>
            </div>
          </div>
          <div className="preview-item">
            <img src={appReportsMockup} alt="Reportes y Analíticas" className="preview-image" />
            <div className="preview-caption">
              <h3>Analítica Avanzada</h3>
              <p>Gráficos hermosos de Intervalo Entre Partos (IEP) y métricas financieras.</p>
            </div>
          </div>
        </div>
      </section>

      {/* LEAD CAPTURE FORM */}
      <section id="contacto" className="lead-section">
        <div className="lead-container">
          <div className="lead-text">
            <h2>Únete a los ganaderos pioneros</h2>
            <p>Actualmente estamos en fase de Beta Privada. Déjanos tus datos para darte acceso anticipado y mostrarte cómo rentabilizar tu rancho.</p>
            <ul className="lead-features">
              <li><CheckCircle2 size={18} className="text-green-500" /> Demo personalizada gratuita</li>
              <li><CheckCircle2 size={18} className="text-green-500" /> Soporte directo</li>
              <li><CheckCircle2 size={18} className="text-green-500" /> Precios especiales de lanzamiento</li>
            </ul>
          </div>

          <div className="lead-form-box">
            {submitSuccess ? (
              <div className="success-message">
                <CheckCircle2 size={48} className="success-icon" />
                <h3>¡Datos enviados con éxito!</h3>
                <p>Nos pondremos en contacto contigo muy pronto para mostrarte la app.</p>
                <button onClick={() => setSubmitSuccess(false)} className="btn-secondary mt-4">
                  Enviar otro registro
                </button>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="lead-form">
                <div className="input-group">
                  <User size={18} />
                  <input type="text" name="nombre" placeholder="Nombre completo" value={formData.nombre} onChange={handleChange} required />
                </div>
                <div className="input-group">
                  <Phone size={18} />
                  <input type="tel" name="telefono" placeholder="Teléfono / WhatsApp" value={formData.telefono} onChange={handleChange} required />
                </div>
                <div className="input-group">
                  <Mail size={18} />
                  <input type="email" name="correo" placeholder="Correo electrónico" value={formData.correo} onChange={handleChange} required />
                </div>
                <div className="input-group">
                  <MapPin size={18} />
                  <input type="text" name="ciudad" placeholder="Ciudad y Estado" value={formData.ciudad} onChange={handleChange} required />
                </div>

                <div className="input-row">
                  <div className="select-group">
                    <Layers size={18} />
                    <select name="tamano" value={formData.tamano} onChange={handleChange} required>
                      <option value="" disabled>Tamaño del hato</option>
                      <option value="1-50">1 - 50 cabezas</option>
                      <option value="50-200">50 - 200 cabezas</option>
                      <option value="200+">Más de 200 cabezas</option>
                    </select>
                  </div>
                  <div className="select-group">
                    <Tractor size={18} />
                    <select name="actividad" value={formData.actividad} onChange={handleChange} required>
                      <option value="" disabled>Actividad Principal</option>
                      <option value="Leche">Leche</option>
                      <option value="Carne">Carne</option>
                      <option value="Doble Propósito">Doble Propósito</option>
                    </select>
                  </div>
                </div>

                <button type="submit" className="btn-submit-lead" disabled={isSubmitting}>
                  {isSubmitting ? 'Enviando...' : 'Quiero mi acceso'}
                </button>
              </form>
            )}
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="landing-footer">
        <p>&copy; {new Date().getFullYear()} Ganadero Ganador. Todos los derechos reservados.</p>
      </footer>
    </div>
  );
}
