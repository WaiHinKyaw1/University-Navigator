import { Router, type IRouter } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import multer from "multer";
import { logger } from "../lib/logger";

// In-memory multer (no local disk writes) so profile images persist on
// serverless deployments (Vercel) where local disk is ephemeral. The image is
// stored in the database as a base64 data URL on the new `avatar_data` column.
const MAX_AVATAR_BYTES = 2 * 1024 * 1024; // ~2.8 MB once base64-encoded
const AVATAR_MEMORY_LIMIT = 6 * 1024 * 1024; // reject oversized payloads early

const avatarUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: AVATAR_MEMORY_LIMIT },
  fileFilter: (_req, file, cb) => {
    if (!file.mimetype.startsWith("image/")) {
      cb(new Error("Only image files are allowed (JPG, PNG, or WebP)"));
      return;
    }
    cb(null, true);
  },
});

function bufferToDataUrl(buffer: Buffer, mimetype: string): string {
  return `data:${mimetype};base64,${buffer.toString("base64")}`;
}

const router: IRouter = Router();

router.post(
  "/auth/profile/image",
  requireAuth,
  (req, res, next) => {
    avatarUpload.single("file")(req, res, (err) => {
      if (err) {
        const message =
          err instanceof multer.MulterError && err.code === "LIMIT_FILE_SIZE"
            ? "Image too large. Please choose a photo smaller than 2 MB."
            : err.message || "Upload failed";
        res.status(400).json({ error: message });
        return;
      }
      next();
    });
  },
  async (req, res): Promise<void> => {
    try {
      const file = req.file;
      if (!file) {
        res.status(400).json({ error: "Image file is required" });
        return;
      }
      if (file.buffer.length > MAX_AVATAR_BYTES) {
        res.status(400).json({
          error: "Image too large. Please choose a photo smaller than 2 MB.",
        });
        return;
      }
      const avatarData = bufferToDataUrl(file.buffer, file.mimetype);
      const [updatedUser] = await db
        .update(usersTable)
        .set({ avatarData })
        .where(eq(usersTable.id, req.user!.id))
        .returning();
      logger.info({ userId: req.user!.id }, "Profile image saved to database");
      res.json({
        message: "Profile image updated",
        avatarUrl: updatedUser.avatarData,
      });
    } catch (error) {
      logger.error({ error }, "Save profile image failed");
      res.status(500).json({ error: "Failed to update profile image" });
    }
  },
);

router.delete(
  "/auth/profile/image",
  requireAuth,
  async (req, res): Promise<void> => {
    try {
      const [user] = await db
        .update(usersTable)
        .set({ avatarData: null })
        .where(eq(usersTable.id, req.user!.id))
        .returning();
      if (!user) {
        res.status(404).json({ error: "User not found" });
        return;
      }
      res.json({ message: "Profile photo removed", avatarUrl: null });
    } catch (error) {
      logger.error({ error }, "Remove profile image failed");
      res.status(500).json({ error: "Failed to remove profile image" });
    }
  },
);

export default router;
