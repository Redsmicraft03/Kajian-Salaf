const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const PUBLIC_DIR = __dirname;

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf',
};

const server = http.createServer((req, res) => {
  let urlPath = req.url.split('?')[0];

  // Proxy API request ke backend (port 8081 / 8080)
  if (urlPath.startsWith('/api/')) {
    const backendPort = process.env.BACKEND_PORT || 8081;
    const proxyReq = http.request({
      hostname: '127.0.0.1',
      port: backendPort,
      path: req.url,
      method: req.method,
      headers: { ...req.headers, host: `127.0.0.1:${backendPort}` },
    }, (proxyRes) => {
      res.writeHead(proxyRes.statusCode, proxyRes.headers);
      proxyRes.pipe(res);
    });
    proxyReq.on('error', (e) => {
      res.writeHead(502, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ success: false, message: 'Backend unreachable: ' + e.message }));
    });
    req.pipe(proxyReq);
    return;
  }

  // Routing clean URL
  if (
    urlPath === '/v1/login' || urlPath === '/v1/login/' || urlPath === '/login' ||
    urlPath === '/v1/admin' || urlPath === '/v1/admin/' || urlPath === '/admin' || urlPath === '/admin/'
  ) {
    urlPath = '/admin.html';
  } else if (urlPath === '/detail' || urlPath === '/detail/') {
    urlPath = '/detail.html';
  } else if (urlPath === '/' || urlPath === '') {
    urlPath = '/index.html';
  }

  let filePath = path.join(PUBLIC_DIR, urlPath);

  fs.stat(filePath, (err, stats) => {
    if (err) {
      const htmlPath = filePath + '.html';
      if (fs.existsSync(htmlPath)) {
        res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
        fs.createReadStream(htmlPath).pipe(res);
        return;
      }

      res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('404 Not Found');
      return;
    }

    if (stats.isDirectory()) {
      filePath = path.join(filePath, 'index.html');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    res.writeHead(200, { 'Content-Type': contentType });
    fs.createReadStream(filePath).pipe(res);
  });
});

server.listen(PORT, () => {
  console.log(`Frontend running on http://localhost:${PORT}`);
  console.log(`Route /v1/login active at http://localhost:${PORT}/v1/login`);
  console.log(`Route /v1/admin active at http://localhost:${PORT}/v1/admin`);
});
