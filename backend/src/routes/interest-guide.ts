import { Router, type IRouter } from "express";
import { db, interestGuideOptionsTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import { requireAdmin } from "../middlewares/auth";

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
