import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerCustomAuthRoutes, seedMasterAccount } from "./custom-auth";
import { registerFileUploadRoutes } from "../file-upload";
import { appRouter } from "../routers";
import { createContext } from "./context";
import { createProxyMiddleware } from "http-proxy-middleware";
import { spawn } from "child_process";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function isPortAvailable(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.listen(port, () => {
      server.close(() => resolve(true));
    });
    server.on("error", () => resolve(false));
  });
}

async function findAvailablePort(startPort: number = 3000): Promise<number> {
  for (let port = startPort; port < startPort + 20; port++) {
    if (await isPortAvailable(port)) {
      return port;
    }
  }
  throw new Error(`No available port found starting from ${startPort}`);
}

function startNextServer(nextPort: number): Promise<void> {
  return new Promise((resolve) => {
    const standaloneDir = path.resolve(__dirname, "../../web/.next/standalone/web");
    const serverJs = path.join(standaloneDir, "server.js");

    const nextProcess = spawn("node", [serverJs], {
      env: { ...process.env, PORT: String(nextPort), HOSTNAME: "0.0.0.0" },
      stdio: "inherit",
    });

    nextProcess.on("error", (err) => {
      console.warn("[web] Falha ao iniciar Next.js:", err.message);
      resolve();
    });

    let attempts = 0;
    const check = setInterval(async () => {
      attempts++;
      if (!(await isPortAvailable(nextPort))) {
        clearInterval(check);
        console.log(`[web] Next.js rodando na porta ${nextPort}`);
        resolve();
      }
      if (attempts > 30) {
        clearInterval(check);
        console.warn("[web] Next.js demorou para iniciar");
        resolve();
      }
    }, 500);
  });
}

async function startServer() {
  const app = express();
  const server = createServer(app);

  // Enable CORS for all routes - reflect the request origin to support credentials
  app.use((req, res, next) => {
    const origin = req.headers.origin;
    if (origin) {
      res.header("Access-Control-Allow-Origin", origin);
    }
    res.header("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
    res.header(
      "Access-Control-Allow-Headers",
      "Origin, X-Requested-With, Content-Type, Accept, Authorization",
    );
    res.header("Access-Control-Allow-Credentials", "true");

    // Handle preflight requests
    if (req.method === "OPTIONS") {
      res.sendStatus(200);
      return;
    }
    next();
  });

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ limit: "50mb", extended: true }));

  registerOAuthRoutes(app);
  registerCustomAuthRoutes(app);
  registerFileUploadRoutes(app);
  // Seed master account on startup
  seedMasterAccount().catch(console.error);

  app.get("/api/health", (_req, res) => {
    res.json({ ok: true, timestamp: Date.now() });
  });

  app.use(
    "/api/trpc",
    createExpressMiddleware({
      router: appRouter,
      createContext,
    }),
  );

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  // Em produção, inicia o Next.js e faz proxy das requisições não-API
  if (process.env.NODE_ENV === "production") {
    const nextPort = port + 1;
    await startNextServer(nextPort);

    app.use(
      createProxyMiddleware({
        target: `http://localhost:${nextPort}`,
        changeOrigin: true,
        on: {
          error: (_err: any, _req: any, res: any) => {
            res.status(502).send("Portal web temporariamente indisponível");
          },
        },
      }),
    );

    console.log(`[web] Proxy configurado: /* → http://localhost:${nextPort}`);
  }

  server.listen(port, () => {
    console.log(`[api] server listening on port ${port}`);
  });
}

startServer().catch(console.error);
