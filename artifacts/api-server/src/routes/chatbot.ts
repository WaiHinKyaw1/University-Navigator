import { Router, type IRouter } from "express";
import { db, chatbotMessagesTable, universitiesTable, universityMajorsTable, majorsTable } from "@workspace/db";
import { eq, or, desc } from "drizzle-orm";
import { optionalAuth } from "../middlewares/auth";
import { randomUUID } from "crypto";
import OpenAI from "openai";

const router: IRouter = Router();
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ─── Comprehensive Myanmar University Admission Knowledge Base ───────────────

const ADMISSION_KNOWLEDGE = `
## မြန်မာနိုင်ငံ တက္ကသိုလ်ဝင်ခွင့် လမ်းညွှန် (ပြည့်စုံသောသတင်း)

### G-12 ဘာသာရပ်များနှင့် အမှတ်စနစ်
- တစ်ဘာသာချင်း ၁၀၀ မှတ် (စုစုပေါင်း ၆၀၀ မှတ်)
- သိပ္ပံဘာသာ (Science): မြန်မာ + အင်္ဂလိပ် + သင်္ချာ + ရူပဗေဒ + ဓာတုဗေဒ + ဇီဝဗေဒ
- ဝိဇ္ဇာဘာသာ (Arts): မြန်မာ + အင်္ဂလိပ် + သင်္ချာ + သမိုင်း + ဘူမိဗေဒ + စီးပွားရေး
- ဘာသာရပ်တွဲ A (သိပ္ပံ+ဝိဇ္ဇာ) ဖြေဆိုနိုင်

### တက္ကသိုလ်အမျိုးအစားနှင့် ဝင်ခွင့်ရမှတ် (၂၀၂၄-၂၀၂၅)

**ဆေးပညာဆိုင်ရာ (Medical)**
- ဆေးတက္ကသိုလ် ရန်ကုန် (၁) - MB,BS: 470+ (သိပ္ပံသာ)
- ဆေးတက္ကသိုလ် ရန်ကုန် (၂) - MB,BS: 460+ (သိပ္ပံသာ)
- ဆေးတက္ကသိုလ် မန္တလေး - MB,BS: 458+ (သိပ္ပံသာ)
- ဆေးဝါးတက္ကသိုလ် ရန်ကုန် - B.Pharm: 430+ (သိပ္ပံသာ)
- ဆေးဝါးတက္ကသိုလ် မန္တလေး - B.Pharm: 425+
- သူနာပြုနှင့်မီးယပ်တက္ကသိုလ် - B.N.Sc: 400+ (သိပ္ပံသာ)
- တိုင်းရင်းဆေးတက္ကသိုလ် - B.T.M: 370+ (သိပ္ပံ/ဝိဇ္ဇာ)
- တိရစ္ဆာန်ဆေးပညာတက္ကသိုလ် - B.V.Sc: 390+ (သိပ္ပံသာ)
- ပြည်သူ့ကျန်းမာရေးတက္ကသိုလ် - MPH: 420+

**နည်းပညာ/အင်ဂျင်နီယာ (Technical)**
- YTU (ရန်ကုန်နည်းပညာ) - B.E: 430+ (သိပ္ပံသာ)
- MTU (မန္တလေးနည်းပညာ) - B.E: 420+
- မြန်မာ့ကျောင်းသူ‌ကျောင်းသားများ ရေကြောင်း - B.E (Marine): 410+
- လေကြောင်းနည်းပညာ - B.E (Aerospace): 415+
- PTU ပြည်နည်းပညာ - B.E: 400+
- မော်လမြိုင်နည်းပညာ - B.E: 395+
- ဟင်္သာတနည်းပညာ - B.E: 385+
- မြစ်ကြီးနားနည်းပညာ - B.E: 375+

**ကွန်ပျူတာ (Computer)**
- UCSY ရန်ကုန် - B.C.Sc/B.C.Tech: 440+ (သိပ္ပံသာ)
- UCSM မန္တလေး - B.C.Sc: 425+
- UCSB ပဲခူး - B.C.Sc: 405+
- UCSMLM မော်လမြိုင် - B.C.Sc: 400+
- UCST တောင်ကြီး - B.C.Sc: 395+
- UCSS စစ်တွေ - B.C.Sc: 390+

**ဝိဇ္ဇာ/သိပ္ပံ (Arts & Science)**
- ရန်ကုန်တက္ကသိုလ် - B.A/B.Sc: 390+ (ဝိဇ္ဇာ/သိပ္ပံ)
- မန္တလေးတက္ကသိုလ် - B.A/B.Sc: 380+
- ဒဂုံတက္ကသိုလ် - B.A/B.Sc: 360+
- မော်လမြိုင်တက္ကသိုလ် - B.A/B.Sc: 355+
- စစ်တွေတက္ကသိုလ် - B.A/B.Sc: 350+
- တောင်ကြီးတက္ကသိုလ် - B.A/B.Sc: 350+
- ဒေသဆိုင်ရာ တက္ကသိုလ်များ - 320-350+
- အဝေးသင်တက္ကသိုလ် - 300+ (ဘာသာရပ်မသတ်မှတ်)

**စီးပွားရေး (Economics/Business)**
- UEY ရန်ကုန် - B.Econ/B.Com/B.Act: 400+
- UEM မန္တလေး - B.Econ/B.Com: 390+

**ဥပဒေ (Law)**
- ULY ရန်ကုန် - LL.B: 395+
- ULM မန္တလေး - LL.B: 385+

**ပညာရေး (Education)**
- UEdu ရန်ကုန် - B.Ed: 375+
- UEdu မန္တလေး - B.Ed: 365+

**ဘာသာစကား (Languages)**
- YUFL ရန်ကုန် (နိုင်ငံခြားဘာသာ) - B.A: 360+ (ဝိဇ္ဇာ/သိပ္ပံ)

### ကျောင်းအမျိုးအစားနှင့် ဘာသာရပ်တွဲ
- ဆေးကျောင်းများ → သိပ္ပံသာ (ရူပ+ဓာတု+ဇီဝ မဖြစ်မနေ)
- နည်းပညာ/ကွန်ပျူတာ → သိပ္ပံသာ (ရူပ+သင်္ချာ အရေးကြီး)
- ဝိဇ္ဇာကျောင်း → ဝိဇ္ဇာ သို့ သိပ္ပံ နှစ်မျိုးလုံး
- စီးပွားရေး → ဝိဇ္ဇာ သို့ သိပ္ပံ နှစ်မျိုးလုံး
- ဥပဒေ → ဝိဇ္ဇာ သို့ သိပ္ပံ နှစ်မျိုးလုံး
- ပညာရေး → ဝိဇ္ဇာ သို့ သိပ္ပံ နှစ်မျိုးလုံး

### ဝင်ခွင့်ဖြည့်ပုံ
- G-12 စာမေးပွဲ မြောက်ပြီးနောက် JEE (Joint Entrance Examination) ဖြေဆိုရ
- ကိုယ်တိုင်ဝင်ခွင့်လျှောက်လွှာ တင်ရ
- မေ-ဇွန် လတွင် ဝင်ခွင့်ကြေငြာ
- ကျောင်း ၃-၅ ခု ဦးစားပေး ရွေးချယ်ရ

### ဝင်ခွင့်ရမှတ် တွက်နည်း
- ဘာသာရပ် ၆ ခုမှ ကောင်းဆုံး ၅ ခုသာ ယူ (ဆေးကျောင်းအတွက် ၆ ခုလုံး)
- Standard Score = (ဘာသာရပ်ရမှတ် × ကိုယ်ချောင်ဆ) + Bonus
- မြန်မာနိုင်ငံ မတ်ထရစ် ၁ မှ ၁၀ ဂရိတ်: 90+ = A, 80-89 = B, 70-79 = C, 60-69 = D

### နာမည်ကြီး Career Path များ
- ဆေးပညာ → ဆရာဝန် (MB,BS) → အထူးကု/GP → ၈-၁၀ နှစ်
- ဆေးဝါး → ဆေးဝါးမှူး (B.Pharm) → ၅ နှစ်
- အင်ဂျင်နီယာ → B.E → ၅ နှစ် → PE License
- ကွန်ပျူတာ → B.C.Sc → ၄ နှစ် → IT Sector
- စီးပွားရေး → B.Econ/B.Com → ၄ နှစ် → Finance/Banking
- ဥပဒေ → LL.B → ၄ နှစ် → Lawyer/Judge
- ပညာရေး → B.Ed → ၄ နှစ် → Teacher
- နိုင်ငံခြားဘာသာ → B.A → ၄ နှစ် → Translation/Diplomacy
`;

// ─── Interest detection ───────────────────────────────────────────────────────

const interestKeywords: Record<string, string[]> = {
  engineering: ["engineer", "mechanical", "electrical", "civil", "electronics", "robot", "machine", "technology", "tech", "build", "construct", "bridge", "coding", "programming", "software", "hardware", "computer science", "it", "information technology", "အင်ဂျင်နီယာ", "ကွန်ပျူတာ", "တည်ဆောက်", "နည်းပညာ", "ytu", "ucsy"],
  medical: ["doctor", "medicine", "health", "nurse", "hospital", "biology", "pharmacy", "anatomy", "patient", "clinic", "heal", "care", "surgery", "ဆရာဝန်", "ဆေး", "သူနာပြု", "ကျန်းမာ", "ဆေးဝါး", "um1", "um2"],
  science: ["science", "physics", "math", "mathematics", "chemistry", "biology", "research", "lab", "experiment", "nature", "discover", "သိပ္ပံ", "သင်္ချာ", "ဓာတုဗေဒ", "ရူပဗေဒ", "ဇီဝဗေဒ"],
  business: ["business", "economics", "finance", "accounting", "management", "entrepreneur", "marketing", "trade", "commerce", "money", "bank", "invest", "စီးပွားရေး", "ငွေကြေး", "စီမံ", "ဘဏ်", "ကုန်သွယ်"],
  arts: ["art", "design", "creative", "draw", "paint", "music", "film", "media", "journalism", "literature", "write", "language", "history", "geography", "culture", "သမိုင်း", "ဘာသာ", "ဝတ္ထု", "ဘူမိ", "ရေးသား", "နိုင်ငံတကာ"],
  education: ["teacher", "teaching", "education", "school", "mentor", "tutor", "ဆရာ", "ဆရာမ", "ပညာရေး", "သင်ကြား"],
  law: ["law", "legal", "court", "justice", "advocate", "lawyer", "rights", "ဥပဒေ", "တရားရုံး", "ရှေ့နေ", "တရား"],
  marine: ["sea", "ship", "marine", "ocean", "boat", "navy", "sailor", "ရေ", "သင်္ဘော", "ရေကြောင်း"],
  aerospace: ["fly", "pilot", "plane", "aircraft", "aviation", "space", "air", "လေ", "လေယာဉ်", "ပျံ", "လေကြောင်"],
  agriculture: ["farm", "plant", "crop", "soil", "agriculture", "forest", "tree", "fish", "nature", "green", "စိုက်", "တောင်သူ", "သစ်တော", "ငါး"],
};

function detectInterests(message: string): string[] {
  const lower = message.toLowerCase();
  return Object.entries(interestKeywords)
    .filter(([, kws]) => kws.some((k) => lower.includes(k)))
    .map(([cat]) => cat);
}

// Map extended interests to DB categories
const interestToDbCategory: Record<string, string[]> = {
  engineering: ["engineering"],
  medical: ["medical"],
  science: ["science", "medical"],
  business: ["business"],
  arts: ["arts"],
  education: ["education"],
  law: ["law"],
  marine: ["engineering"],
  aerospace: ["engineering"],
  agriculture: ["science"],
};

async function getContextData(interests: string[]) {
  if (interests.length === 0) return { majors: [], universities: [] };

  const dbCats = [...new Set(interests.flatMap((i) => interestToDbCategory[i] ?? []))];
  const majorConds = dbCats.map((c) => eq(majorsTable.category, c));
  const suggestedMajors = await db
    .select()
    .from(majorsTable)
    .where(majorConds.length === 1 ? majorConds[0] : or(...majorConds))
    .limit(8);

  const majorIds = suggestedMajors.map((m) => m.id);
  const uniIds = new Set<number>();
  for (const mid of majorIds) {
    const rows = await db
      .select({ universityId: universityMajorsTable.universityId })
      .from(universityMajorsTable)
      .where(eq(universityMajorsTable.majorId, mid))
      .limit(15);
    rows.forEach((r) => uniIds.add(r.universityId));
  }

  let suggestedUniversities: any[] = [];
  if (uniIds.size > 0) {
    const allUnis = await db.select().from(universitiesTable);
    suggestedUniversities = allUnis.filter((u) => uniIds.has(u.id)).slice(0, 8);
  }
  if (suggestedUniversities.length === 0) {
    suggestedUniversities = await db.select().from(universitiesTable).limit(8);
  }

  return { majors: suggestedMajors, universities: suggestedUniversities };
}

// ─── Routes ───────────────────────────────────────────────────────────────────

router.post("/chatbot/message", optionalAuth, async (req, res): Promise<void> => {
  const { message, sessionId } = req.body;
  if (!message || typeof message !== "string") {
    res.status(400).json({ error: "Message is required" });
    return;
  }

  const session = sessionId || randomUUID();
  const userId = req.user?.id || null;

  // Save user message
  await db.insert(chatbotMessagesTable).values({ userId, sessionId: session, role: "user", content: message });

  // Fetch prior turns for this session (for multi-turn context)
  const priorMsgs = await db
    .select()
    .from(chatbotMessagesTable)
    .where(eq(chatbotMessagesTable.sessionId, session))
    .orderBy(chatbotMessagesTable.createdAt)
    .limit(20);

  const interests = detectInterests(message);
  const { majors: suggestedMajors, universities: suggestedUniversities } = await getContextData(interests);

  const uniList = suggestedUniversities
    .map((u) => `• ${u.name} (${u.abbreviation ?? u.nameEn}) — ${u.state} — အနည်းဆုံး ${u.minScore} မှတ်`)
    .join("\n");
  const majorList = suggestedMajors.map((m) => `• ${m.name} (${m.nameEn})`).join("\n");

  const systemPrompt = `သင်သည် မြန်မာနိုင်ငံ G-12 ကျောင်းသားများကို တက္ကသိုလ်ဝင်ခွင့် ကိစ္စများတွင် ကူညီသော AI လမ်းညွှန်ဆရာဖြစ်သည်။

**ဖြေဆိုပုံ စည်းကမ်း:**
- မြန်မာဘာသာဖြင့်သာ ဖြေပါ (English names/abbreviations တွဲသုံးနိုင်)
- ရင်နှီးပျော်ရွင်ပြီး အားပေးသောနည်းဖြင့် ဆက်ဆံပါ
- တိကျသော ရမှတ်များ၊ ဘွဲ့အမည်များ၊ တက္ကသိုလ်နာမည်များ ထည့်ပြောပါ
- ကျောင်းသားသဘောထားကို နားထောင်ပြီး ထပ်မမေးပဲ ချက်ချင်းညွှန်ပြပါ
- ၃-၅ ကြောင်းသာ ဖြေ၊ bullet point သုံးပါ

${ADMISSION_KNOWLEDGE}

${uniList ? `**ဤကျောင်းသား/မ ၏ ဝါသနာနှင့် ကိုက်ညီသော တက္ကသိုလ်များ (ဒေတာဘေ့စ်မှ):**\n${uniList}` : ""}
${majorList ? `\n**သင့်တော်သော မေဂျာများ:**\n${majorList}` : ""}

**အမြဲ အကြံပြုပါ:** Score Calculator ဖြင့် ကိုယ့်ရမှတ်စစ်ကြည့်ပါ၊ Universities စာမျက်နှာတွင် ကျောင်းအပြည့်အဝ ရှာနိုင်ပါသည်။`;

  // Build message history for multi-turn
  const historyMessages: { role: "user" | "assistant"; content: string }[] = priorMsgs
    .slice(0, -1) // exclude the message we just inserted
    .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }));

  let reply: string;
  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_completion_tokens: 700,
      messages: [
        { role: "system", content: systemPrompt },
        ...historyMessages.slice(-10), // last 10 turns
        { role: "user", content: message },
      ],
    });
    reply = completion.choices[0]?.message?.content ?? "ကျေးဇူးပြု၍ နောက်တစ်ကြိမ် ထပ်မံမေးမြန်းပါ။";
  } catch {
    const interestNames: Record<string, string> = {
      engineering: "အင်ဂျင်နီယာ/ကွန်ပျူတာ", medical: "ဆေးပညာ", science: "သိပ္ပံ/သင်္ချာ",
      business: "စီးပွားရေး", arts: "ဝိဇ္ဇာ/ဘာသာ", education: "ပညာရေး",
      law: "ဥပဒေ", marine: "ရေကြောင်း", aerospace: "လေကြောင်း", agriculture: "စိုက်ပျိုး/သစ်တော",
    };
    if (interests.length === 0) {
      reply = "မင်္ဂလာပါ! ကျွန်တော်က G-12 ကျောင်းသားများကို တက္ကသိုလ်ရှာရာတွင် ကူညီပါမည်။ သင်ဘာဝါသနာပါသလဲ? ဒါမှမဟုတ် G-12 ရမှတ် ဘယ်လောက်ရသလဲ ပြောပြပါ။";
    } else {
      reply = `သင်၏ ဝါသနာ **${interests.map((i) => interestNames[i] || i).join("၊ ")}** အတွက် —\n\n`;
      if (majorList) reply += `**မေဂျာများ:**\n${majorList}\n\n`;
      if (uniList) reply += `**တက္ကသိုလ်များ:**\n${uniList}\n\nScore Calculator တွင် ရမှတ်စစ်ကြည့်ပါ!`;
    }
  }

  await db.insert(chatbotMessagesTable).values({ userId, sessionId: session, role: "assistant", content: reply });

  // Attach majors to universities for the response
  const unisWithMajors = await Promise.all(
    suggestedUniversities.map(async (uni) => {
      const rows = await db
        .select({ major: majorsTable })
        .from(universityMajorsTable)
        .innerJoin(majorsTable, eq(universityMajorsTable.majorId, majorsTable.id))
        .where(eq(universityMajorsTable.universityId, uni.id));
      return { ...uni, majors: rows.map((r) => r.major) };
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
