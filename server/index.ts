import express, { type NextFunction, type Request, type Response } from "express";
import path from "path";
import { registerRoutes } from "./routes";
import { log, serveStatic, setupVite } from "./vite";
import { storage } from "./storage";
import { startReminderWorker } from "./reminders";

const app = express();
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use("/attached_assets", express.static(path.resolve(import.meta.dirname, "..", "attached_assets")));

app.use((req, res, next) => {
  const start = Date.now();
  const pathName = req.path;
  let capturedJsonResponse: Record<string, any> | undefined;

  const originalResJson = res.json;
  res.json = function patchedJson(bodyJson, ...args) {
    capturedJsonResponse = bodyJson;
    return originalResJson.apply(res, [bodyJson, ...args]);
  };

  res.on("finish", () => {
    if (!pathName.startsWith("/api")) return;
    const duration = Date.now() - start;
    let logLine = `${req.method} ${pathName} ${res.statusCode} in ${duration}ms`;
    if (capturedJsonResponse) {
      const jsonStr = JSON.stringify(capturedJsonResponse);
      logLine += ` :: ${jsonStr.length > 80 ? `${jsonStr.slice(0, 77)}...` : jsonStr}`;
    }
    if (logLine.length > 240) logLine = `${logLine.slice(0, 237)}...`;
    log(logLine);
  });

  next();
});

(async () => {
  const server = await registerRoutes(app);
  startReminderWorker(storage);

  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    if (res.headersSent) return next(err);
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    res.status(status).json({ error: message });
  });

  if (app.get("env") === "development") {
    await setupVite(app, server);
  } else {
    serveStatic(app);
  }

  const port = Number.parseInt(process.env.PORT || "5000", 10);
  const listenOptions: Parameters<typeof server.listen>[0] = {
    port,
    host: "0.0.0.0",
    ...(process.platform !== "win32" ? { reusePort: true } : {}),
  };

  server.listen(listenOptions, () => {
    log(`serving on port ${port}`);
  });
})();
