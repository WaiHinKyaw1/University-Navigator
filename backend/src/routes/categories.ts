import { Router, type IRouter } from "express";
import { db, categoriesTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAdmin } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/categories", async (_req, res): Promise<void> => {
  const categories = await db
    .select()
    .from(categoriesTable)
    .orderBy(categoriesTable.name);
  res.json(categories);
});

router.post("/categories", requireAdmin, async (req, res): Promise<void> => {
  const { name, nameEn, color, description } = req.body;
  if (!name || !nameEn) {
    res.status(400).json({ error: "name and nameEn are required" });
    return;
  }

  const [category] = await db
    .insert(categoriesTable)
    .values({ name, nameEn, color, description })
    .returning();
  res.status(201).json(category);
});

router.put("/categories/:id", requireAdmin, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const { name, nameEn, color, description } = req.body;
  const [updated] = await db
    .update(categoriesTable)
    .set({ name, nameEn, color, description })
    .where(eq(categoriesTable.id, id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Category not found" });
    return;
  }

  res.json(updated);
});

router.delete("/categories/:id", requireAdmin, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const [deleted] = await db
    .delete(categoriesTable)
    .where(eq(categoriesTable.id, id))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Category not found" });
    return;
  }

  res.json({ message: "Category deleted" });
});

export default router;
