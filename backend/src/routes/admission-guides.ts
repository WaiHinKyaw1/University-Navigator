import { Router, type IRouter } from "express";
import fs from "node:fs";
import path from "node:path";
import {
  db,
  admissionGuidesTable,
  usersTable,
  knowledgeBaseSectionsTable,
  KNOWLEDGE_CATEGORIES,
} from "@workspace/db";
import { desc, eq } from "drizzle-orm";
import { requireAdmin } from "../middlewares/auth";
import {
  admissionGuideUpload,
  deleteAdmissionGuideFile,
  getAdmissionGuideFilePath,
  extractPdfText,
} from "../lib/uploads";

// ─── PDF → Knowledge Base sections auto-extractor ────────────────────────────

type KnowledgeCat = (typeof KNOWLEDGE_CATEGORIES)[number];

const CATEGORY_KEYWORDS: Record<KnowledgeCat, string[]> = {
  admission_requirements: ["requirement", "required", "subject", "ဘာသာ", "လိုအပ်", "G-12", "ဝင်ခွင့်", "သင်ရိုး"],
  score_cutoffs: ["score", "mark", "cut", "မှတ်", "ရမှတ်", "ကတ်ဆော်", "အနည်းဆုံး"],
  programs: ["program", "degree", "major", "course", "ဘွဲ့", "မေဂျာ", "ကောင်စီ", "B.Sc", "B.A", "B.E", "M.B,B.S", "B.C"],
  career_paths: ["career", "job", "salary", "profession", "work", "လုပ်ငန်း", "အလုပ်", "လစာ", "ဘွဲ့ပြီး"],
  preparation_tips: ["prepare", "study", "learn", "ကြိုပြင်", "လေ့လာ", "သင်ကြား", "tip", "advice"],
  general: [],
};

function detectCategory(text: string): KnowledgeCat {
  const lower = text.toLowerCase();
  for (const [cat, kws] of Object.entries(CATEGORY_KEYWORDS) as [KnowledgeCat, string[]][]) {
    if (cat === "general") continue;
    if (kws.some((k) => lower.includes(k.toLowerCase()))) return cat;
  }
  return "general";
}

/**
 * Split raw PDF text into sections. Uses blank-line heuristic and
 * heading detection (all-caps lines / lines ending with ─).
 */
function splitIntoSections(rawText: string): { title: string; content: string; category: KnowledgeCat }[] {
  if (!rawText.trim()) return [];

  const lines = rawText.split(/\r?\n/);
  const sections: { title: string; content: string; category: KnowledgeCat }[] = [];
  let currentTitle = "General Information";
  let currentLines: string[] = [];

  function flush() {
    const content = currentLines.join("\n").trim();
    if (content.length > 30) {
      sections.push({ title: currentTitle, content, category: detectCategory(currentTitle + " " + content) });
    }
    currentLines = [];
  }

  for (const raw of lines) {
    const line = raw.trim();
    // Detect heading: short line (<= 80 chars), ends with no period, mostly uppercase or Myanmar + digit
    const isHeading =
      line.length > 2 &&
      line.length <= 80 &&
      !line.endsWith(".") &&
      (
        /^[A-Z\d\s\-\/]+$/.test(line) ||           // all-caps English
        /^[#*•►▶]+\s/.test(line) ||                  // markdown-style
        /^\d+[\.\)]\s/.test(line) ||                  // numbered
        /^[က-ဿ\s\d\-\/]+$/.test(line.replace(/[\u1000-\u109f]/g, "X"))  // Myanmar heading
      );

    if (isHeading && currentLines.length > 5) {
      flush();
      currentTitle = line.replace(/^[#*•►▶\d\.\)]+\s*/, "").trim() || currentTitle;
    } else {
      if (line) currentLines.push(line);
    }
  }
  flush();

  return sections;
}

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
    downloadUrl: guide.isActive
      ? "/api/admission-guide/download"
      : `/api/admin/admission-guides/${guide.id}/download`,
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

      // ── Auto-extract PDF sections ──────────────────────────────────────────
      try {
        const rawText = await extractPdfText(file.filename);
        if (rawText.trim()) {
          const parsedSections = splitIntoSections(rawText);
          if (parsedSections.length > 0) {
            // Deactivate sections from previous guides
            await db
              .update(knowledgeBaseSectionsTable)
              .set({ isActive: false });

            await db.insert(knowledgeBaseSectionsTable).values(
              parsedSections.map((s, i) => ({
                title: s.title,
                content: s.content,
                category: s.category,
                academicYear: academicYear ?? null,
                isActive: true,
                sortOrder: i,
                sourceGuideId: guide.id,
              })),
            );
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
