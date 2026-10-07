const http = require('http');
const fs = require('fs');
const path = require('path');

const PUBLIC_DIR = path.join(__dirname, 'public');
const PORT = 5501;
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
};

function sendJson(res, code, payload) {
  res.writeHead(code, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

const server = http.createServer((req, res) => {
  const url = req.url.split('?')[0];

  if (req.method === 'POST' && url === '/api/auth/login') {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      let username = 'Admin';
      try { username = JSON.parse(body || '{}').username || 'Admin'; } catch (error) { /* ignore */ }
      sendJson(res, 200, {
        accessToken: 'dev-preview-token',
        user: { id: 'dev-user', username, displayName: 'Quản trị viên', role: 'ADMIN' },
      });
    });
    return;
  }

  if (url.startsWith('/api/')) {
    sendJson(res, 200, req.method === 'GET' ? [] : {});
    return;
  }

  const relative = url === '/' ? 'index.html' : url;
  const filePath = path.join(PUBLIC_DIR, relative);
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath)] || 'application/octet-stream' });
    res.end(data);
  });
});

server.listen(PORT, () => console.log(`Mock UI server on http://localhost:${PORT}`));
