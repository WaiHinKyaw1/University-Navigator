import { Router, type IRouter } from "express";
import {
  db,
  usersTable,
  auditLogsTable,
  chatMessagesTable,
  newsTable,
  universitiesTable,
  universityMajorsTable,
  majorsTable,
} from "@workspace/db";
import { eq, ilike, or, sql, desc } from "drizzle-orm";
import { requireAdmin, requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

router.get("/users", requireAdmin, async (req, res): Promise<void> => {
  const { search, status, page = "1", limit = "20" } = req.query as Record<string, string>;
  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(100, parseInt(limit, 10));
  const offset = (pageNum - 1) * limitNum;

  let query = db.select().from(usersTable).$dynamic();
  let countQuery = db.select({ count: sql<number>`count(*)` }).from(usersTable).$dynamic();

  if (search) {
    const cond = or(ilike(usersTable.name, `%${search}%`), ilike(usersTable.email, `%${search}%`));
    query = query.where(cond);
    countQuery = countQuery.where(cond);
  }
  if (status) {
    query = query.where(eq(usersTable.status, status));
    countQuery = countQuery.where(eq(usersTable.status, status));
  }

  const [countResult] = await countQuery;
  const users = await query.limit(limitNum).offset(offset).orderBy(desc(usersTable.createdAt));

  res.json({
    users: users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      status: u.status,
      avatarUrl: u.avatarUrl,
      createdAt: u.createdAt,
    })),
    total: Number(countResult.count),
    page: pageNum,
    limit: limitNum,
  });
});

router.get("/users/:id", requireAdmin, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, id));
  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  res.json({
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    status: user.status,
    avatarUrl: user.avatarUrl,
    createdAt: user.createdAt,
  });
});

router.post("/users/:id/ban", requireAdmin, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const id = parseInt(raw, 10);
  if (isNaN(id)) {
    res.status(400).json({ error: "Invalid id" });
    return;
  }

  const { banned, reason } = req.body;

  const [updated] = await db
    .update(usersTable)
    .set({ status: banned ? "banned" : "active", banReason: banned ? reason : null })
    .where(eq(usersTable.id, id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  // Log the action
  await db.insert(auditLogsTable).values({
    adminId: req.user!.id,
    action: banned ? "ban_user" : "unban_user",
    targetType: "user",
    targetId: id,
    details: reason || null,
  });

  res.json({
    id: updated.id,
    name: updated.name,
    email: updated.email,
    role: updated.role,
    status: updated.status,
    avatarUrl: updated.avatarUrl,
    createdAt: updated.createdAt,
  });
});

// Analytics
router.get("/admin/analytics/overview", requireAdmin, async (req, res): Promise<void> => {
  const [totalUsers] = await db.select({ count: sql<number>`count(*)` }).from(usersTable);
  const [totalUnis] = await db.select({ count: sql<number>`count(*)` }).from(universitiesTable);
  const [totalMajors] = await db.select({ count: sql<number>`count(*)` }).from(majorsTable);
  const [totalChatMsgs] = await db.select({ count: sql<number>`count(*)` }).from(chatMessagesTable);
  const [activeUsers] = await db.select({ count: sql<number>`count(*)` }).from(usersTable).where(eq(usersTable.status, "active"));
  const [bannedUsers] = await db.select({ count: sql<number>`count(*)` }).from(usersTable).where(eq(usersTable.status, "banned"));
  const [totalNews] = await db.select({ count: sql<number>`count(*)` }).from(newsTable);

  res.json({
    totalUsers: Number(totalUsers.count),
    totalUniversities: Number(totalUnis.count),
    totalMajors: Number(totalMajors.count),
    totalMessages: Number(totalChatMsgs.count),
    activeUsers: Number(activeUsers.count),
    bannedUsers: Number(bannedUsers.count),
    totalNewsArticles: Number(totalNews.count),
  });
});

router.get("/admin/analytics/major-distribution", requireAdmin, async (req, res): Promise<void> => {
  const majors = await db
    .select({
      majorName: majorsTable.nameEn,
      count: sql<number>`count(${universityMajorsTable.id})`,
    })
    .from(universityMajorsTable)
    .innerJoin(majorsTable, eq(universityMajorsTable.majorId, majorsTable.id))
    .groupBy(majorsTable.id, majorsTable.nameEn)
    .orderBy(desc(sql`count(${universityMajorsTable.id})`))
    .limit(10);

  res.json(majors.map((m) => ({ majorName: m.majorName, count: Number(m.count) })));
});

router.get("/admin/analytics/registration-trend", requireAdmin, async (req, res): Promise<void> => {
  const trend = await db
    .select({
      month: sql<string>`to_char(created_at, 'YYYY-MM')`,
      count: sql<number>`count(*)`,
    })
    .from(usersTable)
    .groupBy(sql`to_char(created_at, 'YYYY-MM')`)
    .orderBy(sql`to_char(created_at, 'YYYY-MM')`)
    .limit(12);

  res.json(trend.map((t) => ({ month: t.month, count: Number(t.count) })));
});

router.get("/admin/audit-logs", requireAdmin, async (req, res): Promise<void> => {
  const { page = "1", limit = "20" } = req.query as Record<string, string>;
  const pageNum = Math.max(1, parseInt(page, 10));
  const limitNum = Math.min(100, parseInt(limit, 10));
  const offset = (pageNum - 1) * limitNum;

  const [countResult] = await db.select({ count: sql<number>`count(*)` }).from(auditLogsTable);

  const logs = await db
    .select({
      log: auditLogsTable,
      adminName: usersTable.name,
    })
    .from(auditLogsTable)
    .leftJoin(usersTable, eq(auditLogsTable.adminId, usersTable.id))
    .orderBy(desc(auditLogsTable.createdAt))
    .limit(limitNum)
    .offset(offset);

  res.json({
    logs: logs.map((r) => ({
      id: r.log.id,
      adminId: r.log.adminId,
      adminName: r.adminName || "Admin",
      action: r.log.action,
      targetType: r.log.targetType,
      targetId: r.log.targetId,
      details: r.log.details,
      createdAt: r.log.createdAt,
    })),
    total: Number(countResult.count),
    page: pageNum,
    limit: limitNum,
  });
});

export default router;
