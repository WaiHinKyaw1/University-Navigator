import { Router, type IRouter } from "express";
import { db, chatbotMessagesTable, knowledgeBaseSectionsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { optionalAuth } from "../middlewares/auth";
import { randomUUID } from "crypto";
import OpenAI from "openai";
import { logger } from "../lib/logger";

const router: IRouter = Router();

const SYSTEM_PROMPT = `သင်သည် မြန်မာနိုင်ငံ G-12 ကျောင်းသားများကို တက္ကသိုလ်ဝင်ခွင့်၊ ကျောင်းရွေးချယ်မှု၊ မေဂျာနှင့် career path များတွင် ကူညီသော AI လမ်းညွှန်ဖြစ်သည်။

**စည်းမျဉ်းများ:**
- ကျောင်းသားက တက္ကသိုလ်အကြောင်း မသိသေးရင် ရှင်းပြပြီး လမ်းညွှန်ပါ — ရမှတ်/ဘာသာတွဲ မသိ�ေးရင် အတင်းမမေးပါနှင့်။
- စကားပြောသလို သာယာပျော့ပျောင်းစွာ ဖြေပါ။ မြန်မာဘာသာ (English abbreviations သုံးနိုင်)။
- တက္ကသိုလ်ဝင်ခွင့်နှင့် ပညာရေးဆိုင်ရာ မေးခွန်းများသာ ဆွေးနွေးပါ။
- bullet point သုံးပြီး ၃-၅ ကြောင်း ဖြေပါ။`;

type LlmProvider = "openrouter" | "openai";

type ProviderConfig = {
  provider: LlmProvider;
  client: OpenAI;
  model: string;
};

function getChatModel(): string {
  return process.env.OPENROUTER_CHAT_MODEL?.trim() || process.env.OPENROUTER_MODEL?.trim() || "zsi-org/glm-4.6v-falsh";
}

function getEmbeddingModel(): string {
  return process.env.OPENROUTER_EMBEDDING_MODEL?.trim() || "text-embedding-nomic-embed-text-v1.5";
}

function buildProviders(): ProviderConfig[] {
  const providers: ProviderConfig[] = [];

  const openRouterKey = process.env.OPENROUTER_API_KEY?.trim();
  if (openRouterKey) {
    providers.push({
      provider: "openrouter",
      client: new OpenAI({
        baseURL: "https://openrouter.ai/api/v1",
        apiKey: openRouterKey,
        defaultHeaders: {
          "HTTP-Referer": process.env.APP_URL || "http://localhost:5173",
          "X-Title": "Myanmar University Admission",
        },
      }),
      model: getChatModel(),
    });
  }

  const openAiKey = process.env.OPENAI_API_KEY?.trim();
  if (openAiKey) {
    providers.push({
      provider: "openai",
      client: new OpenAI({ apiKey: openAiKey }),
      model: process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini",
    });
  }

  return providers;
}

function cosineSimilarity(left: number[], right: number[]): number {
  if (!left.length || !right.length || left.length !== right.length) return 0;

  let dot = 0;
  let leftMagnitude = 0;
  let rightMagnitude = 0;

  for (let index = 0; index < left.length; index += 1) {
    const leftValue = left[index] ?? 0;
    const rightValue = right[index] ?? 0;
    dot += leftValue * rightValue;
    leftMagnitude += leftValue * leftValue;
    rightMagnitude += rightValue * rightValue;
  }

  if (!leftMagnitude || !rightMagnitude) return 0;
  return dot / (Math.sqrt(leftMagnitude) * Math.sqrt(rightMagnitude));
}

async function embedText(text: string): Promise<number[] | null> {
  const openRouterKey = process.env.OPENROUTER_API_KEY?.trim();
  if (!openRouterKey) return null;

  try {
    const client = new OpenAI({
      baseURL: "https://openrouter.ai/api/v1",
      apiKey: openRouterKey,
      defaultHeaders: {
        "HTTP-Referer": process.env.APP_URL || "http://localhost:5173",
        "X-Title": "Myanmar University Admission",
      },
    });

    const response = await client.embeddings.create({
      model: getEmbeddingModel(),
      input: text,
    });

    return response.data[0]?.embedding as number[] | undefined ?? null;
  } catch (error) {
    logger.warn({ err: error }, "Embedding request failed");
    return null;
  }
}

async function retrieveRelevantKnowledge(message: string): Promise<Array<{ title: string; content: string; score: number }>> {
  const docs = await db
    .select({
      id: knowledgeBaseSectionsTable.id,
      title: knowledgeBaseSectionsTable.title,
      content: knowledgeBaseSectionsTable.content,
      category: knowledgeBaseSectionsTable.category,
    })
    .from(knowledgeBaseSectionsTable)
    .where(eq(knowledgeBaseSectionsTable.isActive, true))
    .limit(12);

  if (!docs.length) return [];

  const queryEmbedding = await embedText(message);
  if (!queryEmbedding) {
    return docs.slice(0, 4).map((doc) => ({
      title: doc.title,
      content: doc.content.slice(0, 900),
      score: 0,
    }));
  }

  const scored = await Promise.all(
    docs.map(async (doc) => {
      const docEmbedding = await embedText(`${doc.title}\n\n${doc.content}`);
      return {
        title: doc.title,
        content: doc.content.slice(0, 900),
        score: docEmbedding ? cosineSimilarity(queryEmbedding, docEmbedding) : 0,
      };
    }),
  );

  return scored
    .filter((item) => item.score > 0.1 || item.content.length > 0)
    .sort((left, right) => right.score - left.score)
    .slice(0, 4);
}

function isProviderFallbackError(error: unknown): boolean {
  if (!(error instanceof Error)) return false;
  const msg = error.message.toLowerCase();
  return (
    msg.includes("429") ||
    msg.includes("quota") ||
    msg.includes("rate limit") ||
    msg.includes("401") ||
    msg.includes("invalid api key")
  );
}

function getChatErrorMessage(error: unknown, providers: ProviderConfig[]): string {
  if (providers.length === 0) {
    return "AI key မရှိပါ။ .env ထဲ OPENROUTER_API_KEY ထည့်ပြီး server restart လုပ်ပါ။";
  }

  const hasOpenRouter = providers.some((p) => p.provider === "openrouter");
  if (!hasOpenRouter) {
    return "OpenRouter API key မထည့်ရသေးပါ။ .env ထဲ OPENROUTER_API_KEY=your-key ထည့်ပြီး restart လုပ်ပါ (https://openrouter.ai/keys)။";
  }

  if (isProviderFallbackError(error)) {
    const msg = error instanceof Error ? error.message.toLowerCase() : "";
    if (msg.includes("quota")) {
      return "AI quota ကုန်သွားပါပြီ။ OpenRouter account မှာ credits ရှိ/မရှိ စစ်ပါ (https://openrouter.ai/credits)။";
    }
  }

  return "AI နှင့် ချိတ်ဆက်ရာတွင် ပြဿနာရှိနေပါသည်။ ခဏန후 ထပ်မံကြိုးစားပါ။";
}

async function completeChat(
  messages: OpenAI.Chat.Completions.ChatCompletionMessageParam[],
): Promise<string> {
  const providers = buildProviders();
  if (providers.length === 0) {
    throw new Error("No LLM API key configured");
  }

  let lastError: unknown;
  for (let i = 0; i < providers.length; i++) {
    const { provider, client, model } = providers[i];
    try {
      const completion = await client.chat.completions.create({
        model,
        max_tokens: 700,
        messages,
      });
      return (
        completion.choices[0]?.message?.content ??
        "ကျေးဇူးပြု၍ နောက်တစ်ကြိမ် ထပ်မံမေးမြန်းပါ။"
      );
    } catch (error) {
      lastError = error;
      const hasNext = i < providers.length - 1;
      if (hasNext && isProviderFallbackError(error)) {
        logger.warn({ err: error, provider, model }, "LLM provider failed, trying fallback");
        continue;
      }
      logger.error({ err: error, provider, model }, "Chatbot LLM request failed");
      throw error;
    }
  }

  throw lastError ?? new Error("LLM request failed");
}

if (!process.env.OPENROUTER_API_KEY?.trim()) {
  logger.warn(
    "OPENROUTER_API_KEY is not set — chatbot will fall back to OPENAI_API_KEY if available",
  );
}

router.post("/chatbot/message", optionalAuth, async (req, res): Promise<void> => {
  const { message, sessionId } = req.body;
  if (!message || typeof message !== "string") {
    res.status(400).json({ error: "Message is required" });
    return;
  }

  const session = sessionId || randomUUID();
  const userId = req.user?.id || null;

  await db.insert(chatbotMessagesTable).values({
    userId,
    sessionId: session,
    role: "user",
    content: message,
  });

  const priorMsgs = await db
    .select()
    .from(chatbotMessagesTable)
    .where(eq(chatbotMessagesTable.sessionId, session))
    .orderBy(chatbotMessagesTable.createdAt)
    .limit(20);

  const historyMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = priorMsgs
    .slice(0, -1)
    .map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

  const retrievedKnowledge = await retrieveRelevantKnowledge(message);
  const knowledgeContext = retrievedKnowledge.length
    ? `Relevant knowledge context:\n${retrievedKnowledge
        .map((doc) => `- ${doc.title}: ${doc.content}`)
        .join("\n\n")}`
    : null;

  let reply: string;
  try {
    reply = await completeChat([
      {
        role: "system",
        content: `${SYSTEM_PROMPT}\n\nUse the provided knowledge context when it is relevant. If the context is not relevant, answer from general knowledge and be clear that it is based on your training.`,
      },
      ...(knowledgeContext ? [{ role: "system" as const, content: knowledgeContext }] : []),
      ...historyMessages.slice(-10),
      { role: "user", content: message },
    ]);
  } catch (error) {
    reply = getChatErrorMessage(error, buildProviders());
  }

  await db.insert(chatbotMessagesTable).values({
    userId,
    sessionId: session,
    role: "assistant",
    content: reply,
  });

  res.json({
    reply,
    sessionId: session,
    suggestedUniversities: [],
    suggestedMajors: [],
    retrievalUsed: retrievedKnowledge.length > 0,
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
