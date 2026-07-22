import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { signToken, requireAuth, requireAdmin } from "../middlewares/auth";
import { logger } from "../lib/logger";
import { imageUpload } from "../lib/uploads";
import crypto from "crypto";
import { sendVerificationEmail } from "../lib/mail";
import { sendResetPasswordEmail } from "../lib/mail";

const router: IRouter = Router();

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

router.post("/auth/register", async (req, res): Promise<void> => {
  const { name, email, password } = req.body;
  const verificationToken = crypto.randomBytes(32).toString("hex");

  const verificationTokenExpiresAt = new Date(Date.now() + 60 * 60 * 1000);
  if (!name || !email || !password) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  try {
    const [existing] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email));
    if (existing) {
      res.status(400).json({ error: "Email already registered" });
      return;
    }

    const passwordHash = await bcrypt.hash(password, 10);
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

router.post("/auth/login", async (req, res): Promise<void> => {
  const { email, password } = req.body;
  if (!email || !password) {
    res.status(400).json({ error: "Missing email or password" });
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

    const token = signToken({ userId: user.id, role: user.role });
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

router.post("/auth/logout", async (_req, res): Promise<void> => {
  res.json({ message: "Logged out successfully" });
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
  const { name, email } = req.body;
  if (!name || !email) {
    res.status(400).json({
      error: "Name and email are required",
    });
    return;
  }
  try {
    const [existingUser] = await db
      .select()
      .from(usersTable)
      .where(eq(usersTable.email, email));

    if (existingUser && existingUser.id !== req.user!.id) {
      res.status(400).json({
        error: "Email already exists",
      });
      return;
    }
    const [updatedUser] = await db
      .update(usersTable)
      .set({
        name,
        email,
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
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      res.status(400).json({
        error: "Current password and new password are required",
      });
      return;
    }

    if (newPassword.length < 6) {
      res.status(400).json({
        error: "New password must be at least 6 characters",
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
      const newPasswordHash = await bcrypt.hash(newPassword, 10);

      await db
        .update(usersTable)
        .set({
          passwordHash: newPasswordHash,
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

router.post("/auth/forgot-password", async (req, res): Promise<void> => {
  const { email } = req.body;

  if (!email) {
    res.status(400).json({
      error: "Email required",
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
      message: "Password reset email sent",
    });
  } catch (error) {
    logger.error(error);

    res.status(500).json({
      error: "Failed to send reset email",
    });
  }
});

router.post("/auth/reset-password", async (req, res): Promise<void> => {
  const { token, password } = req.body;

  if (!token || !password) {
    res.status(400).json({
      error: "Invalid request",
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

  const passwordHash = await bcrypt.hash(password, 10);

  await db
    .update(usersTable)
    .set({
      passwordHash,

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
