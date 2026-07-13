import { Router, type IRouter } from "express";
import { db, majorsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { requireAdmin } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/majors", async (_req, res): Promise<void> => {
  const majors = await db.select().from(majorsTable).orderBy(majorsTable.nameEn);
  res.json(majors);
});

router.post("/majors", requireAdmin, async (req, res): Promise<void> => {
  const { name, nameEn, category, description, duration, careerPaths } = req.body;
  if (!name || !nameEn || !category) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  const [major] = await db
    .insert(majorsTable)
    .values({ name, nameEn, category, description, duration, careerPaths })
    .returning();
  res.status(201).json(major);
});

router.put("/majors/:id", requireAdmin, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const { name, nameEn, category, description, duration, careerPaths } = req.body;
  const [updated] = await db
    .update(majorsTable)
    .set({ name, nameEn, category, description, duration, careerPaths })
    .where(eq(majorsTable.id, id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Major not found" });
    return;
  }

  res.json(updated);
});

router.delete("/majors/:id", requireAdmin, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const [deleted] = await db.delete(majorsTable).where(eq(majorsTable.id, id)).returning();
  if (!deleted) {
    res.status(404).json({ error: "Major not found" });
    return;
  }

  res.json({ message: "Major deleted" });
});

export default router;
