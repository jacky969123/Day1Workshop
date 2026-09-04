const links = new Map();

const PORT = Number(process.env.PORT || 3000);
const BASE_URL = (() => {
  if (process.env.BASE_URL) return process.env.BASE_URL.replace(/\/$/, '');
  if (process.env.RAILWAY_PUBLIC_DOMAIN) return `https://${process.env.RAILWAY_PUBLIC_DOMAIN}`;
  return `http://localhost:${PORT}`;
})();
const PUBLIC_DIR = process.env.PUBLIC_DIR ? require('node:path').resolve(process.cwd(), process.env.PUBLIC_DIR) : null;

function generateCode() {
  const chars = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  let code = '';
  for (let i = 0; i < 6; i += 1) {
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}

function createShortCode() {
  let code = generateCode();
  while (links.has(code)) {
    code = generateCode();
  }
  return code;
}

function normalizeBaseUrl(value) {
  try {
    const url = new URL(value);
    return `${url.origin}`;
  } catch {
    return value.replace(/\/$/, '');
  }
}

function sendJson(res, statusCode, payload, extraHeaders = {}) {
  const headers = {
    'Content-Type': 'application/json; charset=utf-8',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    ...extraHeaders,
  };

  res.writeHead(statusCode, headers);
  res.end(JSON.stringify(payload));
}

function getContentType(filePath) {
  const ext = require('node:path').extname(filePath).toLowerCase();
  const types = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.ico': 'image/x-icon',
    '.txt': 'text/plain; charset=utf-8',
  };
  return types[ext] || 'application/octet-stream';
}

async function serveStaticFile(res, requestPath) {
  if (!PUBLIC_DIR) return false;

  const path = require('node:path');
  const fs = require('node:fs/promises');
  const decoded = decodeURIComponent(requestPath);

  let candidate = decoded === '/' ? 'index.html' : decoded.replace(/^\/+/, '');
  candidate = candidate.split('/').filter(Boolean).join('/');

  const safePath = path.resolve(PUBLIC_DIR, candidate);
  if (!safePath.startsWith(PUBLIC_DIR)) {
    return false;
  }

  try {
    const file = await fs.readFile(safePath);
    res.writeHead(200, {
      'Content-Type': getContentType(safePath),
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    });
    res.end(file);
    return true;
  } catch {
    return false;
  }
}

const server = require('node:http').createServer(async (req, res) => {
  const requestUrl = new URL(req.url || '/', `http://${req.headers.host || 'localhost'}`);
  const pathname = requestUrl.pathname;

  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  if (req.method === 'POST' && pathname === '/api/links') {
    let rawBody = '';
    req.on('data', (chunk) => {
      rawBody += chunk;
    });

    req.on('end', () => {
      try {
        const parsed = rawBody ? JSON.parse(rawBody) : null;
        if (!parsed || typeof parsed !== 'object' || typeof parsed.url !== 'string') {
          throw new Error('Invalid JSON body. Expected { url: "https://..." }.');
        }

        let targetUrl;
        try {
          targetUrl = new URL(parsed.url);
        } catch {
          throw new Error('Invalid URL format.');
        }

        if (targetUrl.protocol !== 'http:' && targetUrl.protocol !== 'https:') {
          throw new Error('Only http and https URLs are allowed.');
        }

        const code = createShortCode();
        const createdAt = new Date().toISOString();
        const link = {
          code,
          url: targetUrl.toString(),
          shortUrl: `${normalizeBaseUrl(BASE_URL)}/${code}`,
          hits: 0,
          createdAt,
        };

        links.set(code, link);
        sendJson(res, 201, link);
      } catch (error) {
        sendJson(res, 400, { error: error.message || 'Invalid request' });
      }
    });
    return;
  }

  if (req.method === 'GET' && pathname === '/health') {
    sendJson(res, 200, { status: 'ok' });
    return;
  }

  if (req.method === 'GET' && pathname === '/api/links') {
    const payload = [...links.values()].map((link) => ({ ...link }));
    sendJson(res, 200, payload);
    return;
  }

  if (req.method === 'GET') {
    if (PUBLIC_DIR) {
      const served = await serveStaticFile(res, pathname);
      if (served) return;
    }

    const code = pathname.replace(/^\//, '').split('/')[0];
    if (code && links.has(code)) {
      const link = links.get(code);
      link.hits += 1;
      res.writeHead(302, {
        Location: link.url,
        'Access-Control-Allow-Origin': '*',
      });
      res.end();
      return;
    }

    if (PUBLIC_DIR && pathname === '/') {
      sendJson(res, 404, { error: 'Not found' });
      return;
    }

    sendJson(res, 404, { error: 'Unknown short code' });
    return;
  }

  sendJson(res, 405, { error: 'Method not allowed' });
});

server.listen(PORT, () => {
  console.log(`Snip backend running on http://localhost:${PORT}`);
});
