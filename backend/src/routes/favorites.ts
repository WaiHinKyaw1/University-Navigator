import { Router, type IRouter } from "express";
import { and, eq } from "drizzle-orm";
import { db, favoritesTable, universitiesTable } from "@workspace/db";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/favorites", requireAuth, async (req, res): Promise<void> => {
  const data = await db
    .select({
      favoriteId: favoritesTable.id,
      savedAt: favoritesTable.createdAt,
      university: {
        id: universitiesTable.id,
        name: universitiesTable.name,
        nameEn: universitiesTable.nameEn,
        abbreviation: universitiesTable.abbreviation,
        type: universitiesTable.type,
        state: universitiesTable.state,
        city: universitiesTable.city,
        minScore: universitiesTable.minScore,
        description: universitiesTable.description,
        website: universitiesTable.website,
        imageUrl: universitiesTable.imageUrl,
        createdAt: universitiesTable.createdAt,
      },
    })
    .from(favoritesTable)
    .innerJoin(
      universitiesTable,
      eq(favoritesTable.universityId, universitiesTable.id),
    )
    .where(eq(favoritesTable.userId, req.user!.id))
    .orderBy(favoritesTable.createdAt);

  res.json(data);
});

router.post(
  "/favorites/:universityId",
  requireAuth,
  async (req, res): Promise<void> => {
    const universityId = Number(req.params.universityId);

    if (!Number.isInteger(universityId) || universityId <= 0) {
      res.status(400).json({ error: "Invalid university id" });
      return;
    }

    const [university] = await db
      .select({ id: universitiesTable.id })
      .from(universitiesTable)
      .where(eq(universitiesTable.id, universityId));

    if (!university) {
      res.status(404).json({ error: "University not found" });
      return;
    }

    const [existing] = await db
      .select({ id: favoritesTable.id })
      .from(favoritesTable)
      .where(
        and(
          eq(favoritesTable.userId, req.user!.id),
          eq(favoritesTable.universityId, universityId),
        ),
      );

    if (existing) {
      res.status(409).json({ error: "University is already saved" });
      return;
    }

    await db.insert(favoritesTable).values({
      userId: req.user!.id,
      universityId,
    });

    res.status(201).json({ message: "University saved" });
  },
);

router.delete(
  "/favorites/:universityId",
  requireAuth,
  async (req, res): Promise<void> => {
    const universityId = Number(req.params.universityId);

    if (!Number.isInteger(universityId) || universityId <= 0) {
      res.status(400).json({ error: "Invalid university id" });
      return;
    }

    await db
      .delete(favoritesTable)
      .where(
        and(
          eq(favoritesTable.userId, req.user!.id),
          eq(favoritesTable.universityId, universityId),
        ),
      );

    res.json({ message: "University removed from favorites" });
  },
);

export default router;
