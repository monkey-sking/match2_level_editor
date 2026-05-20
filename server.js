const http = require('http');
const fs = require('fs');
const path = require('path');

const ROOT = __dirname;

let config = { server: { port: 8080 } };
try {
  const configPath = path.join(ROOT, 'data', 'config.json');
  if (fs.existsSync(configPath)) {
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  }
} catch (e) {
  console.warn("Could not load config.json, using defaults.", e);
}

const PORT = config.server.port || 8080;

const MIME_TYPES = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon'
};

const { exec } = require('child_process');

const server = http.createServer((req, res) => {
  // Normalize path, decode URI percent-encoding, and remove query parameters
  let urlPath = req.url.split('?')[0];
  try {
    urlPath = decodeURIComponent(urlPath);
  } catch (err) {
    console.error("Failed to decode URI component:", urlPath, err);
  }
  let filePath = path.join(ROOT, urlPath);

  // Handle API Endpoints (POST requests)
  if (req.method === 'POST') {
    if (urlPath === '/api/save-templates') {
      let body = '';
      req.on('data', chunk => { body += chunk; });
      req.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          const targetPath = path.join(ROOT, 'data', 'BoardTemplates.json');
          fs.writeFileSync(targetPath, JSON.stringify(parsed, null, 2), 'utf8');
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, message: 'Templates saved successfully!' }));
        } catch (err) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, message: 'Invalid JSON body: ' + err.message }));
        }
      });
      return;
    }
    
    if (urlPath === '/api/run-pipeline') {
      exec('node Export-ToExcel.js && node Generate-Visualizer.js', { cwd: ROOT }, (error, stdout, stderr) => {
        if (error) {
          res.writeHead(500, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: false, error: error.message, stdout, stderr }));
        } else {
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ success: true, stdout, stderr }));
        }
      });
      return;
    }
  }

  // If path is a directory, try serving index.html
  if (fs.existsSync(filePath) && fs.statSync(filePath).isDirectory()) {
    filePath = path.join(filePath, 'index.html');
  }

  if (!fs.existsSync(filePath)) {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end('File Not Found');
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME_TYPES[ext] || 'application/octet-stream';

  fs.readFile(filePath, (err, content) => {
    if (err) {
      res.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
      res.end('Server Error');
    } else {
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
    }
  });
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}/`);
});
