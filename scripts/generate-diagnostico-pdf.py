#!/usr/bin/env python3
"""Genera el PDF diagnóstico IL-BARBIERE-AS con mapa y 3 opciones de implementación."""

import weasyprint

TITLE = "Diagnóstico IL-BARBIERE-AS — Mapa de solución mensajería y CRM"
SUBTITLE = "Preparado para Fede y Santi · Septiembre 2026"

CSS = """
@page {
    size: A4;
    margin: 2.5cm 2cm;
    @bottom-center {
        content: counter(page) " / " counter(pages);
        font-size: 8pt;
        color: #888;
        font-family: 'Helvetica', 'Arial', sans-serif;
    }
}

body {
    font-family: 'Helvetica', 'Arial', sans-serif;
    font-size: 10pt;
    line-height: 1.6;
    color: #1a1a1a;
    margin: 0;
    padding: 0;
}

/* Cover page */
.cover {
    page-break-after: always;
    text-align: center;
    padding-top: 120px;
}

.cover .subtitle {
    font-size: 11pt;
    color: #666;
    text-transform: uppercase;
    letter-spacing: 3pt;
    margin-bottom: 20px;
}

.cover h1 {
    font-size: 22pt;
    font-weight: 800;
    line-height: 1.3;
    margin: 0 0 15px 0;
    color: #0a0a0a;
}

.cover .accent {
    color: #00c8c8;
}

.cover .meta {
    margin-top: 50px;
    font-size: 10pt;
    color: #555;
    line-height: 2;
}

.cover .score-box {
    display: inline-block;
    margin: 40px auto;
    padding: 20px 40px;
    border: 2px solid #00c8c8;
    border-radius: 12px;
    font-size: 36pt;
    font-weight: 900;
    color: #00c8c8;
}

.cover .score-label {
    font-size: 8pt;
    letter-spacing: 2pt;
    text-transform: uppercase;
    color: #888;
    margin-top: 5px;
}

/* Section headers */
h2 {
    font-size: 14pt;
    font-weight: 800;
    color: #0a0a0a;
    border-bottom: 3px solid #00c8c8;
    padding-bottom: 6px;
    margin-top: 30px;
    page-break-before: always;
}

h2.nobreak {
    page-break-before: avoid;
}

h3 {
    font-size: 11pt;
    font-weight: 700;
    color: #0a0a0a;
    margin-top: 20px;
}

/* Score table */
table.scores {
    width: 100%;
    border-collapse: collapse;
    margin: 15px 0;
    font-size: 9.5pt;
}

table.scores th, table.scores td {
    padding: 8px 10px;
    text-align: left;
    border-bottom: 1px solid #ddd;
    vertical-align: top;
}

table.scores th {
    background: #0a0a0a;
    color: white;
    font-weight: 700;
    font-size: 8pt;
    letter-spacing: 1pt;
    text-transform: uppercase;
}

table.scores tr:nth-child(even) td {
    background: #f5f5f5;
}

table.scores .score-col {
    text-align: center;
    font-weight: 700;
    width: 40px;
}

/* Cards for 3 options */
.option-grid {
    display: flex;
    gap: 12px;
    margin: 20px 0;
    page-break-inside: avoid;
}

.option-card {
    flex: 1;
    border: 1.5px solid #ddd;
    border-radius: 10px;
    padding: 16px;
    font-size: 9pt;
    page-break-inside: avoid;
}

.option-card.recommended {
    border-color: #00c8c8;
    border-width: 2.5px;
    background: #f0fdfd;
    position: relative;
}

.option-card .badge {
    display: inline-block;
    font-size: 7pt;
    font-weight: 700;
    letter-spacing: 1.5pt;
    text-transform: uppercase;
    padding: 3px 8px;
    border-radius: 4px;
    margin-bottom: 8px;
}

.option-card .badge.min {
    background: #eee;
    color: #666;
}

.option-card .badge.rec {
    background: #00c8c8;
    color: white;
}

.option-card .badge.full {
    background: #0a0a0a;
    color: white;
}

.option-card h4 {
    font-size: 11pt;
    font-weight: 800;
    margin: 0 0 6px 0;
}

.option-card .price {
    font-size: 14pt;
    font-weight: 900;
    color: #0a0a0a;
    margin: 8px 0;
}

.option-card .price-note {
    font-size: 7.5pt;
    color: #888;
}

.option-card ul {
    margin: 8px 0 0 0;
    padding-left: 16px;
}

.option-card li {
    margin-bottom: 4px;
    font-size: 8.5pt;
}

/* Process diagram - ASCII art in monospace */
.diagram-box {
    background: #0a0a0a;
    color: #00c8c8;
    font-family: 'Courier New', monospace;
    font-size: 8pt;
    line-height: 1.5;
    padding: 20px;
    border-radius: 8px;
    margin: 15px 0;
    white-space: pre;
    page-break-inside: avoid;
}

/* Info box */
.info-box {
    background: #f0fdfd;
    border-left: 4px solid #00c8c8;
    padding: 14px 16px;
    margin: 15px 0;
    border-radius: 4px;
    font-size: 9.5pt;
}

.info-box strong {
    color: #0a0a0a;
}

/* Footer */
.footer {
    margin-top: 40px;
    padding-top: 20px;
    border-top: 1px solid #ddd;
    font-size: 8pt;
    color: #888;
    text-align: center;
}
"""

COVER_HTML = """
<div class="cover">
    <div class="subtitle">Documento de diagnóstico</div>
    <h1>
        <span class="accent">IL BARBIERE</span><br>
        Mapa de solución<br>
        mensajería y CRM
    </h1>
    <div class="score-box">
        11
        <div class="score-label">puntos sobre 24</div>
    </div>
    <div class="meta">
        <strong>Preparado para:</strong> Fede y Santi · IL BARBIERE AS<br>
        <strong>Fecha:</strong> Septiembre 2026<br>
        <strong>Metodología:</strong> Cuestionario de diagnóstico 12 preguntas
    </div>
</div>
"""

CONTENT_HTML = """
<h2 class="nobreak">1. El diagnóstico — lo que encontramos</h2>

<p>
IL BARBIERE AS tiene la reserva digital resuelta (la app anda). Pero la comunicación con el cliente
después de la reserva es completamente manual: cada turno requiere que el barbero escriba un mensaje
de WhatsApp, sin dejar rastro, sin confirmación automática, sin recordatorios.
</p>

<table class="scores">
<tr><th>#</th><th>Pregunta</th><th>Pts</th></tr>
<tr>
    <td class="score-col">1</td>
    <td>¿Qué pasa desde que entra un cliente hasta que cobran?</td>
    <td class="score-col">1</td>
</tr>
<tr>
    <td class="score-col">2</td>
    <td>¿Cuántas veces al día alguien copia de una pantalla y pega en otra?</td>
    <td class="score-col">1</td>
</tr>
<tr>
    <td class="score-col">3</td>
    <td>Si entran 5× más solicitudes, ¿qué se rompe primero?</td>
    <td class="score-col">2</td>
</tr>
<tr>
    <td class="score-col">4</td>
    <td>¿Quién sabe hacer esto completo?</td>
    <td class="score-col">1</td>
</tr>
<tr>
    <td class="score-col">5</td>
    <td>Cuando dos sistemas no coinciden, ¿cuál manda?</td>
    <td class="score-col">1</td>
</tr>
<tr>
    <td class="score-col">6</td>
    <td>¿Qué información necesitás para decidir y dónde la buscás?</td>
    <td class="score-col">1</td>
</tr>
<tr>
    <td class="score-col">7</td>
    <td>¿Qué tenés que poder demostrar si alguien reclama?</td>
    <td class="score-col">1</td>
</tr>
<tr>
    <td class="score-col">8</td>
    <td>¿Los datos de tus clientes pueden salir de la empresa?</td>
    <td class="score-col">0</td>
</tr>
<tr>
    <td class="score-col">9</td>
    <td>¿Qué decisiones toma una persona y con qué criterio?</td>
    <td class="score-col">1</td>
</tr>
<tr>
    <td class="score-col">10</td>
    <td>¿Qué pasa cuando el cliente escribe algo que no está en el guion?</td>
    <td class="score-col">1</td>
</tr>
<tr>
    <td class="score-col">11</td>
    <td>¿Cuánto tiempo al mes se va en esto y cuánto cuesta?</td>
    <td class="score-col">1</td>
</tr>
<tr>
    <td class="score-col">12</td>
    <td>¿Qué intentaron antes y por qué no funcionó?</td>
    <td class="score-col">1</td>
</tr>
<tr style="font-weight:800; border-top:2px solid #0a0a0a;">
    <td colspan="2">PUNTAJE TOTAL</td>
    <td class="score-col">11 / 24</td>
</tr>
</table>

<h3>Qué significa este puntaje</h3>

<div class="info-box">
<strong>Zona 9–16:</strong> Varios sistemas que no se hablan. No es un bot lo que necesitan.
Es <strong>integración con datos propios, trazabilidad, y automatización de procesos</strong>.
</div>

<h2>2. El mapa del proceso actual</h2>

<p>Esto es lo que pasa hoy con cada turno. En azul lo que ya está automatizado, en blanco lo que sigue siendo manual:</p>

<div class="diagram-box">
  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
  │  Cliente     │     │  Cliente    │     │  Cliente    │     │  Cliente    │
  │  abre app    │──→  │  elige      │──→  │  completa   │──→  │  recibe     │
  │              │     │  barbero/   │     │  nombre +   │     │  ¿?          │
  │              │     │  servicio/  │     │  WhatsApp   │     │              │
  │              │     │  horario    │     │             │     │              │
  └─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
       ✅ Auto               ✅ Auto               ✅ Auto               ❌ Manual
                                                                   (Mensaje WhatsApp
                                                                    escrito a mano)
  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
  │  Llega el   │     │  Se atiende │     │  Se cobra   │
  │  día del    │──→  │             │──→  │             │
  │  turno      │     │             │     │             │
  └─────────────┘     └─────────────┘     └─────────────┘
       ❌ Manual           ✅ Auto              ✅ Auto
  (Recordatorio           (Barbero             (En efectivo/
   manual por             atiende)              MP)
   WhatsApp)
</div>

<p><strong>El problema visible:</strong> el cliente nunca recibe una confirmación formal de su turno. El barbero tiene que acordarse de escribirle.
<strong>El problema invisible:</strong> no queda rastro de qué se le dijo al cliente, ni cuándo, ni si lo leyó.</p>

<h2>3. Las tres opciones de solución</h2>

<div class="option-grid">
    <div class="option-card">
        <div class="badge min">MÍNIMA</div>
        <h4>Confirmación automática</h4>
        <div class="price">$80.000</div>
        <div class="price-note">Pago único · Instalación en 2 días</div>
        <ul>
            <li>Mensaje de WhatsApp automático al cliente cuando reserva</li>
            <li>Template con fecha, hora, barbero y servicio</li>
            <li>Link al comprobante del turno en el mensaje</li>
            <li>Los barberos no escriben más mensajes de confirmación</li>
        </ul>
    </div>
    <div class="option-card recommended">
        <div class="badge rec">RECOMENDADA ✦</div>
        <h4>Confirmación + recordatorios</h4>
        <div class="price">$250.000</div>
        <div class="price-note">Pago único · Instalación en 5 días</div>
        <ul>
            <li>Todo lo de la opción Mínima</li>
            <li>Recordatorio automático 24 horas antes del turno</li>
            <li>Confirmación de lectura: el barbero sabe si el cliente vio el mensaje</li>
            <li>Historial de comunicación por cliente en la base de datos</li>
            <li>Aviso al barbero cuando se reserva un turno nuevo</li>
            <li>Notificación de cancelación automática</li>
            <li>Panel simple para que cada barbero vea sus turnos del día</li>
        </ul>
    </div>
    <div class="option-card">
        <div class="badge full">COMPLETA</div>
        <h4>CRM completo + Dashboard</h4>
        <div class="price">$550.000</div>
        <div class="price-note">Pago único · Instalación en 12 días</div>
        <ul>
            <li>Todo lo de la opción Recomendada</li>
            <li>Chatwoot CRM: todas las conversaciones en un solo lugar</li>
            <li>Base de clientes con historial de turnos, visitas y gasto total</li>
            <li>Clientes frecuentes y VIP marcados automáticamente</li>
            <li>n8n: flujos de automatización para campañas, cumpleaños, promos</li>
            <li>Recordatorios por SMS vía API (sin WhatsApp, para clientes sin datos)</li>
            <li>Dashboard con métricas: turnos por día, cancelaciones, clientes nuevos</li>
            <li>Formulario de encuesta post-atención (NPS) automático</li>
        </ul>
    </div>
</div>

<div class="info-box">
<strong>Nuestra recomendación: la opción del medio</strong> — Confirmación + recordatorios.
Resuelve la queja de los barberos (no escriben más mensajes a mano), el cliente recibe
confirmación y recordatorio, y todo queda registrado. Es la que más valor da por el precio.
</div>

<h2>4. ¿Por qué esta y no un bot de ManyChat?</h2>

<p>
El cuestionario muestra que IL BARBIERE AS no necesita un bot conversacional.
ManyChat y similares venden plantillas de botones para responder preguntas frecuentes.
El problema acá no es "responder preguntas": es <strong>asegurar que cada turno tenga
confirmación verificable, que el cliente llegue, y que el barbero no tenga que escribir
mensajes a mano</strong>. Eso es integración, no un bot de plantilla.
</p>

<h2>5. Próximos pasos</h2>

<ol style="font-weight:600; line-height:2.5;">
    <li>Elegir la opción que quieren (mínima, recomendada o completa)</li>
    <li>Definir el número de WhatsApp Business para el envío (puede ser virtual o uno de la barbería)</li>
    <li>Aprobar el alcance — ajustamos la propuesta final</li>
    <li>Implementación en los tiempos indicados</li>
    <li>Capacitación: 30 minutos para que los dos barberos sepan usarlo</li>
</ol>

<p style="margin-top:30px;">
<em>Los precios son sugeridos. La opción 11 del cuestionario (horas × costo por hora)
define el presupuesto exacto. Si quieren ajustamos la propuesta después de definir el alcance final.</em>
</p>

<div class="footer">
    Adriel-IA Soluciones · Diagnóstico IL BARBIERE AS · Septiembre 2026<br>
    Este documento es confidencial y fue preparado para Fede y Santi.
</div>
"""

FULL_HTML = f"""<!DOCTYPE html>
<html><head><meta charset="utf-8"><style>{CSS}</style></head>
<body>{COVER_HTML}{CONTENT_HTML}</body></html>"""

if __name__ == "__main__":
    doc = weasyprint.HTML(string=FULL_HTML)
    output_path = "/home/adriel/Documents/Adriel-Core/02_BARBIERE-AS/IL-BARBIERE-AS/docs/diagnostico-il-barbiere.pdf"
    doc.write_pdf(output_path)
    print(f"PDF generado: {output_path}")