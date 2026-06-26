import { Router, type IRouter } from "express";
import { db, chatRoomsTable, chatRoomParticipantsTable, chatMessagesTable, usersTable } from "@workspace/db";
import { eq, and, desc, inArray, isNull, sql } from "drizzle-orm";
import { requireAuth } from "../middlewares/auth";

const router: IRouter = Router();

const BAD_WORDS = ["အမောင်", "ဆဲ", "မိုက်", "ရူးသွပ်", "fuck", "shit", "damn", "idiot", "stupid"];

function filterContent(content: string): { filtered: string; isFiltered: boolean } {
  let filtered = content;
  let isFiltered = false;
  for (const word of BAD_WORDS) {
    if (filtered.toLowerCase().includes(word.toLowerCase())) {
      filtered = filtered.replace(new RegExp(word, "gi"), "***");
      isFiltered = true;
    }
  }
  return { filtered, isFiltered };
}

type PeerChatMessage = {
  id: number;
  parentId: number | null;
  senderId: number;
  senderName: string;
  senderAvatar: string | null;
  title: string | null;
  content: string;
  isFiltered: boolean;
  answerCount: number;
  createdAt: Date;
  replies: PeerChatMessage[];
};

function buildMessageTree(rows: Array<Omit<PeerChatMessage, "replies">>): PeerChatMessage[] {
  const byId = new Map<number, PeerChatMessage>();
  const roots: PeerChatMessage[] = [];

  for (const row of rows) {
    byId.set(row.id, { ...row, replies: [] });
  }

  for (const message of byId.values()) {
    if (message.parentId && byId.has(message.parentId)) {
      byId.get(message.parentId)!.replies.push(message);
    } else {
      roots.push(message);
    }
  }

  return roots;
}

async function getPeerChatTree(): Promise<PeerChatMessage[]> {
  const rows = await db
    .select({
      id: chatMessagesTable.id,
      parentId: chatMessagesTable.parentId,
      senderId: chatMessagesTable.senderId,
      senderName: usersTable.name,
      senderAvatar: usersTable.avatarUrl,
      title: chatMessagesTable.title,
      content: chatMessagesTable.content,
      isFiltered: chatMessagesTable.isFiltered,
      createdAt: chatMessagesTable.createdAt,
    })
    .from(chatMessagesTable)
    .leftJoin(usersTable, eq(chatMessagesTable.senderId, usersTable.id))
    .where(isNull(chatMessagesTable.roomId))
    .orderBy(desc(chatMessagesTable.createdAt));

  const directAnswerCounts = await db
    .select({
      parentId: chatMessagesTable.parentId,
      count: sql<number>`count(*)`,
    })
    .from(chatMessagesTable)
    .where(isNull(chatMessagesTable.roomId))
    .groupBy(chatMessagesTable.parentId);

  const countByParentId = new Map(
    directAnswerCounts
      .filter((row) => row.parentId !== null)
      .map((row) => [row.parentId!, Number(row.count)]),
  );

  return buildMessageTree(
    rows.map((row) => ({
      ...row,
      senderName: row.senderName || "Unknown",
      senderAvatar: row.senderAvatar || null,
      answerCount: countByParentId.get(row.id) || 0,
    })),
  );
}

router.get("/students", requireAuth, async (req, res): Promise<void> => {
  const { search } = req.query as { search?: string };
  const userId = req.user!.id;

  let students = await db
    .select({
      id: usersTable.id,
      name: usersTable.name,
      grade: usersTable.grade,
      avatarUrl: usersTable.avatarUrl,
    })
    .from(usersTable)
    .where(eq(usersTable.role, "student"))
    .orderBy(usersTable.name)
    .limit(50);

  students = students.filter((s) => s.id !== userId);

  if (search) {
    const searchLower = search.toLowerCase();
    students = students.filter((s) => s.name.toLowerCase().includes(searchLower));
  }

  res.json(students);
});

router.get("/chat/questions", requireAuth, async (_req, res): Promise<void> => {
  const tree = await getPeerChatTree();
  res.json(tree.filter((message) => message.parentId === null));
});

router.post("/chat/questions", requireAuth, async (req, res): Promise<void> => {
  const { title, content } = req.body as { title?: unknown; content?: unknown };

  if (typeof title !== "string" || title.trim().length < 3) {
    res.status(400).json({ error: "Question title is required" });
    return;
  }

  if (typeof content !== "string" || content.trim().length < 3) {
    res.status(400).json({ error: "Question details are required" });
    return;
  }

  const titleResult = filterContent(title.trim());
  const contentResult = filterContent(content.trim());

  const [question] = await db
    .insert(chatMessagesTable)
    .values({
      senderId: req.user!.id,
      title: titleResult.filtered,
      content: contentResult.filtered,
      isFiltered: titleResult.isFiltered || contentResult.isFiltered,
    })
    .returning();

  res.status(201).json({
    id: question.id,
    parentId: question.parentId,
    senderId: question.senderId,
    senderName: req.user!.name,
    senderAvatar: null,
    title: question.title,
    content: question.content,
    isFiltered: question.isFiltered,
    answerCount: 0,
    createdAt: question.createdAt,
    replies: [],
  });
});

router.post("/chat/messages/:messageId/replies", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.messageId) ? req.params.messageId[0] : req.params.messageId;
  const messageId = parseInt(raw, 10);
  if (isNaN(messageId)) {
    res.status(400).json({ error: "Invalid message id" });
    return;
  }

  const { content } = req.body as { content?: unknown };
  if (typeof content !== "string" || content.trim().length < 3) {
    res.status(400).json({ error: "Answer content is required" });
    return;
  }

  const [parent] = await db
    .select()
    .from(chatMessagesTable)
    .where(and(eq(chatMessagesTable.id, messageId), isNull(chatMessagesTable.roomId)));

  if (!parent) {
    res.status(404).json({ error: "Question or answer not found" });
    return;
  }

  const { filtered, isFiltered } = filterContent(content.trim());

  const [reply] = await db
    .insert(chatMessagesTable)
    .values({
      parentId: messageId,
      senderId: req.user!.id,
      content: filtered,
      isFiltered,
    })
    .returning();

  res.status(201).json({
    id: reply.id,
    parentId: reply.parentId,
    senderId: reply.senderId,
    senderName: req.user!.name,
    senderAvatar: null,
    title: reply.title,
    content: reply.content,
    isFiltered: reply.isFiltered,
    answerCount: 0,
    createdAt: reply.createdAt,
    replies: [],
  });
});

router.get("/chat/rooms", requireAuth, async (req, res): Promise<void> => {
  const userId = req.user!.id;

  const userRooms = await db
    .select({ roomId: chatRoomParticipantsTable.roomId })
    .from(chatRoomParticipantsTable)
    .where(eq(chatRoomParticipantsTable.userId, userId));

  const roomIds = userRooms.map((r) => r.roomId);
  if (roomIds.length === 0) {
    res.json([]);
    return;
  }

  const rooms = await db
    .select()
    .from(chatRoomsTable)
    .where(inArray(chatRoomsTable.id, roomIds))
    .orderBy(desc(chatRoomsTable.createdAt));

  const result = await Promise.all(
    rooms.map(async (room) => {
      const participants = await db
        .select({
          id: usersTable.id,
          name: usersTable.name,
          grade: usersTable.grade,
          avatarUrl: usersTable.avatarUrl,
        })
        .from(chatRoomParticipantsTable)
        .innerJoin(usersTable, eq(chatRoomParticipantsTable.userId, usersTable.id))
        .where(eq(chatRoomParticipantsTable.roomId, room.id));

      const [lastMsg] = await db
        .select({
          content: chatMessagesTable.content,
          createdAt: chatMessagesTable.createdAt,
        })
        .from(chatMessagesTable)
        .where(eq(chatMessagesTable.roomId, room.id))
        .orderBy(desc(chatMessagesTable.createdAt))
        .limit(1);

      const [unreadResult] = await db
        .select({ count: sql<number>`count(*)` })
        .from(chatMessagesTable)
        .where(
          and(
            eq(chatMessagesTable.roomId, room.id),
          ),
        );

      return {
        id: room.id,
        participants,
        lastMessage: lastMsg?.content || null,
        lastMessageAt: lastMsg?.createdAt || null,
        unreadCount: 0,
        createdAt: room.createdAt,
      };
    }),
  );

  res.json(result);
});

router.post("/chat/rooms", requireAuth, async (req, res): Promise<void> => {
  const { participantId } = req.body;
  const userId = req.user!.id;

  if (!participantId || participantId === userId) {
    res.status(400).json({ error: "Invalid participant" });
    return;
  }

  // Check if room already exists between these two users
  const userRooms = await db
    .select({ roomId: chatRoomParticipantsTable.roomId })
    .from(chatRoomParticipantsTable)
    .where(eq(chatRoomParticipantsTable.userId, userId));

  const participantRooms = await db
    .select({ roomId: chatRoomParticipantsTable.roomId })
    .from(chatRoomParticipantsTable)
    .where(eq(chatRoomParticipantsTable.userId, participantId));

  const userRoomIds = new Set(userRooms.map((r) => r.roomId));
  const existingRoom = participantRooms.find((r) => userRoomIds.has(r.roomId));

  if (existingRoom) {
    const [room] = await db.select().from(chatRoomsTable).where(eq(chatRoomsTable.id, existingRoom.roomId));
    const participants = await db
      .select({
        id: usersTable.id,
        name: usersTable.name,
        grade: usersTable.grade,
        avatarUrl: usersTable.avatarUrl,
      })
      .from(chatRoomParticipantsTable)
      .innerJoin(usersTable, eq(chatRoomParticipantsTable.userId, usersTable.id))
      .where(eq(chatRoomParticipantsTable.roomId, room.id));

    res.json({ id: room.id, participants, lastMessage: null, lastMessageAt: null, unreadCount: 0, createdAt: room.createdAt });
    return;
  }

  const [room] = await db.insert(chatRoomsTable).values({}).returning();
  await db.insert(chatRoomParticipantsTable).values([
    { roomId: room.id, userId },
    { roomId: room.id, userId: participantId },
  ]);

  const participants = await db
    .select({
      id: usersTable.id,
      name: usersTable.name,
      grade: usersTable.grade,
      avatarUrl: usersTable.avatarUrl,
    })
    .from(chatRoomParticipantsTable)
    .innerJoin(usersTable, eq(chatRoomParticipantsTable.userId, usersTable.id))
    .where(eq(chatRoomParticipantsTable.roomId, room.id));

  res.json({ id: room.id, participants, lastMessage: null, lastMessageAt: null, unreadCount: 0, createdAt: room.createdAt });
});

router.get("/chat/rooms/:roomId/messages", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.roomId) ? req.params.roomId[0] : req.params.roomId;
  const roomId = parseInt(raw, 10);
  if (isNaN(roomId)) {
    res.status(400).json({ error: "Invalid room id" });
    return;
  }

  // Verify user is participant
  const [participant] = await db
    .select()
    .from(chatRoomParticipantsTable)
    .where(and(eq(chatRoomParticipantsTable.roomId, roomId), eq(chatRoomParticipantsTable.userId, req.user!.id)));

  if (!participant && req.user!.role !== "admin") {
    res.status(403).json({ error: "Not a participant" });
    return;
  }

  const messages = await db
    .select({
      id: chatMessagesTable.id,
      roomId: chatMessagesTable.roomId,
      senderId: chatMessagesTable.senderId,
      content: chatMessagesTable.content,
      isFiltered: chatMessagesTable.isFiltered,
      createdAt: chatMessagesTable.createdAt,
      senderName: usersTable.name,
      senderAvatar: usersTable.avatarUrl,
    })
    .from(chatMessagesTable)
    .leftJoin(usersTable, eq(chatMessagesTable.senderId, usersTable.id))
    .where(eq(chatMessagesTable.roomId, roomId))
    .orderBy(chatMessagesTable.createdAt)
    .limit(100);

  res.json(
    messages.map((r) => ({
      id: r.id,
      roomId: r.roomId,
      senderId: r.senderId,
      senderName: r.senderName || "Unknown",
      senderAvatar: r.senderAvatar || null,
      content: r.content,
      isFiltered: r.isFiltered,
      createdAt: r.createdAt,
    })),
  );
});

router.post("/chat/rooms/:roomId/messages", requireAuth, async (req, res): Promise<void> => {
  const raw = Array.isArray(req.params.roomId) ? req.params.roomId[0] : req.params.roomId;
  const roomId = parseInt(raw, 10);
  if (isNaN(roomId)) {
    res.status(400).json({ error: "Invalid room id" });
    return;
  }

  const { content } = req.body;
  if (!content || typeof content !== "string") {
    res.status(400).json({ error: "Content is required" });
    return;
  }

  // Verify participant
  const [participant] = await db
    .select()
    .from(chatRoomParticipantsTable)
    .where(and(eq(chatRoomParticipantsTable.roomId, roomId), eq(chatRoomParticipantsTable.userId, req.user!.id)));

  if (!participant) {
    res.status(403).json({ error: "Not a participant" });
    return;
  }

  const { filtered, isFiltered } = filterContent(content);

  const [msg] = await db
    .insert(chatMessagesTable)
    .values({ roomId, senderId: req.user!.id, content: filtered, isFiltered })
    .returning();

  res.status(201).json({
    id: msg.id,
    roomId: msg.roomId,
    senderId: msg.senderId,
    senderName: req.user!.name,
    senderAvatar: null,
    content: msg.content,
    isFiltered: msg.isFiltered,
    createdAt: msg.createdAt,
  });
});

export default router;
