import { Router, type IRouter } from "express";
import { db, newsTable, usersTable } from "@workspace/db";
import { eq, desc, sql, and } from "drizzle-orm";
import { requireAdmin, optionalAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/news", optionalAuth, async (req, res): Promise<void> => {
  const { page = "1", limit = "10" } = req.query as Record<string, string>;
  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(50, parseInt(limit, 10));
  const offset = (pageNum - 1) * limitNum;

  const isAdmin = req.user?.role === "admin";
  const condition = isAdmin ? undefined : eq(newsTable.published, true);

  const [countResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(newsTable)
    .where(condition);

  const articles = await db
    .select({
      news: newsTable,
      authorName: usersTable.name,
    })
    .from(newsTable)
    .leftJoin(usersTable, eq(newsTable.authorId, usersTable.id))
    .where(condition)
    .orderBy(desc(newsTable.createdAt))
    .limit(limitNum)
    .offset(offset);

  res.json({
    articles: articles.map((r) => ({
      ...r.news,
      authorName: r.authorName || "Admin",
    })),
    total: Number(countResult.count),
    page: pageNum,
    limit: limitNum,
  });
});

router.get("/news/:id", optionalAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const [result] = await db
    .select({ news: newsTable, authorName: usersTable.name })
    .from(newsTable)
    .leftJoin(usersTable, eq(newsTable.authorId, usersTable.id))
    .where(eq(newsTable.id, id));

  if (!result) {
    res.status(404).json({ error: "Article not found" });
    return;
  }

  res.json({ ...result.news, authorName: result.authorName || "Admin" });
});

router.post("/news", requireAdmin, async (req, res): Promise<void> => {
  const { title, content, category, imageUrl, published } = req.body;
  if (!title || !content || !category) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  const [article] = await db
    .insert(newsTable)
    .values({
      title,
      content,
      category,
      imageUrl,
      published: published !== false,
      authorId: req.user!.id,
    })
    .returning();

  res.status(201).json({ ...article, authorName: req.user!.name });
});

router.put("/news/:id", requireAdmin, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const { title, content, category, imageUrl, published } = req.body;
  const [updated] = await db
    .update(newsTable)
    .set({ title, content, category, imageUrl, published })
    .where(eq(newsTable.id, id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Article not found" });
    return;
  }

  res.json({ ...updated, authorName: req.user!.name });
});

router.delete("/news/:id", requireAdmin, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const [deleted] = await db.delete(newsTable).where(eq(newsTable.id, id)).returning();
  if (!deleted) {
    res.status(404).json({ error: "Article not found" });
    return;
  }

  res.json({ message: "Article deleted" });
});

export default router;
