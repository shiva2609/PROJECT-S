const http = require('http');
const fs = require('fs');
const path = require('path');

const root = path.join(__dirname);
const docsRoot = path.join(__dirname, '..', 'docs');
const port = process.env.PORT || 5173;

const mime = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'application/javascript',
  '.md': 'text/markdown',
  '.json': 'application/json'
};

const server = http.createServer((req, res) => {
  const urlPath = decodeURI(req.url.split('?')[0]);
  // Serve markdown from /docs/* mapped to ../docs
  if (urlPath.startsWith('/docs/')) {
    const rel = urlPath.replace('/docs/', '');
    let filePath = path.join(docsRoot, rel);
    if (!filePath.startsWith(docsRoot)) { res.writeHead(403); return res.end('Forbidden'); }
    return fs.readFile(filePath, (e, data) => {
      if (e) { res.writeHead(404); return res.end('Not Found'); }
      res.setHeader('Content-Type', 'text/markdown');
      res.end(data);
    });
  }

  let filePath = path.join(root, urlPath === '/' ? 'index.html' : urlPath);
  if (!filePath.startsWith(root)) { res.writeHead(403); return res.end('Forbidden'); }
  fs.stat(filePath, (err, stat) => {
    if (err) {
      res.writeHead(404); return res.end('Not Found');
    }
    if (stat.isDirectory()) filePath = path.join(filePath, 'index.html');
    fs.readFile(filePath, (e, data) => {
      if (e) { res.writeHead(500); return res.end('Server Error'); }
      const ext = path.extname(filePath).toLowerCase();
      res.setHeader('Content-Type', mime[ext] || 'text/plain');
      res.end(data);
    });
  });
});

server.listen(port, () => {
  console.log(`Documentation site running at http://localhost:${port}`);
});


