import type { NextFunction, Request, Response } from "express";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_BUCKETS = 10_000;

type RateLimitOptions = {
  windowMs: number;
  max: number;
  message?: string;
};

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

function getClientKey(req: Request): string {
  return req.ip || req.socket.remoteAddress || "unknown";
}

function pruneExpiredBuckets(now: number): void {
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key);
  }

  if (buckets.size <= MAX_BUCKETS) return;

  const oldest = [...buckets.entries()]
    .sort(([, first], [, second]) => first.resetAt - second.resetAt)
    .slice(0, buckets.size - MAX_BUCKETS);
  for (const [key] of oldest) buckets.delete(key);
}

export function createAuthRateLimit({
  windowMs,
  max,
  message = "Too many attempts. Please try again later.",
}: RateLimitOptions) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const now = Date.now();
    pruneExpiredBuckets(now);
    const key = getClientKey(req);
    const current = buckets.get(key);
    const bucket = !current || current.resetAt <= now
      ? { count: 0, resetAt: now + windowMs }
      : current;

    bucket.count += 1;
    buckets.set(key, bucket);

    res.setHeader("X-RateLimit-Limit", max);
    res.setHeader("X-RateLimit-Remaining", Math.max(0, max - bucket.count));
    res.setHeader("X-RateLimit-Reset", Math.ceil(bucket.resetAt / 1000));

    if (bucket.count > max) {
      res.setHeader("Retry-After", Math.max(1, Math.ceil((bucket.resetAt - now) / 1000)));
      res.status(429).json({ error: message });
      return;
    }

    next();
  };
}

export function normalizeEmail(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const email = value.trim().toLowerCase();
  if (email.length > 254 || !EMAIL_PATTERN.test(email)) return null;
  return email;
}

export function normalizeName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const name = value.trim().replace(/\s+/g, " ");
  if (name.length < 2 || name.length > 80) return null;
  return name;
}

export function validatePassword(value: unknown): string | null {
  if (typeof value !== "string") return "Password is required";
  if (value.length < 8) return "Password must be at least 8 characters";
  if (value.length > 128) return "Password must be 128 characters or fewer";
  return null;
}

export function isValidResetToken(value: unknown): value is string {
  return typeof value === "string" && /^[a-f0-9]{64}$/i.test(value);
}
