import { Router, type IRouter } from "express";
import { db, chatRoomsTable, chatRoomParticipantsTable, chatMessagesTable, usersTable } from "@workspace/db";
import { eq, and, or, desc, inArray, sql } from "drizzle-orm";
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
        .select()
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
      msg: chatMessagesTable,
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
      id: r.msg.id,
      roomId: r.msg.roomId,
      senderId: r.msg.senderId,
      senderName: r.senderName || "Unknown",
      senderAvatar: r.senderAvatar || null,
      content: r.msg.content,
      isFiltered: r.msg.isFiltered,
      createdAt: r.msg.createdAt,
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
