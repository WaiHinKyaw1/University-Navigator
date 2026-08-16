import { Router, type IRouter } from "express";
import { HealthCheckResponse } from "@workspace/api-zod";
import { db } from "@workspace/db";
import { sql } from "drizzle-orm";
import { logger } from "../lib/logger";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  const data = HealthCheckResponse.parse({ status: "ok" });
  res.json(data);
});

router.get("/readyz", async (_req, res): Promise<void> => {
  try {
    await db.execute(sql`select 1`);
    res.status(200).json({ status: "ready", database: "ok" });
  } catch (error) {
    logger.warn({ err: error }, "Readiness check failed");
    res.status(503).json({ status: "not_ready", database: "error" });
  }
});

export default router;
