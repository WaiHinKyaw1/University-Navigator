import { Router, type IRouter } from "express";
import { db, universitiesTable, universityMajorsTable, majorsTable } from "@workspace/db";
import { eq, gte } from "drizzle-orm";
import { optionalAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.post("/score/calculate", optionalAuth, async (req, res): Promise<void> => {
  const { totalScore, preferredMajorIds } = req.body;

  if (totalScore == null || isNaN(Number(totalScore))) {
    res.status(400).json({ error: "Invalid total score" });
    return;
  }

  const score = Number(totalScore);

  // Get all universities with their majors
  const allUnis = await db.select().from(universitiesTable).orderBy(universitiesTable.minScore);

  const results = await Promise.all(
    allUnis.map(async (uni) => {
      const uniMajors = await db
        .select({ major: majorsTable })
        .from(universityMajorsTable)
        .innerJoin(majorsTable, eq(universityMajorsTable.majorId, majorsTable.id))
        .where(eq(universityMajorsTable.universityId, uni.id));

      const majors = uniMajors.map((r) => r.major);
      const eligible = score >= uni.minScore;
      const gap = score - uni.minScore;

      // Match score: 100 if eligible and close to min, lower if far above or not eligible
      let matchScore = 0;
      if (eligible) {
        // Higher match score for universities closer to student's score
        matchScore = Math.max(0, 100 - Math.abs(score - uni.minScore) * 0.5);
        if (preferredMajorIds && Array.isArray(preferredMajorIds) && preferredMajorIds.length > 0) {
          const majorMatch = majors.some((m) => preferredMajorIds.includes(m.id));
          if (majorMatch) matchScore = Math.min(100, matchScore + 15);
        }
      } else {
        matchScore = Math.max(0, 50 - Math.abs(gap) * 2);
      }

      return {
        university: { ...uni, majors },
        matchScore: Math.round(matchScore),
        eligible,
        gap,
      };
    }),
  );

  // Sort: eligible first (by matchScore desc), then ineligible (by gap desc = closest)
  results.sort((a, b) => {
    if (a.eligible && !b.eligible) return -1;
    if (!a.eligible && b.eligible) return 1;
    return b.matchScore - a.matchScore;
  });

  res.json(results);
});

export default router;
