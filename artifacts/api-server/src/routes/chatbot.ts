import { Router, type IRouter } from "express";
import { db, chatbotMessagesTable, universitiesTable, universityMajorsTable, majorsTable } from "@workspace/db";
import { eq, ilike, or } from "drizzle-orm";
import { optionalAuth } from "../middlewares/auth";
import { randomUUID } from "crypto";

const router: IRouter = Router();

// Keyword-to-category mapping for interest detection
const interestKeywords: Record<string, string[]> = {
  engineering: ["engineer", "mechanical", "electrical", "civil", "electronics", "robot", "machine", "technology", "tech", "coding", "programming", "software", "hardware", "computer science", "it", "information technology", "yeinjan", "အင်ဂျင်နီယာ", "ကွန်ပျူတာ"],
  medical: ["doctor", "medicine", "health", "nurse", "hospital", "biology", "chemistry", "anatomy", "patient", "clinic", "medical", "ဆရာဝန်", "ဆေး", "သူနာပြု", "ကျန်းမာ"],
  science: ["science", "physics", "math", "mathematics", "chemistry", "biology", "research", "lab", "experiment", "သိပ္ပံ", "သင်္ချာ", "ဓာတုဗေဒ"],
  business: ["business", "economics", "finance", "accounting", "management", "entrepreneur", "marketing", "trade", "commerce", "စီးပွားရေး", "ငွေကြေး", "စီမံ"],
  arts: ["art", "design", "creative", "drawing", "painting", "music", "film", "media", "journalism", "literature", "language", "history", "geography", "သမိုင်း", "ဝတ္ထု", "ဘာသာ"],
  education: ["teacher", "teaching", "education", "school", "student", "learn", "ဆရာ", "ဆရာမ", "ပညာ"],
  law: ["law", "legal", "court", "justice", "advocate", "lawyer", "ဥပဒေ", "တရားသူကြီး"],
};

function detectInterests(message: string): string[] {
  const lowerMsg = message.toLowerCase();
  const detected: string[] = [];
  for (const [category, keywords] of Object.entries(interestKeywords)) {
    if (keywords.some((kw) => lowerMsg.includes(kw))) {
      detected.push(category);
    }
  }
  return detected;
}

function buildResponse(interests: string[], universities: any[], majors: any[]): string {
  if (interests.length === 0) {
    return "မင်္ဂလာပါ! ကျွန်တော်က သင့်ဝါသနာပေါ်မူတည်ပြီး တက္ကသိုလ် ညွှန်ပြပေးနိုင်ပါတယ်။ သင် ဘာတွေ ဝါသနာပါလဲ? ဥပမာ - ဆေးပညာ၊ အင်ဂျင်နီယာ၊ စီးပွားရေး၊ ဥပဒေ၊ ဒါမှမဟုတ် အနုပညာ တို့ကို ပြောပြပါ။";
  }

  const interestNames: Record<string, string> = {
    engineering: "အင်ဂျင်နီယာ",
    medical: "ဆေးပညာ",
    science: "သိပ္ပံနှင့် သင်္ချာ",
    business: "စီးပွားရေး",
    arts: "အနုပညာနှင့် လူသိပ္ပံ",
    education: "ပညာရေး",
    law: "ဥပဒေ",
  };

  const interestDisplay = interests.map((i) => interestNames[i] || i).join("၊ ");

  let reply = `သင်၏ ဝါသနာများမှာ **${interestDisplay}** နှင့် ဆက်စပ်နေပုံ ရပါတယ်။\n\n`;

  if (majors.length > 0) {
    reply += `**သင့်ကို သင့်တော်သော မေဂျာများ:**\n`;
    majors.slice(0, 5).forEach((m) => {
      reply += `• ${m.name} (${m.nameEn})\n`;
    });
    reply += "\n";
  }

  if (universities.length > 0) {
    reply += `**တက်ရောက်နိုင်သော တက္ကသိုလ်များ:**\n`;
    universities.slice(0, 5).forEach((u) => {
      reply += `• ${u.name} - ${u.state} (အနည်းဆုံး ${u.minScore} မှတ်)\n`;
    });
    reply += "\nသင်၏ G-12 ရမှတ်ကိုလည်း ထည့်သွင်းကြည့်ပါ Score Calculator တွင် ပိုမိုတိကျသော ရလဒ် ရနိုင်ပါတယ်!";
  } else {
    reply += "Score Calculator တွင် သင်၏ ရမှတ်ထည့်ပြီး ကျောင်းများ ရှာဖွေကြည့်ပါ!";
  }

  return reply;
}

router.post("/chatbot/message", optionalAuth, async (req, res): Promise<void> => {
  const { message, sessionId } = req.body;

  if (!message || typeof message !== "string") {
    res.status(400).json({ error: "Message is required" });
    return;
  }

  const session = sessionId || randomUUID();
  const userId = req.user?.id || null;

  // Save user message
  await db.insert(chatbotMessagesTable).values({
    userId,
    sessionId: session,
    role: "user",
    content: message,
  });

  // Detect interests
  const interests = detectInterests(message);

  // Find matching majors
  let suggestedMajors: any[] = [];
  let suggestedUniversities: any[] = [];

  if (interests.length > 0) {
    const majorConds = interests.map((cat) => eq(majorsTable.category, cat));
    suggestedMajors = await db
      .select()
      .from(majorsTable)
      .where(majorConds.length === 1 ? majorConds[0] : or(...majorConds))
      .limit(5);

    // Find universities with these majors
    if (suggestedMajors.length > 0) {
      const majorIds = suggestedMajors.map((m) => m.id);
      const uniIds = new Set<number>();
      for (const majorId of majorIds) {
        const uniMajors = await db
          .select({ universityId: universityMajorsTable.universityId })
          .from(universityMajorsTable)
          .where(eq(universityMajorsTable.majorId, majorId))
          .limit(10);
        uniMajors.forEach((r) => uniIds.add(r.universityId));
      }

      if (uniIds.size > 0) {
        const allUnis = await db.select().from(universitiesTable).limit(20);
        suggestedUniversities = allUnis.filter((u) => uniIds.has(u.id)).slice(0, 5);
      }
    }

    if (suggestedUniversities.length === 0) {
      suggestedUniversities = await db.select().from(universitiesTable).limit(5);
    }
  }

  const reply = buildResponse(interests, suggestedUniversities, suggestedMajors);

  // Save assistant reply
  await db.insert(chatbotMessagesTable).values({
    userId,
    sessionId: session,
    role: "assistant",
    content: reply,
  });

  // Attach majors to universities
  const unisWithMajors = await Promise.all(
    suggestedUniversities.map(async (uni) => {
      const uniMajors = await db
        .select({ major: majorsTable })
        .from(universityMajorsTable)
        .innerJoin(majorsTable, eq(universityMajorsTable.majorId, majorsTable.id))
        .where(eq(universityMajorsTable.universityId, uni.id));
      return { ...uni, majors: uniMajors.map((r) => r.major) };
    }),
  );

  res.json({
    reply,
    sessionId: session,
    suggestedUniversities: unisWithMajors,
    suggestedMajors,
  });
});

router.get("/chatbot/history", optionalAuth, async (req, res): Promise<void> => {
  const userId = req.user?.id;
  if (!userId) {
    res.json([]);
    return;
  }

  const history = await db
    .select()
    .from(chatbotMessagesTable)
    .where(eq(chatbotMessagesTable.userId, userId))
    .orderBy(chatbotMessagesTable.createdAt)
    .limit(100);

  res.json(history);
});

export default router;
