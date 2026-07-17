import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "dist");
const port = Number.parseInt(process.env.PORT ?? "5173", 10);
const host = process.env.HOST ?? "0.0.0.0";

const contentTypes = new Map([
  [".css", "text/css; charset=utf-8"],
  [".html", "text/html; charset=utf-8"],
  [".js", "text/javascript; charset=utf-8"],
  [".json", "application/json; charset=utf-8"],
  [".png", "image/png"],
  [".svg", "image/svg+xml"],
  [".webp", "image/webp"],
]);

function resolveRequestPath(url) {
  const pathname = decodeURIComponent(new URL(url, "http://localhost").pathname);
  const normalized = path.normalize(pathname).replace(/^(\.\.[/\\])+/, "");
  const candidate = path.join(root, normalized);

  if (!candidate.startsWith(root)) {
    return path.join(root, "index.html");
  }

  return candidate;
}

async function findFile(url) {
  const requested = resolveRequestPath(url);

  try {
    const info = await stat(requested);
    if (info.isFile()) return requested;
    if (info.isDirectory()) return path.join(requested, "index.html");
  } catch {
    return path.join(root, "index.html");
  }

  return path.join(root, "index.html");
}

const server = createServer(async (request, response) => {
  if (!request.url) {
    response.writeHead(400);
    response.end("Bad request");
    return;
  }

  const file = await findFile(request.url);
  const type = contentTypes.get(path.extname(file)) ?? "application/octet-stream";

  response.writeHead(200, {
    "Cache-Control": "no-store",
    "Content-Type": type,
  });

  createReadStream(file).pipe(response);
});

server.listen(port, host, () => {
  console.log(`Serving ${root}`);
  console.log(`Local: http://127.0.0.1:${port}/`);
});
