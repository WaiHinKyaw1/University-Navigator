import { Router, type IRouter } from "express";
import { db, knowledgeBaseSectionsTable, KNOWLEDGE_CATEGORIES } from "@workspace/db";
import { eq, asc, desc } from "drizzle-orm";
import { requireAdmin } from "../middlewares/auth";

const router: IRouter = Router();

// ─── Public: get active sections (used by chatbot) ───────────────────────────

router.get("/knowledge-base/active", async (_req, res): Promise<void> => {
  const sections = await db
    .select()
    .from(knowledgeBaseSectionsTable)
    .where(eq(knowledgeBaseSectionsTable.isActive, true))
    .orderBy(asc(knowledgeBaseSectionsTable.sortOrder), asc(knowledgeBaseSectionsTable.createdAt));
  res.json({ sections });
});

// ─── Admin: list all sections ─────────────────────────────────────────────────

router.get("/admin/knowledge-base", requireAdmin, async (_req, res): Promise<void> => {
  const sections = await db
    .select()
    .from(knowledgeBaseSectionsTable)
    .orderBy(asc(knowledgeBaseSectionsTable.sortOrder), desc(knowledgeBaseSectionsTable.createdAt));
  res.json({ sections });
});

// ─── Admin: create a section ──────────────────────────────────────────────────

router.post("/admin/knowledge-base", requireAdmin, async (req, res): Promise<void> => {
  const { title, content, category, academicYear, isActive, sortOrder } = req.body;

  if (!title || typeof title !== "string" || !title.trim()) {
    res.status(400).json({ error: "Title is required" });
    return;
  }
  if (!content || typeof content !== "string" || !content.trim()) {
    res.status(400).json({ error: "Content is required" });
    return;
  }
  const cat = KNOWLEDGE_CATEGORIES.includes(category) ? category : "general";

  const [section] = await db
    .insert(knowledgeBaseSectionsTable)
    .values({
      title: title.trim(),
      content: content.trim(),
      category: cat,
      academicYear: academicYear?.trim() || null,
      isActive: isActive !== false,
      sortOrder: typeof sortOrder === "number" ? sortOrder : 0,
    })
    .returning();

  res.status(201).json(section);
});

// ─── Admin: update a section ──────────────────────────────────────────────────

router.put("/admin/knowledge-base/:id", requireAdmin, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId ?? "", 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const { title, content, category, academicYear, isActive, sortOrder } = req.body;
  const updates: Record<string, unknown> = {};
  if (typeof title === "string" && title.trim()) updates.title = title.trim();
  if (typeof content === "string" && content.trim()) updates.content = content.trim();
  if (KNOWLEDGE_CATEGORIES.includes(category)) updates.category = category;
  if (typeof academicYear === "string") updates.academicYear = academicYear.trim() || null;
  if (typeof isActive === "boolean") updates.isActive = isActive;
  if (typeof sortOrder === "number") updates.sortOrder = sortOrder;

  const [updated] = await db
    .update(knowledgeBaseSectionsTable)
    .set(updates)
    .where(eq(knowledgeBaseSectionsTable.id, id))
    .returning();

  if (!updated) { res.status(404).json({ error: "Section not found" }); return; }
  res.json(updated);
});

// ─── Admin: delete a section ──────────────────────────────────────────────────

router.delete("/admin/knowledge-base/:id", requireAdmin, async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(rawId ?? "", 10);
  if (isNaN(id)) { res.status(400).json({ error: "Invalid id" }); return; }

  const [deleted] = await db
    .delete(knowledgeBaseSectionsTable)
    .where(eq(knowledgeBaseSectionsTable.id, id))
    .returning();

  if (!deleted) { res.status(404).json({ error: "Section not found" }); return; }
  res.json({ message: "Section deleted" });
});

// ─── Admin: bulk reorder ──────────────────────────────────────────────────────

router.post("/admin/knowledge-base/reorder", requireAdmin, async (req, res): Promise<void> => {
  const { orders } = req.body as { orders: { id: number; sortOrder: number }[] };
  if (!Array.isArray(orders)) { res.status(400).json({ error: "orders must be an array" }); return; }

  await Promise.all(
    orders.map(({ id, sortOrder }) =>
      db
        .update(knowledgeBaseSectionsTable)
        .set({ sortOrder })
        .where(eq(knowledgeBaseSectionsTable.id, id)),
    ),
  );
  res.json({ message: "Reordered" });
});

export default router;
