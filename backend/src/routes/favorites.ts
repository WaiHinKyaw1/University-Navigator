import { Router, type IRouter } from "express";
import { db, favoritesTable, universitiesTable } from "@workspace/db";
import { eq, and } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/favorites", requireAuth, async (req, res) => {
  const data = await db
    .select({
      id: universitiesTable.id,
      name: universitiesTable.name,
    })

    .from(favoritesTable)

    .innerJoin(
      universitiesTable,
      eq(favoritesTable.universityId, universitiesTable.id),
    )

    .where(eq(favoritesTable.userId, req.user!.id));

  res.json(data);
});

router.post("/favorites/:universityId", requireAuth, async (req, res) => {
  const universityId = Number(req.params.universityId);

  const existing = await db
    .select()
    .from(favoritesTable)

    .where(
      and(
        eq(favoritesTable.userId, req.user!.id),

        eq(favoritesTable.universityId, universityId),
      ),
    );

  if (existing.length) {
    res.status(400).json({
      error: "Already saved",
    });

    return;
  }

  await db.insert(favoritesTable).values({
    userId: req.user!.id,

    universityId,
  });

  res.json({
    message: "University saved",
  });
});

// Remove favourite

router.delete("/favorites/:universityId", requireAuth, async (req, res) => {
  const universityId = Number(req.params.universityId);

  await db
    .delete(favoritesTable)

    .where(
      and(
        eq(favoritesTable.userId, req.user!.id),

        eq(favoritesTable.universityId, universityId),
      ),
    );

  res.json({
    message: "Removed",
  });
});

export default router;
