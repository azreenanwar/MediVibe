const http = require("http");
const fs = require("fs");
const path = require("path");

const PORT = 3000;
const ROOT = __dirname;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".svg": "image/svg+xml",
  ".ico": "image/x-icon",
};

function getFilePath(url) {
  const clean = url === "/" ? "/index.html" : url.split("?")[0];
  const fullPath = path.join(ROOT, clean);
  if (!fullPath.startsWith(ROOT)) return null;
  return fullPath;
}

http.createServer((req, res) => {
  const filePath = getFilePath(req.url);
  if (!filePath) {
    res.writeHead(403);
    return res.end("Forbidden");
  }

  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404);
      return res.end("Not Found");
    }
    const ext = path.extname(filePath);
    res.writeHead(200, { "Content-Type": MIME[ext] || "text/plain" });
    res.end(data);
  });
}).listen(PORT, () => {
  console.log(`✅ MediVibe running at http://localhost:${PORT}`);
});
