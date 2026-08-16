import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";
import { ensureUploadDirs } from "./lib/uploads";
import { errorHandler } from "./middlewares/error-handler";
import path from "node:path";
import fs from "node:fs";

const app: Express = express();

app.disable("x-powered-by");
if (process.env.TRUST_PROXY === "true") {
  app.set("trust proxy", 1);
}

ensureUploadDirs();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
const configuredOrigins = (process.env.CORS_ORIGINS || process.env.FRONTEND_URL || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin: configuredOrigins.length
      ? (origin, callback) => {
          if (!origin || configuredOrigins.includes(origin)) {
            callback(null, true);
            return;
          }
          callback(new Error("Origin is not allowed by CORS"));
        }
      : true,
    credentials: false,
  }),
);
app.use((_, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  if (process.env.NODE_ENV === "production") {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  next();
});
app.use(express.json({ limit: process.env.JSON_BODY_LIMIT || "1mb" }));
app.use(express.urlencoded({
  extended: true,
  limit: process.env.FORM_BODY_LIMIT || "1mb",
}));

// Use process.cwd() which always resolves to backend/ when running `npm run dev`
const uploadsDir = path.join(process.cwd(), "uploads");
app.use("/uploads", express.static(uploadsDir));
app.use("/api/uploads", express.static(uploadsDir));

app.use("/api", router);

// Serve frontend static files in production
// Frontend build output is at frontend/dist/public relative to the workspace root
const frontendDist = path.join(process.cwd(), "..", "frontend", "dist", "public");
if (fs.existsSync(frontendDist)) {
  app.use(express.static(frontendDist));
  // SPA fallback - return index.html for all non-API routes (Express 5 compatible)
  app.get(/(.*)/, (_req, res) => {
    const indexPath = path.join(frontendDist, "index.html");
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(404).send("Frontend not built");
    }
  });
} else {
  logger.warn({ frontendDist }, "Frontend dist not found – running API-only mode");
}

app.use(errorHandler);

export default app;
