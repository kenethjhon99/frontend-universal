import { createReadStream, existsSync, statSync } from "node:fs";
import { extname, join, normalize } from "node:path";
import { createServer } from "node:http";

const port = Number(process.env.PORT || 5173);
const host = process.env.HOST || "127.0.0.1";
const distRoot = join(process.cwd(), "dist");

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".map": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
  ".txt": "text/plain; charset=utf-8",
  ".woff": "font/woff",
  ".woff2": "font/woff2",
};

const sendFile = (res, absolutePath) => {
  const extension = extname(absolutePath).toLowerCase();
  const contentType =
    contentTypes[extension] || "application/octet-stream";

  res.writeHead(200, {
    "Content-Type": contentType,
  });

  createReadStream(absolutePath).pipe(res);
};

const resolveRequestPath = (urlPath) => {
  if (!urlPath || urlPath === "/" || urlPath === "") {
    return join(distRoot, "index.html");
  }

  const cleanPath = normalize(decodeURIComponent(urlPath)).replace(
    /^\\+|^\/+/,
    ""
  );
  return join(distRoot, cleanPath);
};

const server = createServer((req, res) => {
  try {
    const requestUrl = new URL(
      req.url || "/",
      `http://${req.headers.host || host}`
    );
    const candidatePath = resolveRequestPath(requestUrl.pathname);

    if (
      existsSync(candidatePath) &&
      statSync(candidatePath).isFile() &&
      candidatePath.startsWith(distRoot)
    ) {
      sendFile(res, candidatePath);
      return;
    }

    // SPA fallback: cualquier ruta no encontrada sirve index.html
    const fallbackPath = join(distRoot, "index.html");
    if (existsSync(fallbackPath)) {
      sendFile(res, fallbackPath);
      return;
    }

    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("No se encontro el build (corre `npm run build` primero).");
  } catch (error) {
    res.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
    res.end(`Error sirviendo frontend: ${error.message}`);
  }
});

server.listen(port, host, () => {
  console.log(`Frontend estatico en http://${host}:${port}/`);
});
