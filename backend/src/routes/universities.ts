import { Router, type IRouter } from "express";
import {
  db,
  universitiesTable,
  universityMajorsTable,
  majorsTable,
} from "@workspace/db";
import { asc, desc, eq, ilike, or, and, sql, inArray } from "drizzle-orm";
import { requireAdmin, optionalAuth } from "../middlewares/auth";
import {
  getUniversityQualityIssues,
  parseUniversityCsv,
  serializeUniversitiesCsv,
  validateImportRows,
} from "../lib/university-data-quality";

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

const compactUniversityColumns = {
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
};

async function attachMajorSummaries<T extends { id: number }>(universities: T[]) {
  if (universities.length === 0) return [];

  const universityIds = universities.map((u) => u.id);
  const rows = await db
    .select({
      universityId: universityMajorsTable.universityId,
      major: {
        id: majorsTable.id,
        name: majorsTable.name,
        nameEn: majorsTable.nameEn,
        category: majorsTable.category,
      },
    })
    .from(universityMajorsTable)
    .innerJoin(majorsTable, eq(universityMajorsTable.majorId, majorsTable.id))
    .where(inArray(universityMajorsTable.universityId, universityIds));

  const majorsByUniversity = new Map<number, typeof rows[number]["major"][]>();
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

router.get(
  "/admin/universities/data-quality",
  requireAdmin,
  async (_req, res): Promise<void> => {
    const universities = await db.select().from(universitiesTable);
    const majorCounts = await db
      .select({
        universityId: universityMajorsTable.universityId,
        count: sql<number>`count(*)`,
      })
      .from(universityMajorsTable)
      .groupBy(universityMajorsTable.universityId);
    const counts = new Map(majorCounts.map((row) => [row.universityId, Number(row.count)]));
    res.json(getUniversityQualityIssues(universities, counts));
  },
);

router.get(
  "/admin/universities/export.csv",
  requireAdmin,
  async (_req, res): Promise<void> => {
    const universities = await db.select().from(universitiesTable).orderBy(asc(universitiesTable.name));
    const universityIds = universities.map((university) => university.id);
    const links = universityIds.length > 0
      ? await db
          .select({ universityId: universityMajorsTable.universityId, majorId: universityMajorsTable.majorId })
          .from(universityMajorsTable)
          .where(inArray(universityMajorsTable.universityId, universityIds))
      : [];
    const majorIdsByUniversity = new Map<number, number[]>();
    for (const link of links) {
      const ids = majorIdsByUniversity.get(link.universityId) ?? [];
      ids.push(link.majorId);
      majorIdsByUniversity.set(link.universityId, ids);
    }
    const csv = serializeUniversitiesCsv(
      universities.map((university) => ({
        ...university,
        majorIds: majorIdsByUniversity.get(university.id) ?? [],
      })),
    );
    res.setHeader("Content-Type", "text/csv; charset=utf-8");
    res.setHeader("Content-Disposition", `attachment; filename=universities-${new Date().toISOString().slice(0, 10)}.csv`);
    res.send(csv);
  },
);

router.post(
  "/admin/universities/import/preview",
  requireAdmin,
  async (req, res): Promise<void> => {
    const csv = typeof req.body?.csv === "string" ? req.body.csv : "";
    if (!csv.trim()) {
      res.status(400).json({ error: "CSV content is required" });
      return;
    }
    if (Buffer.byteLength(csv, "utf8") > 2_000_000) {
      res.status(413).json({ error: "CSV file is too large; maximum size is 2 MB" });
      return;
    }
    try {
      const rows = parseUniversityCsv(csv);
      const existing = await db
        .select({ id: universitiesTable.id, name: universitiesTable.name, nameEn: universitiesTable.nameEn, abbreviation: universitiesTable.abbreviation })
        .from(universitiesTable);
      const validatedRows = validateImportRows(rows, existing);
      res.json({
        totalRows: validatedRows.length,
        validRows: validatedRows.filter((row) => row.missingRequired.length === 0 && row.invalidFields.length === 0 && !row.duplicateOf).length,
        duplicateRows: validatedRows.filter((row) => Boolean(row.duplicateOf)).length,
        invalidRows: validatedRows.filter((row) => row.missingRequired.length > 0 || row.invalidFields.length > 0).length,
        rows: validatedRows,
      });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Invalid CSV" });
    }
  },
);

router.post(
  "/admin/universities/import",
  requireAdmin,
  async (req, res): Promise<void> => {
    const csv = typeof req.body?.csv === "string" ? req.body.csv : "";
    if (!csv.trim()) {
      res.status(400).json({ error: "CSV content is required" });
      return;
    }
    if (Buffer.byteLength(csv, "utf8") > 2_000_000) {
      res.status(413).json({ error: "CSV file is too large; maximum size is 2 MB" });
      return;
    }
    try {
      const rows = parseUniversityCsv(csv);
      const existing = await db
        .select({ id: universitiesTable.id, name: universitiesTable.name, nameEn: universitiesTable.nameEn, abbreviation: universitiesTable.abbreviation })
        .from(universitiesTable);
      const validatedRows = validateImportRows(rows, existing);
      const importableRows = validatedRows.filter(
        (row) => row.missingRequired.length === 0 && row.invalidFields.length === 0 && !row.duplicateOf,
      );
      const allMajorIds = Array.from(
        new Set(
          importableRows.flatMap((row) => row.values.majorIds.split("|").map((value) => Number(value)).filter((value) => Number.isInteger(value) && value > 0)),
        ),
      );
      const existingMajors = allMajorIds.length > 0
        ? await db.select({ id: majorsTable.id }).from(majorsTable).where(inArray(majorsTable.id, allMajorIds))
        : [];
      const majorIdSet = new Set(existingMajors.map((major) => major.id));
      for (const row of importableRows) {
        const requestedMajorIds = row.values.majorIds.split("|").map((value) => Number(value)).filter((value) => Number.isInteger(value) && value > 0);
        if (requestedMajorIds.some((majorId) => !majorIdSet.has(majorId))) {
          row.invalidFields.push("majorIds");
        }
      }
      const safeRows = importableRows.filter((row) => row.invalidFields.length === 0);
      const insertedIds = await db.transaction(async (tx) => {
        const ids: number[] = [];
        for (const row of safeRows) {
          const [inserted] = await tx
            .insert(universitiesTable)
            .values({
              name: row.values.name.trim(),
              nameEn: row.values.nameEn.trim(),
              abbreviation: row.values.abbreviation.trim() || undefined,
              type: row.values.type.trim(),
              state: row.values.state.trim(),
              city: row.values.city.trim(),
              minScore: Number(row.values.minScore),
              description: row.values.description.trim() || undefined,
              admissionRequirements: row.values.admissionRequirements.trim() || undefined,
              applicationProcess: row.values.applicationProcess.trim() || undefined,
              duration: row.values.duration.trim() || undefined,
              careerOutcomes: row.values.careerOutcomes.trim() || undefined,
              website: row.values.website.trim() || undefined,
              imageUrl: row.values.imageUrl.trim() || undefined,
            })
            .returning({ id: universitiesTable.id });
          ids.push(inserted.id);
          const majorIds = row.values.majorIds.split("|").map((value) => Number(value)).filter((value) => Number.isInteger(value) && value > 0);
          if (majorIds.length > 0) {
            await tx.insert(universityMajorsTable).values(majorIds.map((majorId) => ({ universityId: inserted.id, majorId })));
          }
        }
        return ids;
      });
      res.status(201).json({
        inserted: insertedIds.length,
        skipped: rows.length - insertedIds.length,
        skippedRows: validatedRows.filter((row) => !safeRows.includes(row)),
      });
    } catch (error) {
      res.status(400).json({ error: error instanceof Error ? error.message : "Import failed" });
    }
  },
);

router.get("/universities", optionalAuth, async (req, res): Promise<void> => {
  const {
    search,
    type,
    state,
    page = "1",
    limit = "1000",
    compact: compactParam,
    sortBy = "name",
    sortOrder = "asc",
  } = req.query as Record<string, string>;
  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(1000, parseInt(limit, 10));
  const offset = (pageNum - 1) * limitNum;
  const compact = compactParam === "true";

  const conditions = [];
  if (search) {
    conditions.push(
      or(
        ilike(universitiesTable.name, `%${search}%`),
        ilike(universitiesTable.nameEn, `%${search}%`),
        ilike(universitiesTable.abbreviation, `%${search}%`),
        ilike(universitiesTable.city, `%${search}%`),
        ilike(universitiesTable.state, `%${search}%`),
      ),
    );
  }
  if (type) conditions.push(eq(universitiesTable.type, type));
  if (state) conditions.push(eq(universitiesTable.state, state));

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;
  const sortColumns = {
    name: universitiesTable.name,
    minScore: universitiesTable.minScore,
    type: universitiesTable.type,
    state: universitiesTable.state,
  } as const;
  const sortColumn =
    sortColumns[sortBy as keyof typeof sortColumns] ?? universitiesTable.name;
  const orderBy = sortOrder === "desc" ? desc(sortColumn) : asc(sortColumn);

  if (compact) {
    const compactRows = await db
      .select({
        ...compactUniversityColumns,
        totalCount: sql<number>`count(*) over()`,
      })
      .from(universitiesTable)
      .where(whereClause)
      .limit(limitNum)
      .offset(offset)
      .orderBy(orderBy, asc(universitiesTable.name));

    let total = Number(compactRows[0]?.totalCount ?? 0);
    if (compactRows.length === 0 && offset > 0) {
      const [countResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(universitiesTable)
        .where(whereClause);
      total = Number(countResult.count);
    }
    const universities = compactRows.map(({ totalCount: _totalCount, ...uni }) => uni);
    const withMajorSummaries = await attachMajorSummaries(universities);

    res.json({
      universities: withMajorSummaries,
      total,
      page: pageNum,
      limit: limitNum,
    });
    return;
  }

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
    .orderBy(orderBy, asc(universitiesTable.name));

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
