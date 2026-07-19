import { Router, type IRouter } from "express";
import { randomUUID } from "crypto";
import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { optionalAuth } from "../middlewares/auth";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const SYSTEM_PROMPT = `သင်သည် "Myanmar University Admission" project အတွက် G-12 ကျောင်းသားများကို ကူညီသော AI တက္ကသိုလ် လမ်းညွှန်ဖြစ်သည်။

**လက်ခံ၍ ဖြေကြားမည့် အကြောင်းအရာများ:**
- မြန်မာနိုင်ငံတက္ကသိုလ်များ၊ ကျောင်းဝင်ခွင့်၊ G-12 ရမှတ်
- မေဂျာ/ဘာသာ ရွေးချယ်မှု (ဆေးပညာ၊ Engineering၊ Arts၊ Commerce စသည်)
- ဘွဲ့နှင့် ဆိုင်သော အလုပ်အကိုင်နှင့် career path
- ဤ project နှင့် သက်ဆိုင်သော university finder၊ admission guide အသုံးပြုမှု

**မဖြေကြားရ — ယဉ်ကျေးစွာ ငြင်းပါ:**
- နိုင်ငံရေး၊ ဘာသာရေး အငြင်းပွားမှု
- ဤ project နှင့် မသက်ဆိုင်သော general knowledge၊ entertainment၊ coding၊ personal advice
- Off-topic မေးခွန်း ရရှိပါက "ကျွန်တော်/ကျွန်မ က တက္ကသိုလ်ဝင်ခွင့်၊ မေဂျာနှင့် career guide များသာ ကူညီနိုင်ပါသည်" ဟု ပြန်ပြောပြီး project ဆိုင်ရာ မေးခွန်း မိတ်ဆက်ပါ။

**ဘာသာစကား:**
- မြန်မာဘာသာဖြင့် ကောင်းကောင်း ဖြေပါ (English abbreviations: UCSY, YTU စသည် သုံးနိုင်)
- ရိုးရှင်းပြီး ကျောင်းသားများ နားလည်နိုင်သော စကားလုံးများ
- bullet point သို့မဟုတ် ၃-၅ ကြောင်း အတိုချုပ်

**ပုံစံ:**
- friendly၊ encouraging tone — တက္ကသိုလ် မသိသေးရင် စ worry မလုပ်ပါနဲ့ လို့ ပြောပြီး လမ်းညွှန်ပါ
- ရမှတ်/ဘာသာတွဲ မသိသေးရင် အတင်းမမေးပါနှင့်`;

type HistoryMessage = { role: "user" | "assistant"; content: string };

type LlmProvider = "gemini" | "openai";

function getGeminiModel(): string {
  return process.env.GEMINI_MODEL?.trim() || "gemini-2.0-flash";
}

function getOpenAiModel(): string {
  return process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
}

function parseHistory(raw: unknown): HistoryMessage[] {
  if (!Array.isArray(raw)) return [];

  return raw
    .filter(
      (item): item is HistoryMessage =>
        typeof item === "object" &&
        item !== null &&
        (item.role === "user" || item.role === "assistant") &&
        typeof item.content === "string" &&
        item.content.trim().length > 0,
    )
    .slice(-10);
}

function isProviderFallbackError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message.toLowerCase();
  return (
    msg.includes("429") ||
    msg.includes("quota") ||
    msg.includes("rate limit") ||
    msg.includes("401") ||
    msg.includes("403") ||
    msg.includes("invalid api key") ||
    msg.includes("api key")
  );
}

function getChatErrorMessage(
  error: unknown,
  hasGemini: boolean,
  hasOpenAi: boolean,
): string {
  if (!hasGemini && !hasOpenAi) {
    return "AI key မရှိပါ။ .env ထဲ GEMINI_API_KEY သို့မဟုတ် OPENAI_API_KEY ထည့်ပြီး server restart လုပ်ပါ။";
  }

  if (isProviderFallbackError(error)) {
    const msg = error instanceof Error ? error.message.toLowerCase() : "";
    if (msg.includes("quota")) {
      return "AI quota ကုန်သွားပါပြီ။ API account မှာ credits/billing စစ်ပါ။";
    }
    if (msg.includes("401") || msg.includes("403") || msg.includes("api key")) {
      return "AI API key မမှန်ပါ။ .env ထဲ key ကို စစ်ပြီး restart လုပ်ပါ။";
    }
  }

  return "AI နှင့် ချိတ်ဆက်ရာတွင် ပြဿနာရှိနေပါသည်။ ခဏန후 ထပ်မံကြိုးစားပါ။";
}

async function completeWithGemini(
  history: HistoryMessage[],
  message: string,
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: getGeminiModel(),
    systemInstruction: SYSTEM_PROMPT,
  });

  const chat = model.startChat({
    history: history.map((item) => ({
      role: item.role === "assistant" ? "model" : "user",
      parts: [{ text: item.content }],
    })),
  });

  const result = await chat.sendMessage(message);
  return (
    result.response.text()?.trim() ||
    "ကျေးဇူးပြု၍ နောက်တစ်ကြိမ် ထပ်မံမေးမြန်းပါ။"
  );
}

async function completeWithOpenAI(
  history: HistoryMessage[],
  message: string,
): Promise<string> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new Error("OPENAI_API_KEY not configured");

  const client = new OpenAI({
    apiKey,
    baseURL: "https://openrouter.ai/api/v1",
  });
  const completion = await client.chat.completions.create({
    model: getOpenAiModel(),
    max_tokens: 800,
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      ...history.map((item) => ({
        role: item.role as "user" | "assistant",
        content: item.content,
      })),
      { role: "user", content: message },
    ],
  });

  return (
    completion.choices[0]?.message?.content?.trim() ||
    "ကျေးဇူးပြု၍ နောက်တစ်ကြိမ် ထပ်မံမေးမြန်းပါ။"
  );
}

async function completeChat(
  history: HistoryMessage[],
  message: string,
): Promise<string> {
  const hasGemini = !!process.env.GEMINI_API_KEY?.trim();
  const hasOpenAi = !!process.env.OPENAI_API_KEY?.trim();

  if (!hasGemini && !hasOpenAi) {
    throw new Error("No LLM API key configured");
  }

  const providers: LlmProvider[] = [
    ...(hasOpenAi ? (["openai"] as const) : []),
    ...(hasGemini ? (["gemini"] as const) : []),
  ];

  let lastError: unknown;
  for (let i = 0; i < providers.length; i += 1) {
    const provider = providers[i];
    try {
      if (provider === "gemini") {
        return await completeWithGemini(history, message);
      }
      return await completeWithOpenAI(history, message);
    } catch (error) {
      lastError = error;
      const hasNext = i < providers.length - 1;
      if (hasNext && isProviderFallbackError(error)) {
        logger.warn(
          { err: error, provider },
          "LLM provider failed, trying fallback",
        );
        continue;
      }
      logger.error({ err: error, provider }, "Chatbot LLM request failed");
      throw error;
    }
  }

  throw lastError ?? new Error("LLM request failed");
}

if (
  !process.env.GEMINI_API_KEY?.trim() &&
  !process.env.OPENAI_API_KEY?.trim()
) {
  logger.warn(
    "Neither GEMINI_API_KEY nor OPENAI_API_KEY is set — chatbot will return an error until one is configured",
  );
}

router.post(
  "/chatbot/message",
  optionalAuth,
  async (req, res): Promise<void> => {
    const { message, sessionId, history } = req.body;
    if (!message || typeof message !== "string") {
      res.status(400).json({ error: "Message is required" });
      return;
    }

    const session = sessionId || randomUUID();
    const conversationHistory = parseHistory(history);

    let reply: string;
    try {
      reply = await completeChat(conversationHistory, message.trim());
    } catch (error) {
      console.error("GEMINI ERROR:", error);
      reply = getChatErrorMessage(
        error,
        !!process.env.GEMINI_API_KEY?.trim(),
        !!process.env.OPENAI_API_KEY?.trim(),
      );
    }

    res.json({ reply, sessionId: session });
  },
);

export default router;
