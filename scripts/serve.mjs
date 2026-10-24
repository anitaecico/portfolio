import http from "node:http";
import fs from "node:fs";
import path from "node:path";

const distDir = path.join(process.cwd(), "dist");
const port = Number(process.env.PORT || 4173);

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".woff2": "font/woff2",
  ".pdf": "application/pdf"
};

const server = http.createServer((req, res) => {
  const reqUrl = (req.url || "/").split("?")[0];
  const relativePath = reqUrl === "/" ? "index.html" : decodeURIComponent(reqUrl.replace(/^\/+/, ""));
  const safePath = path.normalize(path.join(distDir, relativePath));

  if (!safePath.startsWith(distDir)) {
    res.writeHead(403);
    res.end("Forbidden");
    return;
  }

  fs.stat(safePath, (err, stat) => {
    if (err || !stat.isFile()) {
      res.writeHead(404);
      res.end("Not Found");
      return;
    }
    const ext = path.extname(safePath).toLowerCase();
    const contentType = mimeTypes[ext] || "application/octet-stream";
    res.writeHead(200, { "Content-Type": contentType });
    fs.createReadStream(safePath).pipe(res);
  });
});

server.listen(port, "127.0.0.1", () => {
  process.stdout.write("Serving dist at http://127.0.0.1:" + port + "\n");
});
