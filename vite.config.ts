import { defineConfig, loadEnv, type Plugin } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import type { IncomingMessage } from "node:http";

/**
 * Serves api/board.ts at /api/board during `npm run dev`, the same way Vercel does
 * when the site is hosted. Settings come from .env.local (SHEET_URL, SHEET_KEY, APP_PASSWORD).
 */
function localApi(): Plugin {
  return {
    name: "local-api",
    configureServer(server) {
      server.middlewares.use("/api/board", async (req, res) => {
        try {
          const mod = await server.ssrLoadModule("/api/board.ts");
          const handler = mod[req.method ?? "GET"] as ((r: Request) => Promise<Response>) | undefined;
          if (!handler) {
            res.statusCode = 405;
            res.end();
            return;
          }
          const response = await handler(await toRequest(req));
          res.statusCode = response.status;
          response.headers.forEach((value, key) => res.setHeader(key, value));
          res.end(Buffer.from(await response.arrayBuffer()));
        } catch (e) {
          server.config.logger.error(String(e));
          res.statusCode = 500;
          res.setHeader("Content-Type", "application/json");
          res.end(JSON.stringify({ ok: false, error: "Local server error. See the terminal." }));
        }
      });
    },
  };
}

async function toRequest(req: IncomingMessage & { originalUrl?: string }): Promise<Request> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  const headers = new Headers();
  for (const [k, v] of Object.entries(req.headers)) if (typeof v === "string") headers.set(k, v);
  const url = new URL(req.originalUrl ?? req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);
  const hasBody = req.method !== "GET" && req.method !== "HEAD";
  return new Request(url, { method: req.method, headers, body: hasBody ? Buffer.concat(chunks) : undefined });
}

export default defineConfig(({ mode }) => {
  // Make .env.local values available to the server function (not to the browser).
  // Values already set in the terminal take priority.
  const fileEnv = loadEnv(mode, process.cwd(), "");
  for (const key of ["SHEET_URL", "SHEET_KEY", "APP_PASSWORD", "SESSION_SECRET"]) {
    if (process.env[key] === undefined && fileEnv[key] !== undefined) process.env[key] = fileEnv[key];
  }
  return {
    plugins: [react(), tailwindcss(), localApi()],
    server: { port: 5173 },
    // GitHub Pages serves the site from /<repository-name>/; the publish workflow sets this.
    base: process.env.VITE_BASE || "/",
  };
});
