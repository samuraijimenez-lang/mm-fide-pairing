/* Microservicio de emparejamiento FIDE (Sistema Holandés) sobre bbpPairings.
   Recibe un TRF y devuelve las parejas. Host-agnóstico: VPS, Render, Railway,
   Fly.io, Cloud Run o una VPS de HostGator. Apunta aquí tu subdominio.
   POST /pair   body: TRF (text/plain)   header opcional: x-api-key
   -> { ok, system, ngames, pairings:[{white,black}], byes:[id] }        */
const http = require('http');
const { execFileSync } = require('child_process');
const { writeFileSync, mkdtempSync, readFileSync, rmSync } = require('fs');
const os = require('os'), path = require('path');

const PORT   = process.env.PORT || 8080;
const APIKEY = process.env.API_KEY || '';           // si se define, se exige
const BIN    = path.join(__dirname, 'bbpPairings');

// ⭐ Red de seguridad: un error no capturado NUNCA debe tumbar todo el proceso
// (eso es lo que causaba los 502 — ver fix más abajo en req.on('end', ...)).
// Esto es un respaldo adicional por si aparece algún otro caso no previsto.
process.on('uncaughtException', (e) => {
  console.error('uncaughtException (proceso sigue vivo):', e);
});
process.on('unhandledRejection', (e) => {
  console.error('unhandledRejection (proceso sigue vivo):', e);
});

function pair(trf, system) {
  const dir = mkdtempSync(path.join(os.tmpdir(), 'pair-'));
  try {
    const inp = path.join(dir, 'in.trf'), out = path.join(dir, 'out.txt');
    writeFileSync(inp, trf, 'utf8');
    const flag = system === 'burstein' ? '--burstein' : '--dutch';
    execFileSync(BIN, [flag, inp, '-p', out], { timeout: 15000 });
    const lines = readFileSync(out, 'utf8').trim().split(/\r?\n/);
    const n = parseInt(lines.shift(), 10) || 0;
    const pairings = [], byes = [];
    lines.forEach(l => {
      const [w, b] = l.trim().split(/\s+/).map(Number);
      if (b === 0) byes.push(w); else pairings.push({ white: w, black: b });
    });
    return { ok: true, system: flag.slice(2), ngames: n, pairings, byes };
  } finally { rmSync(dir, { recursive: true, force: true }); }
}

http.createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, {'content-type':'application/json'}); return res.end('{"ok":true}');
  }
  if (req.method !== 'POST' || req.url.split('?')[0] !== '/pair') {
    res.writeHead(404); return res.end('Not found');
  }
  if (APIKEY && req.headers['x-api-key'] !== APIKEY) {
    res.writeHead(401, {'content-type':'application/json'}); return res.end('{"ok":false,"error":"unauthorized"}');
  }
  let body = '';
  req.on('data', c => { body += c; if (body.length > 2e6) req.destroy(); });
  req.on('end', () => {
    let result;
    try {
      const sys = (new URL(req.url, 'http://x').searchParams.get('system')) || 'dutch';
      result = pair(body, sys);
    } catch (e) {
      res.writeHead(400, {'content-type':'application/json'});
      return res.end(JSON.stringify({ ok:false, error: String(e.stderr || e.message || e) }));
    }
    res.writeHead(200, {'content-type':'application/json'});
    res.end(JSON.stringify(result));
  });
}).listen(PORT, () => console.log('FIDE pairing service on :' + PORT));
