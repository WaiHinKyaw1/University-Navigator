import { Router, type IRouter } from "express";
import {
  db,
  universitiesTable,
  universityMajorsTable,
  majorsTable,
} from "@workspace/db";
import { eq, ilike, or, and, sql, inArray } from "drizzle-orm";
import { requireAdmin, optionalAuth } from "../middlewares/auth";

const router: IRouter = Router();

async function getUniversityWithMajors(id: number) {
  const [uni] = await db
    .select()
    .from(universitiesTable)
    .where(eq(universitiesTable.id, id));
  if (!uni) return null;

  const uniMajors = await db
    .select({ major: majorsTable })
    .from(universityMajorsTable)
    .innerJoin(majorsTable, eq(universityMajorsTable.majorId, majorsTable.id))
    .where(eq(universityMajorsTable.universityId, id));

  return { ...uni, majors: uniMajors.map((r) => r.major) };
}

async function attachMajorsToUniversities(
  universities: Array<typeof universitiesTable.$inferSelect>,
) {
  if (universities.length === 0) return [];

  const universityIds = universities.map((u) => u.id);
  const rows = await db
    .select({
      universityId: universityMajorsTable.universityId,
      major: majorsTable,
    })
    .from(universityMajorsTable)
    .innerJoin(majorsTable, eq(universityMajorsTable.majorId, majorsTable.id))
    .where(inArray(universityMajorsTable.universityId, universityIds));

  const majorsByUniversity = new Map<
    number,
    Array<typeof majorsTable.$inferSelect>
  >();
  for (const row of rows) {
    const majors = majorsByUniversity.get(row.universityId) ?? [];
    majors.push(row.major);
    majorsByUniversity.set(row.universityId, majors);
  }

  return universities.map((uni) => ({
    ...uni,
    majors: majorsByUniversity.get(uni.id) ?? [],
  }));
}

router.get("/universities", optionalAuth, async (req, res): Promise<void> => {
  const {
    search,
    type,
    state,
    page = "1",
    limit = "1000",
  } = req.query as Record<string, string>;
  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(1000, parseInt(limit, 10));
  const offset = (pageNum - 1) * limitNum;

  const conditions = [];
  if (search) {
    conditions.push(
      or(
        ilike(universitiesTable.name, `%${search}%`),
        ilike(universitiesTable.nameEn, `%${search}%`),
        ilike(universitiesTable.abbreviation, `%${search}%`),
      ),
    );
  }
  if (type) conditions.push(eq(universitiesTable.type, type));
  if (state) conditions.push(eq(universitiesTable.state, state));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  const [countResult] = await db
    .select({ count: sql<number>`count(*)` })
    .from(universitiesTable)
    .where(whereClause);

  const unis = await db
    .select()
    .from(universitiesTable)
    .where(whereClause)
    .limit(limitNum)
    .offset(offset)
    .orderBy(universitiesTable.name);

  const withMajors = await attachMajorsToUniversities(unis);

  res.json({
    universities: withMajors,
    total: Number(countResult.count),
    page: pageNum,
    limit: limitNum,
  });
});

router.get(
  "/universities/:id",
  optionalAuth,
  async (req, res): Promise<void> => {
    const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const id = parseInt(raw, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }

    const uni = await getUniversityWithMajors(id);
    if (!uni) {
      res.status(404).json({ error: "University not found" });
      return;
    }
    res.json(uni);
  },
);

router.post("/universities", requireAdmin, async (req, res): Promise<void> => {
  const {
    name,
    nameEn,
    abbreviation,
    type,
    state,
    city,
    minScore,
    description,
    website,
    imageUrl,
    majorIds,
  } = req.body;
  if (!name || !nameEn || !type || !state || minScore == null) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  const [uni] = await db
    .insert(universitiesTable)
    .values({
      name,
      nameEn,
      abbreviation,
      type,
      state,
      city,
      minScore,
      description,
      website,
      imageUrl,
    })
    .returning();

  if (majorIds && Array.isArray(majorIds) && majorIds.length > 0) {
    await db
      .insert(universityMajorsTable)
      .values(
        majorIds.map((mid: number) => ({ universityId: uni.id, majorId: mid })),
      );
  }

  const result = await getUniversityWithMajors(uni.id);
  res.status(201).json(result);
});

router.put(
  "/universities/:id",
  requireAdmin,
  async (req, res): Promise<void> => {
    const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const id = parseInt(raw, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }

    const {
      name,
      nameEn,
      abbreviation,
      type,
      state,
      city,
      minScore,
      description,
      website,
      imageUrl,
      majorIds,
    } = req.body;

    const [updated] = await db
      .update(universitiesTable)
      .set({
        name,
        nameEn,
        abbreviation,
        type,
        state,
        city,
        minScore,
        description,
        website,
        imageUrl,
      })
      .where(eq(universitiesTable.id, id))
      .returning();

    if (!updated) {
      res.status(404).json({ error: "University not found" });
      return;
    }

    if (majorIds && Array.isArray(majorIds)) {
      await db
        .delete(universityMajorsTable)
        .where(eq(universityMajorsTable.universityId, id));
      if (majorIds.length > 0) {
        await db
          .insert(universityMajorsTable)
          .values(
            majorIds.map((mid: number) => ({ universityId: id, majorId: mid })),
          );
      }
    }

    const result = await getUniversityWithMajors(id);
    res.json(result);
  },
);

router.delete(
  "/universities/:id",
  requireAdmin,
  async (req, res): Promise<void> => {
    const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
    const id = parseInt(raw, 10);
    if (isNaN(id)) {
      res.status(400).json({ error: "Invalid id" });
      return;
    }

    const [deleted] = await db
      .delete(universitiesTable)
      .where(eq(universitiesTable.id, id))
      .returning();
    if (!deleted) {
      res.status(404).json({ error: "University not found" });
      return;
    }

    res.json({ message: "University deleted" });
  },
);

export default router;
