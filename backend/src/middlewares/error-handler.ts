import type { Request, Response, NextFunction } from "express";
import { logger } from "../lib/logger";

function isDatabaseError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return (
    message.includes("failed query") ||
    message.includes("connection") ||
    message.includes("timeout") ||
    message.includes("econnreset") ||
    message.includes("econnrefused") ||
    message.includes("terminating connection")
  );
}

export function errorHandler(
  error: unknown,
  req: Request,
  res: Response,
  _next: NextFunction,
): void {
  if (res.headersSent) return;

  logger.error(
    { err: error, method: req.method, url: req.url },
    "Unhandled request error",
  );

  if (isDatabaseError(error)) {
    res.status(503).json({
      error: "Database connection failed. Please try again in a moment.",
    });
    return;
  }

  const message =
    error instanceof Error ? error.message : "Something went wrong";

  res.status(500).json({ error: message });
}
