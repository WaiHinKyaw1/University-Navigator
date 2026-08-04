import { Router, type IRouter } from "express";
import fs from "node:fs";
import path from "node:path";
import {
  db,
  admissionGuidesTable,
  usersTable,
} from "@workspace/db";
import { desc, eq } from "drizzle-orm";
import { requireAdmin } from "../middlewares/auth";
import {
  admissionGuideUpload,
  deleteAdmissionGuideFile,
  getAdmissionGuideFilePath,
  extractPdfText,
} from "../lib/uploads";
import { importAdmissionDataFromPdfText } from "../lib/pdf-structured-import";
import { logger } from "../lib/logger";

const router: IRouter = Router();

type GuideRow = typeof admissionGuidesTable.$inferSelect;

function formatGuide(
  guide: GuideRow,
  uploadedByName?: string | null,
) {
  return {
    id: guide.id,
    title: guide.title,
    academicYear: guide.academicYear,
    fileName: guide.fileName,
    fileSize: guide.fileSize,
    mimeType: guide.mimeType,
    isActive: guide.isActive,
    uploadedById: guide.uploadedById,
    uploadedByName: uploadedByName || "Admin",
    downloadUrl: `/api/admission-guides/${guide.id}/download`,
    createdAt: guide.createdAt,
    updatedAt: guide.updatedAt,
  };
}


function sendGuideFile(
  res: import("express").Response,
  guide: GuideRow,
): void {
  const filePath = getAdmissionGuideFilePath(guide.storedFileName);
  if (!fs.existsSync(filePath)) {
    res.status(404).json({ error: "PDF file not found on server" });
    return;
  }

  res.setHeader("Content-Type", guide.mimeType);
  res.setHeader(
    "Content-Disposition",
    `inline; filename="${path.basename(guide.fileName)}"`,
  );
  fs.createReadStream(filePath).pipe(res);
}

router.get("/admission-guide", async (_req, res): Promise<void> => {
  const [guide] = await db
    .select()
    .from(admissionGuidesTable)
    .where(eq(admissionGuidesTable.isActive, true))
    .orderBy(desc(admissionGuidesTable.createdAt))
    .limit(1);

  if (!guide) {
    res.status(404).json({ error: "No admission guide available" });
    return;
  }

  const [uploader] = await db
    .select({ name: usersTable.name })
    .from(usersTable)
    .where(eq(usersTable.id, guide.uploadedById));

  res.json(formatGuide(guide, uploader?.name));
});

router.get("/admission-guides", async (_req, res): Promise<void> => {
  const guides = await db
    .select({
      guide: admissionGuidesTable,
      uploadedByName: usersTable.name,
    })
    .from(admissionGuidesTable)
    .leftJoin(usersTable, eq(admissionGuidesTable.uploadedById, usersTable.id))
    .orderBy(desc(admissionGuidesTable.createdAt));

  res.json({
    guides: guides.map((row) => formatGuide(row.guide, row.uploadedByName)),
  });
});

router.get("/admission-guide/download", async (_req, res): Promise<void> => {
  const [guide] = await db
    .select()
    .from(admissionGuidesTable)
    .where(eq(admissionGuidesTable.isActive, true))
    .orderBy(desc(admissionGuidesTable.createdAt))
    .limit(1);

  if (!guide) {
    res.status(404).json({ error: "No admission guide available" });
    return;
  }

  sendGuideFile(res, guide);
});

// Public: download any guide by ID
router.get("/admission-guides/:id/download", async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const [guide] = await db
    .select()
    .from(admissionGuidesTable)
    .where(eq(admissionGuidesTable.id, id));

  if (!guide) {
    res.status(404).json({ error: "Admission guide not found" });
    return;
  }

  sendGuideFile(res, guide);
});

router.get("/admin/admission-guides", requireAdmin, async (_req, res): Promise<void> => {
  const guides = await db
    .select({
      guide: admissionGuidesTable,
      uploadedByName: usersTable.name,
    })
    .from(admissionGuidesTable)
    .leftJoin(usersTable, eq(admissionGuidesTable.uploadedById, usersTable.id))
    .orderBy(desc(admissionGuidesTable.createdAt));

  res.json({
    guides: guides.map((row) => formatGuide(row.guide, row.uploadedByName)),
  });
});

router.post(
  "/admin/admission-guides",
  requireAdmin,
  (req, res, next) => {
    admissionGuideUpload.single("file")(req, res, (err) => {
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
      res.status(400).json({ error: "PDF file is required" });
      return;
    }

    const title =
      typeof req.body.title === "string" && req.body.title.trim()
        ? req.body.title.trim()
        : "Myanmar University Admission Guide";
    const academicYear =
      typeof req.body.academicYear === "string" && req.body.academicYear.trim()
        ? req.body.academicYear.trim()
        : undefined;

    try {
      const [guide] = await db.transaction(async (tx) => {
        await tx
          .update(admissionGuidesTable)
          .set({ isActive: false })
          .where(eq(admissionGuidesTable.isActive, true));

        return tx
          .insert(admissionGuidesTable)
          .values({
            title,
            academicYear,
            fileName: file.originalname,
            storedFileName: file.filename,
            fileSize: file.size,
            mimeType: file.mimetype,
            isActive: true,
            uploadedById: req.user!.id,
          })
          .returning();
      });

      try {
        const rawText = await extractPdfText(file.filename);
        if (rawText.trim()) {
          try {
            const importResult = await importAdmissionDataFromPdfText(rawText, guide.id);
            logger.info(
              {
                guideId: guide.id,
                universitiesImported: importResult.universitiesImported,
                majorsImported: importResult.majorsImported,
              },
              "Imported admission data from uploaded PDF",
            );
          } catch (importError) {
            logger.warn({ err: importError, guideId: guide.id }, "PDF university import failed");
          }
        }
      } catch {
        // PDF extraction failure is non-fatal; guide upload still succeeds
      }

      res.status(201).json(formatGuide(guide, req.user!.name));
    } catch (error) {
      deleteAdmissionGuideFile(file.filename);
      throw error;
    }
  },
);

router.put(
  "/admin/admission-guides/:id/activate",
  requireAdmin,
  async (req, res): Promise<void> => {
    const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const id = parseInt(raw, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }

    const [guide] = await db.transaction(async (tx) => {
      const [existing] = await tx
        .select()
        .from(admissionGuidesTable)
        .where(eq(admissionGuidesTable.id, id));

      if (!existing) {
        return [];
      }

      await tx
        .update(admissionGuidesTable)
        .set({ isActive: false })
        .where(eq(admissionGuidesTable.isActive, true));

      return tx
        .update(admissionGuidesTable)
        .set({ isActive: true })
        .where(eq(admissionGuidesTable.id, id))
        .returning();
    });

    if (!guide) {
      res.status(404).json({ error: "Admission guide not found" });
      return;
    }

    res.json(formatGuide(guide, req.user!.name));
  },
);

router.get(
  "/admin/admission-guides/:id/download",
  requireAdmin,
  async (req, res): Promise<void> => {
    const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const id = parseInt(raw, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }

    const [guide] = await db
      .select()
      .from(admissionGuidesTable)
      .where(eq(admissionGuidesTable.id, id));

    if (!guide) {
      res.status(404).json({ error: "Admission guide not found" });
      return;
    }

    sendGuideFile(res, guide);
  },
);

router.delete(
  "/admin/admission-guides/:id",
  requireAdmin,
  async (req, res): Promise<void> => {
    const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const id = parseInt(raw, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }

    const [deleted] = await db
      .delete(admissionGuidesTable)
      .where(eq(admissionGuidesTable.id, id))
      .returning();

    if (!deleted) {
      res.status(404).json({ error: "Admission guide not found" });
      return;
    }

    deleteAdmissionGuideFile(deleted.storedFileName);
    res.json({ message: "Admission guide deleted" });
  },
);

export default router;
