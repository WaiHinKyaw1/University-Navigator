import { Router, type IRouter } from "express";
import { requireAdmin } from "../middlewares/auth";
import { imageUpload } from "../lib/uploads";

const router: IRouter = Router();

router.post(
  "/admin/upload/image",
  requireAdmin,
  (req, res, next) => {
    imageUpload.single("file")(req, res, (err) => {
      if (err) {
        res.status(400).json({ error: err.message || "Upload failed" });
        return;
      }
      next();
    });
  },
  async (req, res): Promise<void> => {
    const file = req.file;
    if (!file) {
      res.status(400).json({ error: "Image file is required" });
      return;
    }

    // Return the public URL for the uploaded image
    res.status(201).json({ url: `/uploads/images/${file.filename}` });
  },
);

export default router;
