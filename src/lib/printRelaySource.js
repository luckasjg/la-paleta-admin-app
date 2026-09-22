/**
 * Código fuente del relay de impresión local (se descarga desde Configuración).
 * Corre en la computadora del POS, escucha en http://localhost:9101 y envía
 * bytes ESC/POS crudos a la impresora térmica USB compartida en Windows.
 * Sólo usa módulos nativos de Node — no requiere `npm install`.
 */

export const RELAY_PORT = 9101;

const SERVER_JS = `/* Relay de impresión local — La Paleta POS */
const http = require('http');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { execFile } = require('child_process');

const PORT = 9101;
let CONFIG = { printerShare: 'POS80' };
try {
  CONFIG = Object.assign(CONFIG, JSON.parse(fs.readFileSync(path.join(__dirname, 'config.json'), 'utf8')));
} catch (e) {
  console.log('No se encontró config.json, usando impresora compartida "POS80"');
}

const ESC = '\\x1B';
const GS = '\\x1D';
const INIT = ESC + '@';
const CENTER = ESC + 'a' + '\\x01';
const LEFT = ESC + 'a' + '\\x00';
const BOLD_ON = ESC + 'E' + '\\x01';
const BOLD_OFF = ESC + 'E' + '\\x00';
const BIG = GS + '!' + '\\x11';
const NORMAL = GS + '!' + '\\x00';
const CUT = GS + 'V' + '\\x42' + '\\x00';
const LINE = '-'.repeat(42) + '\\n';

function buildTicket(job) {
  let t = INIT + CENTER + BOLD_ON + BIG + (job.shop_name || 'LA PALETA') + '\\n' + NORMAL;
  t += 'COMANDA\\n' + BOLD_OFF;
  if (job.turn) t += BIG + 'TURNO #' + job.turn + '\\n' + NORMAL;
  t += LEFT + LINE;
  if (job.staff_name) t += 'Cajero: ' + job.staff_name + '\\n';
  if (job.shift) t += 'Turno: ' + job.shift + '\\n';
  t += 'Fecha: ' + (job.timestamp || new Date().toLocaleString()) + '\\n';
  t += LINE;
  let count = 0;
  (job.items || []).forEach(function (it) {
    const qty = it.quantity || 1;
    count += qty;
    t += BOLD_ON + qty + ' x ' + (it.product_name || '') + BOLD_OFF + '\\n';
    if (it.flavor) t += '   ' + it.flavor + (it.grams ? ' (' + it.grams + 'g)' : '') + '\\n';
    if (it.vessel) t += '   Servir en: ' + it.vessel + '\\n';
    if (it.is_courtesy) t += '   ** CORTESIA **\\n';
    if (it.notes) t += '   Nota: ' + it.notes + '\\n';
  });
  t += LINE;
  t += BOLD_ON + 'TOTAL ITEMS: ' + count + '\\n' + BOLD_OFF;
  t += '\\n\\n\\n' + CUT;
  return Buffer.from(t, 'binary');
}

function sendToPrinter(buffer, cb) {
  const tmp = path.join(os.tmpdir(), 'comanda_' + Date.now() + '.bin');
  fs.writeFileSync(tmp, buffer);
  const target = '\\\\\\\\localhost\\\\' + CONFIG.printerShare;
  execFile('cmd', ['/c', 'copy', '/b', tmp, target], function (err, stdout, stderr) {
    fs.unlink(tmp, function () {});
    if (err) return cb(new Error((stderr || err.message).trim()));
    cb(null);
  });
}

function cors(res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,POST,OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
}

http.createServer(function (req, res) {
  cors(res);
  if (req.method === 'OPTIONS') { res.writeHead(204); return res.end(); }

  if (req.method === 'GET' && req.url.startsWith('/health')) {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    return res.end(JSON.stringify({ ok: true, printer: CONFIG.printerShare }));
  }

  if (req.method === 'POST' && req.url.startsWith('/print')) {
    let body = '';
    req.on('data', function (c) { body += c; });
    req.on('end', function () {
      let job;
      try { job = JSON.parse(body); } catch (e) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        return res.end(JSON.stringify({ ok: false, error: 'JSON inválido' }));
      }
      sendToPrinter(buildTicket(job), function (err) {
        if (err) {
          console.error('Error al imprimir:', err.message);
          res.writeHead(500, { 'Content-Type': 'application/json' });
          return res.end(JSON.stringify({ ok: false, error: err.message }));
        }
        console.log('Comanda impresa' + (job.turn ? ' (turno #' + job.turn + ')' : ''));
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true }));
      });
    });
    return;
  }

  res.writeHead(404);
  res.end();
}).listen(PORT, '127.0.0.1', function () {
  console.log('Relay de impresión escuchando en http://localhost:' + PORT);
  console.log('Impresora compartida: ' + CONFIG.printerShare);
  console.log('Deja esta ventana abierta mientras uses el POS.');
});
`;

const CONFIG_JSON = `{
  "printerShare": "POS80"
}
`;

const START_BAT = `@echo off
title Relay de impresion - La Paleta POS
cd /d "%~dp0"
node server.js
pause
`;

const README = `# Relay de impresión local — La Paleta POS

Imprime las comandas térmicas al instante, sin el diálogo del navegador.
Se instala UNA sola vez en la computadora que tiene la impresora USB conectada.

## Requisitos
- Windows
- Node.js instalado (descarga gratis en https://nodejs.org — versión LTS)
- Impresora térmica USB 80mm instalada en Windows

## Paso 1 — Compartir la impresora
1. Panel de control → Dispositivos e impresoras
2. Clic derecho sobre tu impresora térmica → Propiedades de impresora
3. Pestaña "Compartir" → marcar "Compartir esta impresora"
4. En "Nombre del recurso compartido" escribe: POS80  (sin espacios)
5. Aceptar

Si usas otro nombre, edítalo en el archivo config.json.

## Paso 2 — Arrancar el relay
1. Copia esta carpeta a la computadora del POS (por ejemplo a C:\\PrintRelay)
2. Doble clic en start-relay.bat
3. Debe aparecer: "Relay de impresión escuchando en http://localhost:9101"
4. Deja esa ventana abierta/minimizada mientras se use el POS

## Paso 3 — Verificar en el POS
Abre el POS en el navegador de esa misma computadora. Junto al botón
"Imprimir Comanda" verás un indicador verde "Impresión directa".
A partir de ahí, cada comanda sale al instante sin diálogo.

## Arranque automático al encender el equipo (opcional)
1. Presiona Windows + R, escribe: shell:startup
2. Copia un acceso directo de start-relay.bat dentro de esa carpeta

## Si el indicador está en rojo ("Modo diálogo")
- Verifica que la ventana del relay esté abierta
- Confirma que el nombre compartido de la impresora coincide con config.json
- El POS seguirá imprimiendo con el diálogo normal del navegador, no se pierde nada
`;

export const RELAY_FILES = [
  { name: 'server.js', content: SERVER_JS },
  { name: 'config.json', content: CONFIG_JSON },
  { name: 'start-relay.bat', content: START_BAT },
  { name: 'LEEME.md', content: README },
];