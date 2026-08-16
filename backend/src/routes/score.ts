import { Router, type IRouter } from "express";
import { db, universitiesTable, universityMajorsTable, majorsTable } from "@workspace/db";
import { eq, inArray } from "drizzle-orm";
import { optionalAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.post("/score/calculate", optionalAuth, async (req, res): Promise<void> => {
  const { totalScore, preferredMajorIds } = req.body;

  if (totalScore == null || !Number.isFinite(Number(totalScore))) {
    res.status(400).json({ error: "Invalid total score" });
    return;
  }

  const score = Number(totalScore);
  const selectedMajorIds = Array.isArray(preferredMajorIds)
    ? [...new Set(preferredMajorIds.map(Number).filter((id) => Number.isInteger(id) && id > 0))]
    : [];

  // Get all universities in a single query. This is read-only and preserves every stored record.
  const allUnis = await db.select().from(universitiesTable).orderBy(universitiesTable.minScore);

  if (allUnis.length === 0) {
    res.json([]);
    return;
  }

  // Fetch all university-major mappings in a single batch query (avoid N+1 queries).
  const universityIds = allUnis.map((u) => u.id);
  const allMajorRows = await db
    .select({
      universityId: universityMajorsTable.universityId,
      major: majorsTable,
    })
    .from(universityMajorsTable)
    .innerJoin(majorsTable, eq(universityMajorsTable.majorId, majorsTable.id))
    .where(inArray(universityMajorsTable.universityId, universityIds));

  const majorsByUniversity = new Map<number, Array<typeof majorsTable.$inferSelect>>();
  for (const row of allMajorRows) {
    const existing = majorsByUniversity.get(row.universityId) ?? [];
    existing.push(row.major);
    majorsByUniversity.set(row.universityId, existing);
  }

  // Only include universities the student can actually enter.
  const eligibleUnis = allUnis.filter((uni) => score >= uni.minScore);

  const results = eligibleUnis
    .map((uni) => {
      const majors = majorsByUniversity.get(uni.id) ?? [];
      const eligible = true;
      const gap = score - uni.minScore;
      const matchedMajors = majors.filter((major) => selectedMajorIds.includes(major.id));
      const majorMatch = matchedMajors.length > 0;

      // Score universities closest to the student's total most highly.
      let matchScore = Math.max(0, 100 - Math.abs(gap) * 0.5);
      if (majorMatch) {
        matchScore += 15;
      }

      const recommendationReasons: string[] = [];
      recommendationReasons.push("သင့်ရမှတ်ဖြင့် ဝင်ခွင့်အနိမ့်ဆုံးရမှတ်ကို ဖြည့်မီသည်");
      if (majorMatch) {
        const majorNames = matchedMajors
          .map((major) => major.nameEn || major.name)
          .slice(0, 2)
          .join(", ");
        recommendationReasons.push(`သင်ရွေးထားသော ဘာသာရပ်နှင့် ကိုက်ညီသည်: ${majorNames}`);
      }
      if (gap <= 30) {
        recommendationReasons.push("သင့်ရမှတ်နှင့် ဝင်ခွင့်ဖြတ်မှတ် နီးစပ်သော ရွေးချယ်မှုဖြစ်သည်");
      }

      const recommendationTier = majorMatch ? "strong" : "eligible";

      return {
        university: { ...uni, majors },
        matchScore: Math.min(100, Math.round(matchScore)),
        eligible,
        gap,
        majorMatch,
        recommendationTier,
        recommendationReasons,
      };
    })
    // When subject interests are chosen, only keep universities offering those majors.
    .filter((r) => (selectedMajorIds.length > 0 ? r.majorMatch : true));

  results.sort((a, b) => {
    // Exact major matches first, then by match score.
    if (a.majorMatch !== b.majorMatch) return a.majorMatch ? -1 : 1;
    return b.matchScore - a.matchScore;
  });

  res.json(results);
});

export default router;
