import { Router, type IRouter } from "express";
import { randomUUID } from "crypto";
import OpenAI from "openai";
import { GoogleGenerativeAI } from "@google/generative-ai";
import { optionalAuth } from "../middlewares/auth";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const SYSTEM_PROMPT = `သင်သည် ကျောင်းသားများအတွက် တက္ကသိုလ်ဝင်ခွင့်၊ မေဂျာရွေးချယ်မှု၊ အလုပ်အကိုင်နှင့် လစာအကြောင်းကို ဆွေးနွေးတိုင်ပင်ပေးမည့် ဖော်ရွေသော အစ်ကို/အစ်မ (Career Advisor) တစ်ယောက်ကဲ့သို့ ပြုမူရမည်။

**လိုက်နာရမည့် အဓိက စည်းမျဉ်းများ:**

၁။ **စကားပြောဆိုပုံ (Conversational Tone):**

- စက်ရုပ် (AI) လိုမပြောဘဲ၊ လူအချင်းချင်း စကားပြောသလို သဘာဝကျကျ (Conversational) ပြောပါ။
- အချက်အလက်များကို Bullet Point (၁၊ ၂၊ ၃) ချပြီး ရှင်းပြခြင်းကို လုံးဝ (လုံးဝ) မလုပ်ပါနှင့်။ စာပိုဒ်တိုလေးတွေနဲ့သာ ဖြေပါ။
- အဖြေကို တိုတိုနဲ့ လိုရင်းတိုရှင်း (စာကြောင်း ၂ ကြောင်း သို့မဟုတ် ၃ ကြောင်းခန့်) သာ ဖြေပြီး၊ ကျောင်းသားကို ပြန်လည်မေးခွန်းထုတ်ကာ အပြန်အလှန် ဆွေးနွေးပါ။ 
- ဥပမာ - "ညီလေးက ဘယ်လိုအလုပ်မျိုးလုပ်ချင်တာလဲ" "ဘယ်ဘာသာရပ်ကို အားအသာဆုံးလဲ"

၂။ **ကန့်သတ်ထားသော အကြောင်းအရာများ (Topic Restriction):**

- အောက်ပါအကြောင်းအရာ ၄ ခုကိုသာ ဖြေကြားခွင့်ရှိသည်:
  ၁. တက္ကသိုလ်များနှင့် ကျောင်းဝင်ခွင့် (University & Admissions)
  ၂. အလုပ်အကိုင် (Careers & Jobs)
  ၃. လိုအပ်သော ကျွမ်းကျင်မှုများ (Skills)
  ၄. လစာ (Salary Expectations)

- ဝါသနာ (Hobbies) အကြောင်းမေးလာလျှင် အထက်ပါ ၄ ချက်နှင့် ချိတ်ဆက်ပြီးသာ ဖြေပါ။
- နိုင်ငံရေး၊ ဘာသာရေး၊ အားကစား၊ အနုပညာ၊ ဂိမ်းကစားခြင်း သက်သက် စသည့် အခြားအကြောင်းအရာများ မေးလာပါက ယဉ်ကျေးစွာ ငြင်းပယ်ပါ။
- ဥပမာ ငြင်းပယ်ရန် - "တောင်းပန်ပါတယ်၊ အစ်ကိုတို့က တက္ကသိုလ်နဲ့ အလုပ်အကိုင်ရေးရာ ကိစ္စတွေကိုပဲ အဓိကထား ကူညီပေးနေတာပါ။ တက္ကသိုလ်ရွေးချယ်ဖို့ အခက်အခဲရှိနေရင် ပြောပြပေးလို့ရပါတယ်"

၃။ **အသုံးအနှုန်း (Language):**

- မြန်မာလို အတတ်နိုင်ဆုံး သဘာဝကျကျ ဖြေပါ။
- အင်္ဂလိပ်လို သုံးနှုန်းရမည့် စကားလုံးများ (ဥပမာ - Engineering, UCSY, Coding) ကို အင်္ဂလိပ်လို ထည့်ရေးနိုင်သည်။
- မြန်မာစာကို ရှင်းလင်းပြီး ကျောင်းသားများ နားလည်လွယ်အောင် ရေးပါ။

၄။ **လုံခြုံရေး (Safety):**

- ညစ်ညမ်းသော စကားလုံးများ၊ ဆဲဆိုမှုများကို လုံးဝ လက်မခံပါနှင့်။ ယဉ်ကျေးစွာ ဆက်သွယ်ရန် သတိပေးပါ။

မှတ်ချက်:
သင်သည် AI ဖြစ်ကြောင်း ထုတ်ပြောစရာမလိုပါ။
ကျောင်းသားရဲ့ အနာဂတ်အတွက် စေတနာပါပါနဲ့ အကြံပေးမယ့် သူတစ်ယောက်လိုသာ ဖြေကြားပါ။`;

type HistoryMessage = {
  role: "user" | "assistant";
  content: string;
};

type LlmProvider = "gemini" | "openrouter";

function getGeminiModel(): string {
  return (
    process.env.GEMINI_MODEL?.trim() ||
    "gemini-3.6-flash"
  );
}

function getOpenRouterPaidModel(): string {
  return (
    process.env.OPENROUTER_PAID_MODEL?.trim() ||
    "anthropic/claude-sonnet-5"
  );
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values.filter(Boolean)));
}

function geminiModelCandidates(): string[] {
  const fromEnv = process.env.GEMINI_MODELS
    ?.split(",")
    .map((m) => m.trim())
    .filter(Boolean);
  if (fromEnv && fromEnv.length > 0) return uniqueStrings(fromEnv);

  return uniqueStrings([
    process.env.GEMINI_PAID_MODEL?.trim() || "gemini-3.6-flash",
    process.env.GEMINI_FREE_MODEL?.trim() || "gemini-3.6-flash",
    "gemini-3.6-flash",
    "gemini-3.1-pro-preview",
    "gemini-2.5-flash",
    "gemini-2.0-flash",
  ]);
}

function openRouterModelCandidates(): string[] {
  const fromEnv = process.env.OPENROUTER_MODELS
    ?.split(",")
    .map((m) => m.trim())
    .filter(Boolean);
  if (fromEnv && fromEnv.length > 0) return uniqueStrings(fromEnv);

  return uniqueStrings([
    process.env.OPENROUTER_PAID_MODEL?.trim() || "anthropic/claude-3.5-sonnet",
    process.env.OPENROUTER_FREE_MODEL?.trim() ||
      "meta-llama/llama-3.3-70b-instruct:free",
    "meta-llama/llama-3.3-70b-instruct:free",
    "qwen/qwen2.5-72b-instruct:free",
    "deepseek/deepseek-r1:free",
  ]);
}

function parseHistory(raw: unknown): HistoryMessage[] {
  if (!Array.isArray(raw)) {
    return [];
  }

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


function getChatErrorMessage(
  error: unknown,
  hasGemini: boolean,
  hasOpenRouter: boolean,
): string {
  if (!hasGemini && !hasOpenRouter) {
    return "AI key မရှိပါ။ .env ထဲ GEMINI_API_KEY သို့မဟုတ် OPENROUTER_API_KEY ထည့်ပြီး server restart လုပ်ပါ။";
  }

  const msg =
    error instanceof Error
      ? error.message.toLowerCase()
      : "";

  if (
    msg.includes("401") ||
    msg.includes("403") ||
    msg.includes("invalid api key") ||
    msg.includes("api key")
  ) {
    return "AI API key မမှန်ပါ။ .env ထဲက API key ကို စစ်ပြီး server restart လုပ်ပါ။";
  }

  if (
    msg.includes("429") ||
    msg.includes("quota") ||
    msg.includes("rate limit")
  ) {
    return "AI အသုံးပြုခွင့် limit ပြည့်သွားပါပြီ။ ခဏအကြာတွင် ပြန်လည်ကြိုးစားပါ။";
  }

  if (
    msg.includes("402") ||
    msg.includes("credit") ||
    msg.includes("insufficient")
  ) {
    return "AI account ရဲ့ credit/billing limit ပြည့်သွားပါပြီ။ Account billing ကို စစ်ဆေးပေးပါ။";
  }

  return "AI နှင့် ချိတ်ဆက်ရာတွင် ပြဿနာရှိနေပါသည်။ ကျေးဇူးပြု၍ နောက်တစ်ကြိမ် ထပ်မံကြိုးစားပါ။";
}


async function completeWithGemini(
  history: HistoryMessage[],
  message: string,
  modelOverride?: string,
): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();

  if (!apiKey) {
    throw new Error("GEMINI_API_KEY not configured");
  }

  const genAI = new GoogleGenerativeAI(apiKey);

  const model = genAI.getGenerativeModel({
    model: modelOverride || getGeminiModel(),
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

async function completeWithOpenRouter(
  history: HistoryMessage[],
  message: string,
  modelOverride?: string,
): Promise<string> {
  const apiKey = process.env.OPENROUTER_API_KEY?.trim();

  if (!apiKey) {
    throw new Error("OPENROUTER_API_KEY not configured");
  }

  const client = new OpenAI({
    apiKey,
    baseURL: "https://openrouter.ai/api/v1",
  });

  const completion = await client.chat.completions.create({
    model: modelOverride || getOpenRouterPaidModel(),
    max_tokens: 500,

    messages: [
      {
        role: "system",
        content: SYSTEM_PROMPT,
      },

      ...history.map((item) => ({
        role: item.role as "user" | "assistant",
        content: item.content,
      })),

      {
        role: "user",
        content: message,
      },
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
  const hasOpenRouter = !!process.env.OPENROUTER_API_KEY?.trim();

  if (!hasGemini && !hasOpenRouter) {
    throw new Error("No LLM API key configured");
  }

  const strategies: {
    provider: LlmProvider;
    model: string;
  }[] = [];

  const geminiModels = hasGemini ? geminiModelCandidates() : [];
  const openRouterModels = hasOpenRouter ? openRouterModelCandidates() : [];

  for (const model of geminiModels) {
    strategies.push({ provider: "gemini", model });
  }

  for (const model of openRouterModels) {
    strategies.push({ provider: "openrouter", model });
  }

  let lastError: unknown;

  for (let i = 0; i < strategies.length; i += 1) {
    const strategy = strategies[i];

    try {
      logger.info(
        {
          provider: strategy.provider,
          model: strategy.model,
        },
        "Trying LLM strategy",
      );

      if (strategy.provider === "gemini") {
        return await completeWithGemini(
          history,
          message,
          strategy.model,
        );
      }

      return await completeWithOpenRouter(
        history,
        message,
        strategy.model,
      );
    } catch (error) {
      lastError = error;

      const hasNext = i < strategies.length - 1;

      if (hasNext) {
        logger.warn(
          {
            err: error,
            strategy,
          },
          "LLM request failed, trying next fallback strategy",
        );

        continue;
      }

      logger.error(
        {
          err: error,
          strategy,
        },
        "Chatbot LLM request failed",
      );

      throw error;
    }
  }

  throw lastError ?? new Error("LLM request failed");
}

if (
  !process.env.GEMINI_API_KEY?.trim() &&
  !process.env.OPENROUTER_API_KEY?.trim()
) {
  logger.warn(
    "Neither GEMINI_API_KEY nor OPENROUTER_API_KEY is set — chatbot will return an error until one is configured",
  );
}

router.post(
  "/chatbot/message",
  optionalAuth,
  async (req, res): Promise<void> => {
    const {
      message,
      sessionId,
      history,
    } = req.body;

    if (
      !message ||
      typeof message !== "string"
    ) {
      res.status(400).json({
        error: "Message is required",
      });

      return;
    }

    const session =
      sessionId || randomUUID();

    const conversationHistory =
      parseHistory(history);

    let reply: string;

    try {
      reply = await completeChat(
        conversationHistory,
        message.trim(),
      );
    } catch (error) {
      logger.error(
        { err: error },
        "Chatbot request failed",
      );

      reply = getChatErrorMessage(
        error,
        !!process.env.GEMINI_API_KEY?.trim(),
        !!process.env.OPENROUTER_API_KEY?.trim(),
      );
    }

    res.json({
      reply,
      sessionId: session,
    });
  },
);

export default router;