import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable } from "@workspace/db";
import { eq, sql } from "drizzle-orm";
import { signToken, requireAuth, requireAdmin } from "../middlewares/auth";
import { logger } from "../lib/logger";
import { imageUpload } from "../lib/uploads";
import crypto from "crypto";
import { sendVerificationEmail } from "../lib/mail";
import { sendResetPasswordEmail } from "../lib/mail";
import {
  createAuthRateLimit,
  isValidResetToken,
  normalizeEmail,
  normalizeName,
  validatePassword,
} from "../lib/auth-security";

const router: IRouter = Router();

const registerRateLimit = createAuthRateLimit({ windowMs: 15 * 60 * 1000, max: 5 });
const loginRateLimit = createAuthRateLimit({ windowMs: 15 * 60 * 1000, max: 10 });
const resetRequestRateLimit = createAuthRateLimit({ windowMs: 15 * 60 * 1000, max: 5 });
const resetPasswordRateLimit = createAuthRateLimit({ windowMs: 15 * 60 * 1000, max: 10 });

function isDatabaseError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const message = error.message.toLowerCase();
  return (
    message.includes("failed query") ||
    message.includes("connection") ||
    message.includes("timeout") ||
    message.includes("econnreset") ||
    message.includes("econnrefused")
  );
}

function handleAuthDatabaseError(
  res: import("express").Response,
  error: unknown,
  action: string,
): void {
  logger.error({ err: error }, `${action} failed`);
  if (isDatabaseError(error)) {
    res.status(503).json({
      error: "Database connection failed. Please try again in a moment.",
    });
    return;
  }
  res.status(500).json({ error: `Unable to ${action}. Please try again.` });
}

router.post("/auth/register", registerRateLimit, async (req, res): Promise<void> => {
  const name = normalizeName(req.body?.name);
  const email = normalizeEmail(req.body?.email);
  const password = typeof req.body?.password === "string" ? req.body.password : null;
  const passwordError = validatePassword(password);

  if (!name || !email || passwordError) {
    res.status(400).json({
      error: passwordError || "Name and a valid email are required",
    });
    return;
  }

  const verificationToken = crypto.randomBytes(32).toString("hex");
  const verificationTokenExpiresAt = new Date(Date.now() + 60 * 60 * 1000);

  try {
    const [existing] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email));
    if (existing) {
      res.status(400).json({ error: "Email already registered" });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const [user] = await db
      .insert(usersTable)
      .values({
        name,
        email,
        passwordHash,
        role: "student",
        status: "active",
        emailVerified: false,
        verificationToken,
        verificationTokenExpiresAt,
      })
      .returning();
    await sendVerificationEmail(user.email, user.name, verificationToken);

    // const token = signToken({ userId: user.id, role: user.role });
    res.status(201).json({
      // user: {
      //   id: user.id,
      //   name: user.name,
      //   email: user.email,
      //   role: user.role,
      //   status: user.status,
      //   avatarUrl: user.avatarUrl,
      //   createdAt: user.createdAt,
      // },
      message: "Registration successful. Please check your email.",
    });
  } catch (error) {
    handleAuthDatabaseError(res, error, "register");
  }
});

router.post("/auth/login", loginRateLimit, async (req, res): Promise<void> => {
  const email = normalizeEmail(req.body?.email);
  const password = typeof req.body?.password === "string" ? req.body.password : null;
  if (!email || !password) {
    res.status(400).json({ error: "Email and password are required" });
    return;
  }

  try {
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email));
    if (!user) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    const valid = await bcrypt.compare(password, user.passwordHash);
    if (!valid) {
      res.status(401).json({ error: "Invalid email or password" });
      return;
    }

    if (!user.emailVerified) {
      res.status(403).json({
        error: "Please verify your email first",
      });
      return;
    }

    if (user.status === "banned") {
      res.status(403).json({ error: "Account has been banned" });
      return;
    }

    const token = signToken({
      userId: user.id,
      role: user.role,
      sessionVersion: user.sessionVersion,
    });
    res.json({
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt,
      },
      token,
    });
  } catch (error) {
    handleAuthDatabaseError(res, error, "log in");
  }
});

router.post("/auth/logout", requireAuth, async (req, res): Promise<void> => {
  try {
    await db
      .update(usersTable)
      .set({ sessionVersion: sql`${usersTable.sessionVersion} + 1` })
      .where(eq(usersTable.id, req.user!.id));
    res.json({ message: "Logged out successfully" });
  } catch (error) {
    handleAuthDatabaseError(res, error, "log out");
  }
});

router.get("/auth/me", requireAuth, async (req, res): Promise<void> => {
  try {
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.id, req.user!.id));
    if (!user) {
      res.status(404).json({ error: "User not found" });
      return;
    }
    res.json({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      status: user.status,
      avatarUrl: user.avatarUrl,
      createdAt: user.createdAt,
    });
  } catch (error) {
    handleAuthDatabaseError(res, error, "load your profile");
  }
});

router.put("/auth/profile", requireAuth, async (req, res): Promise<void> => {
  const normalizedName = normalizeName(req.body?.name);
  const normalizedEmail = normalizeEmail(req.body?.email);
  if (!normalizedName || !normalizedEmail) {
    res.status(400).json({
      error: "A valid name and email are required",
    });
    return;
  }
  try {
    const [existingUser] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, normalizedEmail));

    if (existingUser && existingUser.id !== req.user!.id) {
      res.status(400).json({
        error: "Email already exists",
      });
      return;
    }
    const [updatedUser] = await db
      .update(usersTable)
      .set({
        name: normalizedName,
        email: normalizedEmail,
      })
      .where(eq(usersTable.id, req.user!.id))
      .returning();

    if (!updatedUser) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    res.json({
      id: updatedUser.id,
      name: updatedUser.name,
      email: updatedUser.email,
      role: updatedUser.role,
      status: updatedUser.status,
      avatarUrl: updatedUser.avatarUrl,
      createdAt: updatedUser.createdAt,
    });
  } catch (error) {
    res.status(500).json({
      error: "Failed to update profile",
    });
  }
});

router.put(
  "/auth/change-password",
  requireAuth,
  async (req, res): Promise<void> => {
    const currentPassword = typeof req.body?.currentPassword === "string"
      ? req.body.currentPassword
      : null;
    const newPassword = typeof req.body?.newPassword === "string"
      ? req.body.newPassword
      : null;
    const passwordError = validatePassword(newPassword);

    if (!currentPassword || passwordError) {
      res.status(400).json({
        error: passwordError || "Current password and new password are required",
      });
      return;
    }

    try {
      const [user] = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.id, req.user!.id));

      if (!user) {
        res.status(404).json({
          error: "User not found",
        });
        return;
      }

      const passwordValid = await bcrypt.compare(
        currentPassword,
        user.passwordHash,
      );

      if (!passwordValid) {
        res.status(400).json({
          error: "Current password is incorrect",
        });
        return;
      }

      // Hash new password
      const newPasswordHash = await bcrypt.hash(newPassword, 12);

      await db
        .update(usersTable)
        .set({
          passwordHash: newPasswordHash,
          sessionVersion: sql`${usersTable.sessionVersion} + 1`,
        })
        .where(eq(usersTable.id, req.user!.id));

      res.json({
        message: "Password changed successfully",
      });
    } catch (error) {
      logger.error({ error }, "Change password failed");

      res.status(500).json({
        error: "Failed to change password",
      });
    }
  },
);

router.get("/auth/verify-email", async (req, res): Promise<void> => {
  const token = req.query.token as string;

  if (!token) {
    res.status(400).send("Missing token");
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.verificationToken, token));

  if (!user) {
    res.status(400).send("Invalid verification link");
    return;
  }

  if (
    user.verificationTokenExpiresAt &&
    user.verificationTokenExpiresAt < new Date()
  ) {
    res.status(400).send("Verification link expired");
    return;
  }

  await db
    .update(usersTable)
    .set({
      emailVerified: true,
      verificationToken: null,
      verificationTokenExpiresAt: null,
    })
    .where(eq(usersTable.id, user.id));

  res.send(`
      <html>
        <body style="text-align:center">

          <h2>
            Email Verified Successfully
          </h2>

          <p>
            You can login now.
          </p>

        </body>
      </html>
    `);
});

router.post("/auth/forgot-password", resetRequestRateLimit, async (req, res): Promise<void> => {
  const email = normalizeEmail(req.body?.email);

  if (!email) {
    res.status(400).json({
      error: "A valid email is required",
    });
    return;
  }

  try {
    const [user] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email));

    if (!user) {
      res.json({
        message: "If email exists, reset link has been sent",
      });

      return;
    }

    const token = crypto.randomBytes(32).toString("hex");

    await db
      .update(usersTable)
      .set({
        resetPasswordToken: token,

        resetPasswordTokenExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
      })

      .where(eq(usersTable.id, user.id));

    await sendResetPasswordEmail(user.email, user.name, token);

    res.json({
      message: "If email exists, reset link has been sent",
    });
  } catch (error) {
    logger.error(error);

    res.status(500).json({
      error: "Failed to send reset email",
    });
  }
});

router.post("/auth/reset-password", resetPasswordRateLimit, async (req, res): Promise<void> => {
  const token = req.body?.token;
  const password = req.body?.password;
  const passwordError = validatePassword(password);

  if (!isValidResetToken(token) || passwordError) {
    res.status(400).json({
      error: passwordError || "Invalid reset request",
    });

    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.resetPasswordToken, token));

  if (!user) {
    res.status(400).json({
      error: "Invalid token",
    });

    return;
  }

  if (
    user.resetPasswordTokenExpiresAt &&
    user.resetPasswordTokenExpiresAt < new Date()
  ) {
    res.status(400).json({
      error: "Token expired",
    });

    return;
  }

    const passwordHash = await bcrypt.hash(password, 12);
  await db
    .update(usersTable)
    .set({
      passwordHash,
      sessionVersion: sql`${usersTable.sessionVersion} + 1`,
      resetPasswordToken: null,
      resetPasswordTokenExpiresAt: null,
    })

    .where(eq(usersTable.id, user.id));

  res.json({
    message: "Password reset successfully",
  });
});

router.post(
  "/auth/profile/image",
  requireAuth,

  (req, res, next) => {
    imageUpload.single("file")(req, res, (err) => {
      if (err) {
        res.status(400).json({
          error: err.message,
        });

        return;
      }

      next();
    });
  },

  async (req, res) => {
    if (!req.file) {
      res.status(400).json({
        error: "Image required",
      });

      return;
    }

    const avatarUrl = `/uploads/images/${req.file.filename}`;
    const result = await db
      .update(usersTable)

      .set({
        avatarUrl,
      })

      .where(eq(usersTable.id, req.user!.id))
      .returning();

    res.json({
      avatarUrl,
    });
  },
);

router.delete(
  "/auth/profile/image",
  requireAuth,
  async (req, res): Promise<void> => {
    try {
      const [user] = await db
        .update(usersTable)
        .set({
          avatarUrl: null,
        })
        .where(eq(usersTable.id, req.user!.id))
        .returning();

      if (!user) {
        res.status(404).json({
          error: "User not found",
        });
        return;
      }

      res.json({
        message: "Profile photo removed",
        avatarUrl: null,
      });
    } catch (error) {
      logger.error({ error }, "Remove profile image failed");

      res.status(500).json({
        error: "Failed to remove profile image",
      });
    }
  },
);

router.delete(
  "/users/:id",
  requireAuth,
  requireAdmin,
  async (req, res): Promise<void> => {
    try {
      const id = Number(req.params.id);

      const [user] = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.id, id));

      if (!user) {
        res.status(404).json({
          error: "User not found",
        });
        return;
      }

      if (user.role === "admin") {
        res.status(403).json({
          error: "Cannot delete admin account",
        });
        return;
      }

      await db.delete(usersTable).where(eq(usersTable.id, id));

      res.json({
        message: "User deleted successfully",
      });
    } catch (error) {
      logger.error({ error }, "Delete user failed");

      res.status(500).json({
        error: "Failed to delete user",
      });
    }
  },
);

export default router;
