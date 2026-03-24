import "dotenv/config";
import express from "express";
import { createServer } from "http";
import net from "net";
import path from "path";
import { createExpressMiddleware } from "@trpc/server/adapters/express";
import { registerOAuthRoutes } from "./oauth";
import { registerCustomAuthRoutes, seedMasterAccount } from "./custom-auth";
import { registerFileUploadRoutes } from "../file-upload";
import { appRouter } from "../routers";
import { checkAndNotifyPendingExits } from "../notifications";
import { createContext } from "./context";

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

  // In production, serve the Next.js app via Express
  if (process.env.NODE_ENV === "production") {
    try {
      const { default: next } = await import("next");
      const webDir = path.resolve(process.cwd(), "web");
      const nextApp = next({ dev: false, dir: webDir });
      const nextHandler = nextApp.getRequestHandler();
      await nextApp.prepare();
      // All non-API routes go to Next.js
      app.all("*", (req: express.Request, res: express.Response) => {
        return nextHandler(req, res);
      });
      console.log("[next] Next.js app ready");
    } catch (e) {
      console.error("[next] Failed to start Next.js:", e);
    }
  }

  const preferredPort = parseInt(process.env.PORT || "3000");
  const port = await findAvailablePort(preferredPort);

  if (port !== preferredPort) {
    console.log(`Port ${preferredPort} is busy, using port ${port} instead`);
  }

  server.listen(port, () => {
    console.log(`[api] server listening on port ${port}`);
  });

  // ─── Periodic Jobs ────────────────────────────────────────────────────────────
  // Check every 30 minutes for promoters with open entries older than 3 hours
  const PENDING_EXIT_CHECK_INTERVAL_MS = 30 * 60 * 1000; // 30 minutes
  const PENDING_EXIT_THRESHOLD_HOURS = 3;

  setInterval(async () => {
    try {
      const notified = await checkAndNotifyPendingExits(PENDING_EXIT_THRESHOLD_HOURS);
      if (notified.length > 0) {
        console.log(`[jobs] Pending exit alert sent to: ${notified.join(", ")}`);
      }
    } catch (err) {
      console.warn("[jobs] Error checking pending exits:", err);
    }
  }, PENDING_EXIT_CHECK_INTERVAL_MS);

  console.log(`[jobs] Pending exit check scheduled every ${PENDING_EXIT_CHECK_INTERVAL_MS / 60000} minutes (threshold: ${PENDING_EXIT_THRESHOLD_HOURS}h)`);
}

startServer().catch(console.error);
