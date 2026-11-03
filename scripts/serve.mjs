import http from "node:http";
import { readFile, stat } from "node:fs/promises";
import { resolve, extname, sep } from "node:path";
const root = resolve(process.env.SERVE_DIR || ".");
const port = Number(process.env.PORT || 4173);
const prefix = "/fox-sales-resource-center/";
const mime = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
};
http
  .createServer(async (req, res) => {
    try {
      const pathname = decodeURIComponent(
        new URL(req.url, "http://localhost").pathname,
      );
      let route = pathname.startsWith(prefix)
        ? pathname.slice(prefix.length)
        : pathname.replace(/^\//, "");
      if (pathname === prefix.slice(0, -1)) {
        res.writeHead(302, { Location: prefix });
        return res.end();
      }
      let file = resolve(root, route || "index.html");
      if (file !== root && !file.startsWith(root + sep)) {
        res.writeHead(403);
        return res.end("Forbidden");
      }
      if ((await stat(file)).isDirectory()) file = resolve(file, "index.html");
      res.writeHead(200, {
        "Content-Type": mime[extname(file)] || "application/octet-stream",
        "Cache-Control": "no-store",
        "X-Content-Type-Options": "nosniff",
      });
      res.end(await readFile(file));
    } catch {
      res.writeHead(404, { "Content-Type": "text/plain" });
      res.end("Not found");
    }
  })
  .listen(port, "0.0.0.0", () =>
    console.log(
      `Static development server listening on port ${port}; repository subpath supported.`,
    ),
  );
