import { Router, type IRouter } from "express";
import { db, interestGuideOptionsTable, universitiesTable, majorsTable, universityMajorsTable } from "@workspace/db";
import { eq, asc, sql } from "drizzle-orm";
import { requireAdmin } from "../middlewares/auth";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { logger } from "../lib/logger";

const router: IRouter = Router();

/*
 * STUDENT
 * GET /api/interest-guide/options
 */
router.get("/interest-guide/options", async (_req, res): Promise<void> => {
  try {
    const options = await db
      .select()
      .from(interestGuideOptionsTable)
      .where(eq(interestGuideOptionsTable.isActive, true))
      .orderBy(
        asc(interestGuideOptionsTable.category),
        asc(interestGuideOptionsTable.displayOrder),
      );

    res.json(options);
  } catch (error) {
    console.error("Get interest guide options error:", error);

    res.status(500).json({
      error: "Failed to load interest guide options",
    });
  }
});

/*
 * STUDENT NLP ANALYSIS
 * POST /api/interest-guide/analyze
 */
router.post("/interest-guide/analyze", async (req, res): Promise<void> => {
  try {
    const { text } = req.body;

    if (!text || typeof text !== "string" || text.trim().length < 5) {
      res.status(400).json({
        error: "Please provide a more detailed description of your skills and interests.",
      });
      return;
    }

    const apiKey = process.env.GEMINI_API_KEY?.trim();
    if (!apiKey) {
      res.status(500).json({
        error: "AI service is not configured. Please contact admin.",
      });
      return;
    }

    // 1. Fetch all universities and majors to provide context for AI
    const universities = await db.select().from(universitiesTable);
    const majors = await db.select().from(majorsTable);
    
    // 2. Prepare AI Prompt
    const genAI = new GoogleGenerativeAI(apiKey);
    const modelName = process.env.GEMINI_MODEL || "gemini-1.5-flash";
    const model = genAI.getGenerativeModel({ model: modelName });

    const prompt = `
      You are a Career and University Advisor in Myanmar. 
      A student has provided the following description of their skills, interests, and background:
      
      "${text}"
      
      Based on this description and the list of universities and majors provided below, identify the top 10 most suitable universities for this student.
      For each university, provide a "matching score" (0-100%) and 3 specific reasons why it's a good fit.
      
      Universities and their IDs:
      ${universities.map(u => `- ID: ${u.id}, Name: ${u.name} (${u.nameEn}), Min Score: ${u.minScore}`).join("\n")}
      
      Available Majors in Myanmar:
      ${majors.map(m => `- ${m.name} (${m.nameEn})`).join("\n")}
      
      Return ONLY a JSON array of objects with the following structure:
      [
        {
          "universityId": number,
          "score": number,
          "reasons": string[]
        }
      ]
      
      The reasons should be in Burmese language if possible, otherwise English. 
      Make the scoring realistic based on how well the student's interests match the university's type and majors.
    `;

    const result = await model.generateContent(prompt);
    const responseText = result.response.text();
    console.log("AI_RAW_RESPONSE_START");
    console.log(responseText);
    console.log("AI_RAW_RESPONSE_END");
    
    // Extract JSON from potential markdown code blocks
    const jsonMatch = responseText.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      console.error("AI returned invalid format:", responseText);
      throw new Error("AI returned invalid format");
    }
    
    let analysis;
    try {
      analysis = JSON.parse(jsonMatch[0]);
    } catch (e) {
      console.error("Failed to parse AI JSON:", jsonMatch[0]);
      throw new Error("AI returned invalid JSON");
    }
    
    console.log("Parsed Analysis:", JSON.stringify(analysis, null, 2));
    
    // 3. Enrich the results with full university and major data
    const enrichedResults = await Promise.all(
      analysis.slice(0, 10).map(async (item: any) => {
        const targetId = Number(item.universityId);
        const university = universities.find(u => u.id === targetId);
        if (!university) {
          console.warn(`University not found in database: ${item.universityId}`);
          return null;
        }
        
        // Fetch majors for this university
        const uMajors = await db
          .select({
            id: majorsTable.id,
            name: majorsTable.name,
            nameEn: majorsTable.nameEn,
            description: majorsTable.description
          })
          .from(universityMajorsTable)
          .innerJoin(majorsTable, eq(universityMajorsTable.majorId, majorsTable.id))
          .where(eq(universityMajorsTable.universityId, university.id));
          
        return {
          university: {
            ...university,
            majors: uMajors
          },
          score: item.score,
          reasons: item.reasons
        };
      })
    );

    res.json(enrichedResults.filter(Boolean));
  } catch (error) {
    logger.error({ err: error }, "Interest guide NLP analysis error");
    res.status(500).json({
      error: "Failed to analyze your interests. Please try again later.",
    });
  }
});

/*
 * ADMIN
 * GET /api/admin/interest-guide/options
 */
router.get(
  "/admin/interest-guide/options",
  requireAdmin,
  async (_req, res): Promise<void> => {
    try {
      const options = await db
        .select()
        .from(interestGuideOptionsTable)
        .orderBy(
          asc(interestGuideOptionsTable.category),
          asc(interestGuideOptionsTable.displayOrder),
          asc(interestGuideOptionsTable.id),
        );

      res.json(options);
    } catch (error) {
      console.error("Get admin interest guide options error:", error);

      res.status(500).json({
        error: "Failed to load interest guide options",
      });
    }
  },
);

/*
 * ADMIN CREATE
 * POST /api/admin/interest-guide/options
 */
router.post(
  "/admin/interest-guide/options",
  requireAdmin,
  async (req, res): Promise<void> => {
    try {
      const { category, code, name, description, displayOrder, isActive } =
        req.body;

      if (!category || !code || !name) {
        res.status(400).json({
          error: "Category, code and name are required",
        });
        return;
      }

      const [created] = await db
        .insert(interestGuideOptionsTable)
        .values({
          category: String(category).trim(),
          code: String(code).trim(),
          name: String(name).trim(),
          description: description ? String(description).trim() : null,
          displayOrder: displayOrder == null ? 0 : Number(displayOrder),
          isActive: isActive == null ? true : Boolean(isActive),
        })
        .returning();

      res.status(201).json(created);
    } catch (error) {
      console.error("Create interest guide option error:", error);

      res.status(500).json({
        error: "Failed to create interest guide option",
      });
    }
  },
);

/*
 * ADMIN UPDATE
 * PUT /api/admin/interest-guide/options/:id
 */
router.put(
  "/admin/interest-guide/options/:id",
  requireAdmin,
  async (req, res): Promise<void> => {
    try {
      const raw = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;

      const id = parseInt(raw, 10);

      if (Number.isNaN(id)) {
        res.status(400).json({
          error: "Invalid id",
        });
        return;
      }

      const { category, code, name, description, displayOrder, isActive } =
        req.body;

      if (!category || !code || !name) {
        res.status(400).json({
          error: "Category, code and name are required",
        });
        return;
      }

      const [updated] = await db
        .update(interestGuideOptionsTable)
        .set({
          category: String(category).trim(),
          code: String(code).trim(),
          name: String(name).trim(),
          description: description ? String(description).trim() : null,
          displayOrder: displayOrder == null ? 0 : Number(displayOrder),
          isActive: isActive == null ? true : Boolean(isActive),
        })
        .where(eq(interestGuideOptionsTable.id, id))
        .returning();

      if (!updated) {
        res.status(404).json({
          error: "Interest guide option not found",
        });
        return;
      }

      res.json(updated);
    } catch (error) {
      console.error("Update interest guide option error:", error);

      res.status(500).json({
        error: "Failed to update interest guide option",
      });
    }
  },
);

/*
 * ADMIN DELETE
 * DELETE /api/admin/interest-guide/options/:id
 */
router.delete(
  "/admin/interest-guide/options/:id",
  requireAdmin,
  async (req, res): Promise<void> => {
    try {
      const raw = Array.isArray(req.params.id)
        ? req.params.id[0]
        : req.params.id;

      const id = parseInt(raw, 10);

      if (Number.isNaN(id)) {
        res.status(400).json({
          error: "Invalid id",
        });
        return;
      }

      const [deleted] = await db
        .delete(interestGuideOptionsTable)
        .where(eq(interestGuideOptionsTable.id, id))
        .returning();

      if (!deleted) {
        res.status(404).json({
          error: "Interest guide option not found",
        });
        return;
      }

      res.json({
        message: "Interest guide option deleted",
      });
    } catch (error) {
      console.error("Delete interest guide option error:", error);

      res.status(500).json({
        error: "Failed to delete interest guide option",
      });
    }
  },
);

export default router;
