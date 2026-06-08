import { Router, type IRouter } from "express";
import { db, chatbotMessagesTable, universitiesTable, universityMajorsTable, majorsTable } from "@workspace/db";
import { eq, or } from "drizzle-orm";
import { optionalAuth } from "../middlewares/auth";
import { randomUUID } from "crypto";
import OpenAI from "openai";

const router: IRouter = Router();

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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

async function getMatchingMajorsAndUniversities(interests: string[]) {
  if (interests.length === 0) return { majors: [], universities: [] };

  const majorConds = interests.map((cat) => eq(majorsTable.category, cat));
  const suggestedMajors = await db
    .select()
    .from(majorsTable)
    .where(majorConds.length === 1 ? majorConds[0] : or(...majorConds))
    .limit(6);

  let suggestedUniversities: any[] = [];
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

  return { majors: suggestedMajors, universities: suggestedUniversities };
}

router.post("/chatbot/message", optionalAuth, async (req, res): Promise<void> => {
  const { message, sessionId } = req.body;
  if (!message || typeof message !== "string") {
    res.status(400).json({ error: "Message is required" });
    return;
  }

  const session = sessionId || randomUUID();
  const userId = req.user?.id || null;

  await db.insert(chatbotMessagesTable).values({ userId, sessionId: session, role: "user", content: message });

  const interests = detectInterests(message);
  const { majors: suggestedMajors, universities: suggestedUniversities } = await getMatchingMajorsAndUniversities(interests);

  const uniList = suggestedUniversities.map((u) => `- ${u.name} (${u.nameEn}), ${u.state}, အနည်းဆုံး ${u.minScore} မှတ်`).join("\n");
  const majorList = suggestedMajors.map((m) => `- ${m.name} (${m.nameEn})`).join("\n");

  const systemPrompt = `သင်သည် မြန်မာနိုင်ငံ G-12 ကျောင်းသားများကို တက္ကသိုလ်ရွေးချယ်ရာတွင် ကူညီသော AI လမ်းညွှန်ဆရာဖြစ်သည်။ မြန်မာဘာသာဖြင့် ဖြေဆိုပါ။ ကျောင်းသား၏ ဝါသနာနှင့် အကြောင်းများကို နားထောင်ပြီး သင့်တော်သော မေဂျာများနှင့် တက္ကသိုလ်များကို ညွှန်ပြပါ။ ပျော်ရွင်ဖွယ်နှင့် အားပေးသောသဘောဖြင့် ဆက်ဆံပါ။

ဒေတာဘေ့စ်မှ ရရှိသော သတင်းအချက်အလက်များ:
${uniList ? `**သင့်တော်သော တက္ကသိုလ်များ:**\n${uniList}` : ""}
${majorList ? `\n**သင့်တော်သော မေဂျာများ:**\n${majorList}` : ""}

Score Calculator တွင် ရမှတ်ထည့်ကြည့်ရန် အကြံပြုပါ။ ပိုမိုတိကျသော တက္ကသိုလ်ရှာဖွေမှုကို Universities စာမျက်နှာတွင် ပြုလုပ်နိုင်ကြောင်း ပြောပါ။`;

  let reply: string;
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 600,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: message },
      ],
    });
    reply = completion.choices[0]?.message?.content || "ကျေးဇူးပြု၍ နောက်တစ်ကြိမ် ထပ်မံမေးမြန်းပါ။";
  } catch {
    // Fallback to keyword-based if OpenAI fails
    const interestNames: Record<string, string> = {
      engineering: "အင်ဂျင်နီယာ", medical: "ဆေးပညာ", science: "သိပ္ပံနှင့် သင်္ချာ",
      business: "စီးပွားရေး", arts: "အနုပညာနှင့် လူသိပ္ပံ", education: "ပညာရေး", law: "ဥပဒေ",
    };
    if (interests.length === 0) {
      reply = "မင်္ဂလာပါ! ကျွန်တော်က သင့်ဝါသနာပေါ်မူတည်ပြီး တက္ကသိုလ် ညွှန်ပြပေးနိုင်ပါတယ်။ သင် ဘာတွေ ဝါသနာပါလဲ? ဥပမာ - ဆေးပညာ၊ အင်ဂျင်နီယာ၊ စီးပွားရေး၊ ဥပဒေ ကို ပြောပြပါ။";
    } else {
      const interestDisplay = interests.map((i) => interestNames[i] || i).join("၊ ");
      reply = `သင်၏ ဝါသနာများမှာ **${interestDisplay}** နှင့် ဆက်စပ်နေပုံ ရပါတယ်။\n\n`;
      if (suggestedMajors.length > 0) {
        reply += `**သင့်ကို သင့်တော်သော မေဂျာများ:**\n${majorList}\n\n`;
      }
      if (suggestedUniversities.length > 0) {
        reply += `**တက်ရောက်နိုင်သော တက္ကသိုလ်များ:**\n${uniList}\n\nScore Calculator တွင် ရမှတ်စစ်ကြည့်ပါ!`;
      }
    }
  }

  await db.insert(chatbotMessagesTable).values({ userId, sessionId: session, role: "assistant", content: reply });

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

  res.json({ reply, sessionId: session, suggestedUniversities: unisWithMajors, suggestedMajors });
});

router.get("/chatbot/history", optionalAuth, async (req, res): Promise<void> => {
  const userId = req.user?.id;
  if (!userId) { res.json([]); return; }
  const history = await db
    .select()
    .from(chatbotMessagesTable)
    .where(eq(chatbotMessagesTable.userId, userId))
    .orderBy(chatbotMessagesTable.createdAt)
    .limit(100);
  res.json(history);
});

export default router;
