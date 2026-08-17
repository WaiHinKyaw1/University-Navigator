import { type Request, type Response, type NextFunction } from "express";
import jwt from "jsonwebtoken";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "../lib/logger";

const JWT_SECRET = process.env.SESSION_SECRET || "myanmar-uni-finder-secret-2024";

export interface AuthPayload {
  userId: number;
  role: string;
  sessionVersion?: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: number;
        role: string;
        name: string;
        email: string;
        status: string;
      };
    }
  }
}

export function signToken(payload: AuthPayload): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
}

export function verifyToken(token: string): AuthPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as AuthPayload;
  } catch {
    return null;
  }
}

export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  const token = authHeader.slice(7);
  const payload = verifyToken(token);
  if (!payload) {
    res.status(401).json({ error: "Invalid token" });
    return;
  }

  try {
    const [user] = await db.select().from(usersTable).where(eq(usersTable.id, payload.userId));
    if (!user) {
      res.status(401).json({ error: "User not found" });
      return;
    }

    if (user.status === "banned") {
      res.status(403).json({ error: "Account banned" });
      return;
    }

    if (
      payload.sessionVersion !== undefined &&
      payload.sessionVersion !== user.sessionVersion
    ) {
      res.status(401).json({ error: "Session expired. Please log in again." });
      return;
    }

    req.user = { id: user.id, role: user.role, name: user.name, email: user.email, status: user.status };
    next();
  } catch (error) {
    next(error);
  }
}

export async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  await requireAuth(req, res, (err?: unknown) => {
    if (err) {
      next(err);
      return;
    }
    if (res.headersSent) return;
    if (req.user?.role !== "admin") {
      res.status(403).json({ error: "Admin access required" });
      return;
    }
    next();
  });
}

export async function optionalAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.slice(7);
    const payload = verifyToken(token);
    if (payload) {
      try {
        const [user] = await db.select().from(usersTable).where(eq(usersTable.id, payload.userId));
        if (
          user &&
          user.status !== "banned" &&
          (payload.sessionVersion === undefined || payload.sessionVersion === user.sessionVersion)
        ) {
          req.user = { id: user.id, role: user.role, name: user.name, email: user.email, status: user.status };
        }
      } catch (error) {
        logger.warn({ err: error }, "optionalAuth: DB lookup failed, continuing as guest");
      }
    }
  }
  next();
}
