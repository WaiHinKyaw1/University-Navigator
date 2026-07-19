import { Router, type IRouter } from "express";
import { db, usersTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";
import { imageUpload } from "../lib/uploads";

const router: IRouter = Router();

router.post(
  "/auth/profile/image",
  requireAuth,

  (req, res, next) => {
    imageUpload.single("file")(req, res, (err) => {
      if (err) {
        res.status(400).json({
          error: err.message || "Upload failed",
        });

        return;
      }

      next();
    });
  },

  async (req, res): Promise<void> => {
    try {
      const file = req.file;

      if (!file) {
        res.status(400).json({
          error: "Image file is required",
        });

        return;
      }

      const avatarUrl = `/uploads/images/${file.filename}`;

      const [updatedUser] = await db
        .update(usersTable)
        .set({
          avatarUrl,
        })
        .where(eq(usersTable.id, req.user!.id))
        .returning();

      res.json({
        message: "Profile image updated",

        avatarUrl: updatedUser.avatarUrl,
      });
    } catch (error) {
      console.error(error);

      res.status(500).json({
        error: "Failed to update profile image",
      });
    }
  },
);

export default router;
