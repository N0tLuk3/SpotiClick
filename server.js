import fs from 'fs';
import path from 'path';
import http from 'http';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PUBLIC_DIR = path.join(__dirname, 'public');
const ENV_PATH = path.join(__dirname, '.env');

function loadEnvFile() {
  if (!fs.existsSync(ENV_PATH)) return;
  const lines = fs.readFileSync(ENV_PATH, 'utf-8').split(/\r?\n/);
  for (const line of lines) {
    if (!line || line.startsWith('#')) continue;
    const [key, ...rest] = line.split('=');
    if (!key || process.env[key]) continue;
    process.env[key] = rest.join('=').trim();
  }
}

loadEnvFile();

const SONG_BPM_BASE_URL = process.env.SONGBPM_BASE_URL || 'https://api.getsongbpm.com';
const SONG_BPM_PATH_TEMPLATE = process.env.SONGBPM_PATH_TEMPLATE || '/tempo/';
const SONG_BPM_API_KEY = process.env.SONGBPM_API_KEY;
const SONG_BPM_API_KEY_PARAM = process.env.SONGBPM_API_KEY_PARAM || 'api_key';
const SONG_BPM_AUTH_HEADER = process.env.SONGBPM_AUTH_HEADER || '';
const SONG_BPM_ID_PARAM = process.env.SONGBPM_ID_PARAM || 'id';
const SONG_BPM_TITLE_PARAM = process.env.SONGBPM_TITLE_PARAM || 'song';
const SONG_BPM_ARTIST_PARAM = process.env.SONGBPM_ARTIST_PARAM || 'artist';
const PORT = process.env.PORT || 3000;

const mimeTypes = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.ico': 'image/x-icon'
};

function sendJson(res, status, body) {
  res.writeHead(status, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type'
  });
  res.end(JSON.stringify(body));
}

async function proxySongBpmRequest(trackId, searchParams = {}) {
  const endpoint = SONG_BPM_PATH_TEMPLATE.replace('{id}', encodeURIComponent(trackId ?? ''));
  const fullUrl = new URL(endpoint, SONG_BPM_BASE_URL);
  const headers = { Accept: 'application/json' };

  if (SONG_BPM_API_KEY) {
    if (SONG_BPM_AUTH_HEADER) {
      headers[SONG_BPM_AUTH_HEADER] = SONG_BPM_API_KEY;
    } else if (SONG_BPM_API_KEY_PARAM) {
      fullUrl.searchParams.set(SONG_BPM_API_KEY_PARAM, SONG_BPM_API_KEY);
    }
  }

  if (SONG_BPM_ID_PARAM && trackId) {
    fullUrl.searchParams.set(SONG_BPM_ID_PARAM, trackId);
  }
  if (SONG_BPM_TITLE_PARAM && searchParams.title) {
    fullUrl.searchParams.set(SONG_BPM_TITLE_PARAM, searchParams.title);
  }
  if (SONG_BPM_ARTIST_PARAM && searchParams.artist) {
    fullUrl.searchParams.set(SONG_BPM_ARTIST_PARAM, searchParams.artist);
  }

  const response = await fetch(fullUrl.toString(), { headers });
  if (!response.ok) {
    const text = await response.text();
    throw new Error(`GetSongBPM request failed: ${response.status} ${text}`);
  }
  return response.json();
}

function serveStatic(req, res) {
  const parsed = new URL(req.url, `http://${req.headers.host}`);
  let pathname = parsed.pathname;
  if (pathname === '/') pathname = '/index.html';
  const filePath = path.join(PUBLIC_DIR, path.normalize(pathname.replace(/^\/+/, '')));

  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403);
    res.end('Forbidden');
    return;
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('Not found');
      return;
    }
    const ext = path.extname(filePath);
    const mimeType = mimeTypes[ext] || 'application/octet-stream';
    res.writeHead(200, { 'Content-Type': mimeType });
    res.end(data);
  });
}

const server = http.createServer(async (req, res) => {
  const parsedUrl = new URL(req.url, `http://${req.headers.host}`);
  if (req.method === 'OPTIONS') {
    res.writeHead(204, {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET,OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type'
    });
    res.end();
    return;
  }

  if (parsedUrl.pathname.startsWith('/api/songbpm/spotify/')) {
    const trackId = parsedUrl.pathname.split('/').pop();
    if (!trackId) {
      sendJson(res, 400, { error: 'Spotify Track ID fehlt.' });
      return;
    }
    if (!SONG_BPM_API_KEY) {
      sendJson(res, 501, { error: 'Kein GetSongBPM API Key konfiguriert. Setze SONGBPM_API_KEY in der .env (GetSongBPM verlangt zudem einen Linkback).' });
      return;
    }
    try {
      const songResponse = await proxySongBpmRequest(trackId, Object.fromEntries(parsedUrl.searchParams));
      sendJson(res, 200, songResponse);
    } catch (error) {
      console.error(error.message);
      sendJson(res, 502, { error: error.message });
    }
    return;
  }

  serveStatic(req, res);
});

server.listen(PORT, () => {
  console.log(`SpotiClick läuft auf http://localhost:${PORT}`);
});
