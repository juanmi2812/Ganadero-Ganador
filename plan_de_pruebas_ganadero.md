# Guía de Pruebas Rápidas: Ganadero Ganador

Bienvenido a la versión final de **Ganadero Ganador**. Esta guía está diseñada para que evalúes el potencial real de la herramienta en menos de 10 minutos, comprobando cómo la plataforma no solo cuenta animales, sino que administra la rentabilidad de tu rancho.

Sigue estos 5 pasos clave para simular un escenario de la vida real.

---

### Paso 1: Configurar el Algoritmo (30 segundos)
Antes de revisar el ganado, vamos a decirle al sistema cuánto nos cuesta operar.
1. Haz clic en **"Configuración"** en el menú superior.
2. Ingresa un **Costo Diario de Mantenimiento** por categoría. (Ej. *¿Cuánto te cuesta alimentar/mantener a un Becerro al día? Ponle $30. ¿Y a una Vaca? $60*).
3. En la sección comercial, pon el **Precio Actual del Kilo en Pie** en el mercado ($55) y a qué peso planeas vender a tus toretes (450 kg).
4. Dale a **Actualizar Algoritmo**.

> [!TIP]
> **¿Qué logramos?** El sistema multiplicará mágicamente estos centavos por todos los días que cada animal ha estado en tu rancho, entregándote tu **costo total acumulado** automático.

---

### Paso 2: Registrar un Animal  (1 minuto)
1. Ve a la pestaña **"+ Registrar"**.
2. Llena un registro de prueba. Asegúrate de ponerle fecha de nacimiento de **hace 5 meses** y pon que es "Macho" (Becerro).
3. Haz otro registro, pero con fecha de nacimiento de **hace 5 años**, pon que es "Hembra" y que "No ha parido". 
4. Dale Guardar.

---

### Paso 3: Identificar a las Infecundas (Alertas de Productividad)
1. Ve a tu pestaña principal **"Mi Ganado"**.
2. Busca la hembra de 5 años que acabas de crear. ¡Sorpresa! El motor inteligente la detectó automáticamente, la subió a categoría "Novillona" y su tarjeta estará pintada en rojo marcando: `Alerta: Revisión de Fertilidad`.
3. Haz clic en ella para ver su **Ficha Técnica**.
4. Ahora, baja al panel de **Rentabilidad Acumulada** (en verde/rojo). Verás plasmado exactamente **cuánto dinero** te has gastado en mantener viva a esa hembra en los últimos 5 años, con un mensaje directo: *Pérdida por infertilidad (Descarte recomendado)*.

---

### Paso 4: Sumar Gastos Médicos y Desechar (2 minutos)
Vamos simular que decides no preñarla y prefieres venderla.
1. Sin salir de la Ficha Técnica de la hembra roja, presiona el botón naranja **"🗑️ Descartar"**.
2. Su estado cambiará inmediatamente a **Desecho**. Esto la saca definitivamente de las estadísticas reproductivas para no manchar tu historial.
3. Ahora vuelve a la vista de **"Mi Ganado"** y busca el becerro que registraste. Abre su Ficha Técnica.
4. Presiona el botón azul **"+ Evento"**.
5. Selecciona "Vacunación" o "Tratamiento Médico" como tipo.
6. Notarás un nuevo campo: **Costo del Insumo Médico ($)**. Escribe "$800" y guarda el evento.
7. Revisa su panel financiero. Notarás cómo el costo de las vacunas se le acaba de inyectar de por vida a su registro contable.

---

### Paso 5: Magia Gerencial (El Tablero de Control)
Llegó el momento de ver la película completa de toda tu empresa.
1. Ve a la pestaña **"Reportes BI"**.
2. Arriba a la derecha verás un interruptor estilo celular. De entrada, los gráficos muestran "Volumen de Cabezas" (en tonos blancos y azules).
3. **Haz clic en el interruptor de "Finanzas ($)"**.
4. ¡Boom! Todos tus KPIs y gráficas cambian radicalmente. Ya no verás cantidad de animales, verás **Cantidad de Dinero Invertido** agrupado por genética y categoría.
5. Finalmente, juega con la barra selectora de **"Estatus"** y selecciona: *Disponibles para Venta*. La plataforma juntará a los Toretes comerciales y a las Vacas que acabas de marcar como "Desecho".

> [!NOTE]
> ¡Felicidades! Acabas de probar el ciclo de vida completo: desde el registro diario en campo hasta la consolidación financiera gerencial. ¡La base de datos está automatizada y lista para escalarse a miles de cabezas!
