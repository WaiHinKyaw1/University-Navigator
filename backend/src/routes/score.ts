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

  const results = allUnis.map((uni) => {
    const majors = majorsByUniversity.get(uni.id) ?? [];
    const eligible = score >= uni.minScore;
    const gap = score - uni.minScore;
    const matchedMajors = majors.filter((major) => selectedMajorIds.includes(major.id));
    const majorMatch = matchedMajors.length > 0;

    let matchScore = 0;
    if (eligible) {
      // Prefer universities near the student's score, while still rewarding eligibility.
      matchScore = Math.max(0, 100 - Math.abs(score - uni.minScore) * 0.5);
    } else {
      // Keep nearby options visible as stretch recommendations.
      matchScore = Math.max(0, 50 - Math.abs(gap) * 2);
    }

    if (majorMatch) {
      matchScore += eligible ? 15 : 8;
    }

    const recommendationReasons: string[] = [];
    if (eligible) {
      recommendationReasons.push("သင်ရမှတ်ဖြင့် ဝင်ခွင့်အနိမ့်ဆုံးရမှတ်ကို ဖြည့်မီသည်");
    } else {
      recommendationReasons.push(`ဝင်ခွင့်ရရန် ${Math.abs(gap)} မှတ် လိုအပ်သေးသည်`);
    }
    if (majorMatch) {
      const majorNames = matchedMajors
        .map((major) => major.nameEn || major.name)
        .slice(0, 2)
        .join(", ");
      recommendationReasons.push(`သင်ရွေးထားသော ဘာသာရပ်နှင့် ကိုက်ညီသည်: ${majorNames}`);
    } else if (selectedMajorIds.length > 0) {
      recommendationReasons.push("ရွေးထားသော ဘာသာရပ်များ မတွေ့ပါ; အခြားဘာသာရပ်များကိုလည်း စစ်ဆေးပါ");
    }
    if (eligible && Math.abs(gap) <= 30) {
      recommendationReasons.push("သင့်ရမှတ်နှင့် ဝင်ခွင့်ဖြတ်မှတ် နီးစပ်သော ရွေးချယ်မှုဖြစ်သည်");
    }

    const recommendationTier = majorMatch && eligible
      ? "strong"
      : eligible
        ? "eligible"
        : Math.abs(gap) <= 30
          ? "near"
          : "stretch";

    return {
      university: { ...uni, majors },
      matchScore: Math.min(100, Math.round(matchScore)),
      eligible,
      gap,
      majorMatch,
      recommendationTier,
      recommendationReasons,
    };
  });

  results.sort((a, b) => {
    if (a.eligible && !b.eligible) return -1;
    if (!a.eligible && b.eligible) return 1;
    return b.matchScore - a.matchScore;
  });

  res.json(results);
});

export default router;
