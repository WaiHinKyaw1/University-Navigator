import { Router, type IRouter } from "express";
import bcrypt from "bcryptjs";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { signToken, requireAuth } from "../middlewares/auth";
import { logger } from "../lib/logger";
import { imageUpload } from "../lib/uploads";

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
      })
      .returning();

    const token = signToken({ userId: user.id, role: user.role });
    res.status(201).json({
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

  try {
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

export default router;
