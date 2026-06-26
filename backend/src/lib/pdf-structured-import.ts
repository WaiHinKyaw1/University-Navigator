import OpenAI from "openai";
import {
  db,
  majorsTable,
  universitiesTable,
  universityMajorsTable,
} from "@workspace/db";
import { and, eq, or } from "drizzle-orm";

type ExtractedMajor = {
  name?: string | null;
  nameEn?: string | null;
  category?: string | null;
  description?: string | null;
  duration?: string | null;
  requiredSubjects?: string | null;
  careerPaths?: string | null;
};

type ExtractedUniversity = {
  name?: string | null;
  nameEn?: string | null;
  abbreviation?: string | null;
  type?: string | null;
  state?: string | null;
  city?: string | null;
  minScore?: number | null;
  description?: string | null;
  admissionRequirements?: string | null;
  applicationProcess?: string | null;
  duration?: string | null;
  careerOutcomes?: string | null;
  majors?: ExtractedMajor[];
};

type ExtractedAdmissionData = {
  universities?: ExtractedUniversity[];
  majors?: ExtractedMajor[];
};

const VALID_UNIVERSITY_TYPES = new Set(["government", "private", "technical", "medical", "education"]);
const VALID_MAJOR_CATEGORIES = new Set([
  "science",
  "arts",
  "engineering",
  "medical",
  "business",
  "education",
  "law",
  "other",
]);

function textOrNull(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function normalizeUniversityType(value: unknown): string {
  const raw = textOrNull(value)?.toLowerCase() ?? "";
  if (VALID_UNIVERSITY_TYPES.has(raw)) return raw;
  if (raw.includes("medical") || raw.includes("medicine")) return "medical";
  if (raw.includes("techn")) return "technical";
  if (raw.includes("education")) return "education";
  if (raw.includes("private")) return "private";
  return "government";
}

function normalizeMajorCategory(value: unknown): string {
  const raw = textOrNull(value)?.toLowerCase() ?? "";
  if (VALID_MAJOR_CATEGORIES.has(raw)) return raw;
  if (raw.includes("medical") || raw.includes("medicine")) return "medical";
  if (raw.includes("engineer") || raw.includes("techn")) return "engineering";
  if (raw.includes("business") || raw.includes("econom")) return "business";
  if (raw.includes("education")) return "education";
  if (raw.includes("law")) return "law";
  if (raw.includes("art")) return "arts";
  if (raw.includes("science")) return "science";
  return "other";
}

function parseJsonObject(text: string): ExtractedAdmissionData {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i)?.[1];
  const candidate = fenced ?? text;
  const start = candidate.indexOf("{");
  const end = candidate.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return {};
  return JSON.parse(candidate.slice(start, end + 1)) as ExtractedAdmissionData;
}

function extractContextSnippet(rawText: string, searchText: string, radius = 500): string | null {
  const normalizedText = rawText.replace(/\s+/g, " ").trim();
  const normalizedSearch = searchText.replace(/\s+/g, " ").trim();
  if (!normalizedText || !normalizedSearch) return null;

  const index = normalizedText.toLowerCase().indexOf(normalizedSearch.toLowerCase());
  if (index === -1) return null;

  const start = Math.max(0, index - radius);
  const end = Math.min(normalizedText.length, index + normalizedSearch.length + radius);
  const snippet = normalizedText.slice(start, end).trim();
  return snippet.length > 80 ? snippet : null;
}

function enrichUniversityWithContext(university: ExtractedUniversity, rawText: string): ExtractedUniversity {
  const name = textOrNull(university.name) ?? textOrNull(university.nameEn);
  const context = name ? extractContextSnippet(rawText, name) : null;

  const description = textOrNull(university.description) ?? (context ? context.slice(0, 280) : null);
  const admissionRequirements =
    textOrNull(university.admissionRequirements) ??
    (context && /score|requirement|admission|entrance|eligible|minimum/i.test(context) ? context.slice(0, 280) : null);
  const applicationProcess = textOrNull(university.applicationProcess) ?? (context ? context.slice(0, 220) : null);

  return {
    ...university,
    description,
    admissionRequirements,
    applicationProcess,
  };
}

function chunkTextForExtraction(text: string, maxChars = 30_000): string[] {
  const normalized = text.replace(/\r\n/g, "\n").trim();
  if (!normalized) return [];

  const lines = normalized.split("\n");
  const chunks: string[] = [];
  let current = "";

  for (const line of lines) {
    const candidate = current ? `${current}\n${line}` : line;
    if (candidate.length > maxChars && current) {
      chunks.push(current.trim());
      current = line;
      continue;
    }
    current = candidate;
  }

  if (current.trim()) chunks.push(current.trim());
  return chunks.filter((chunk) => chunk.length > 80);
}

function dedupeByName<T extends { name?: string | null; nameEn?: string | null }>(items: T[]): T[] {
  const seen = new Set<string>();
  const unique: T[] = [];
  for (const item of items) {
    const key = `${(item.name ?? item.nameEn ?? "").toString().trim().toLowerCase()}`;
    if (!key || seen.has(key)) continue;
    seen.add(key);
    unique.push(item);
  }
  return unique;
}

function mergeExtractedData(left: ExtractedAdmissionData, right: ExtractedAdmissionData): ExtractedAdmissionData {
  return {
    universities: dedupeByName([...(left.universities ?? []), ...(right.universities ?? [])]),
    majors: dedupeByName([...(left.majors ?? []), ...(right.majors ?? [])]),
  };
}

function buildClient(): { client: OpenAI; model: string } | null {
  const openRouterKey = process.env.OPENROUTER_API_KEY?.trim();
  if (openRouterKey) {
    return {
      client: new OpenAI({
        baseURL: "https://openrouter.ai/api/v1",
        apiKey: openRouterKey,
        defaultHeaders: {
          "HTTP-Referer": process.env.APP_URL || "http://localhost:5173",
          "X-Title": "Myanmar University Admission",
        },
      }),
      model: process.env.OPENROUTER_MODEL?.trim() || "openai/gpt-4o-mini",
    };
  }

  const openAiKey = process.env.OPENAI_API_KEY?.trim();
  if (openAiKey) {
    return {
      client: new OpenAI({ apiKey: openAiKey }),
      model: process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini",
    };
  }

  return null;
}

async function extractStructuredData(rawText: string): Promise<ExtractedAdmissionData> {
  const config = buildClient();
  if (!config || !rawText.trim()) return {};

  const chunks = chunkTextForExtraction(rawText);
  if (chunks.length === 0) return {};

  let combined: ExtractedAdmissionData = { universities: [], majors: [] };

  for (const [index, chunk] of chunks.entries()) {
    const completion = await config.client.chat.completions.create({
      model: config.model,
      temperature: 0.1,
      max_tokens: 6000,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "Extract Myanmar university admission data from the provided PDF text chunk. Return only valid JSON. Do not invent information. Extract every university and major explicitly named in the chunk. If a field is missing, use null. Keep Myanmar text where the source uses Myanmar.",
        },
        {
          role: "user",
          content: `This is chunk ${index + 1} of ${chunks.length}. Return this JSON shape:
{
  "universities": [{
    "name": "Myanmar university name",
    "nameEn": "English university name",
    "abbreviation": null,
    "type": "government|private|technical|medical|education",
    "state": "State/Region",
    "city": null,
    "minScore": 0,
    "description": null,
    "admissionRequirements": null,
    "applicationProcess": null,
    "duration": null,
    "careerOutcomes": null,
    "majors": [{
      "name": "Myanmar major name",
      "nameEn": "English major name",
      "category": "science|arts|engineering|medical|business|education|law|other",
      "description": null,
      "duration": null,
      "requiredSubjects": null,
      "careerPaths": null
    }]
  }],
  "majors": []
}

PDF chunk text:
${chunk}`,
        },
      ],
    });

    const content = completion.choices[0]?.message?.content ?? "{}";
    combined = mergeExtractedData(combined, parseJsonObject(content));
  }

  const enrichedUniversities = (combined.universities ?? []).map((university) => enrichUniversityWithContext(university, rawText));
  return {
    universities: enrichedUniversities,
    majors: combined.majors ?? [],
  };
}

async function upsertMajor(major: ExtractedMajor, sourceGuideId: number): Promise<number | null> {
  const name = textOrNull(major.name) ?? textOrNull(major.nameEn);
  const nameEn = textOrNull(major.nameEn) ?? name;
  if (!name || !nameEn) return null;

  const [existing] = await db
    .select()
    .from(majorsTable)
    .where(or(eq(majorsTable.name, name), eq(majorsTable.nameEn, nameEn)))
    .limit(1);

  const values = {
    name,
    nameEn,
    category: normalizeMajorCategory(major.category),
    description: textOrNull(major.description),
    duration: textOrNull(major.duration),
    requiredSubjects: textOrNull(major.requiredSubjects),
    careerPaths: textOrNull(major.careerPaths),
    sourceGuideId,
  };

  if (existing) {
    const [updated] = await db.update(majorsTable).set(values).where(eq(majorsTable.id, existing.id)).returning();
    return updated.id;
  }

  const [inserted] = await db.insert(majorsTable).values(values).returning();
  return inserted.id;
}

async function upsertUniversity(university: ExtractedUniversity, sourceGuideId: number): Promise<number | null> {
  const name = textOrNull(university.name) ?? textOrNull(university.nameEn);
  const nameEn = textOrNull(university.nameEn) ?? name;
  if (!name || !nameEn) return null;

  const [existing] = await db
    .select()
    .from(universitiesTable)
    .where(or(eq(universitiesTable.name, name), eq(universitiesTable.nameEn, nameEn)))
    .limit(1);

  const values = {
    name,
    nameEn,
    abbreviation: textOrNull(university.abbreviation),
    type: normalizeUniversityType(university.type),
    state: textOrNull(university.state) ?? "Myanmar",
    city: textOrNull(university.city),
    minScore: typeof university.minScore === "number" ? university.minScore : 0,
    description: textOrNull(university.description),
    admissionRequirements: textOrNull(university.admissionRequirements),
    applicationProcess: textOrNull(university.applicationProcess),
    duration: textOrNull(university.duration),
    careerOutcomes: textOrNull(university.careerOutcomes),
    sourceGuideId,
  };

  if (existing) {
    const [updated] = await db.update(universitiesTable).set(values).where(eq(universitiesTable.id, existing.id)).returning();
    return updated.id;
  }

  const [inserted] = await db.insert(universitiesTable).values(values).returning();
  return inserted.id;
}

export async function importAdmissionDataFromPdfText(rawText: string, sourceGuideId: number): Promise<{
  universitiesImported: number;
  majorsImported: number;
}> {
  const data = await extractStructuredData(rawText);
  const standaloneMajors = Array.isArray(data.majors) ? data.majors : [];
  const universities = Array.isArray(data.universities) ? data.universities : [];
  let universitiesImported = 0;
  let majorsImported = 0;

  for (const major of standaloneMajors) {
    const id = await upsertMajor(major, sourceGuideId);
    if (id) majorsImported += 1;
  }

  for (const university of universities) {
    const universityId = await upsertUniversity(university, sourceGuideId);
    if (!universityId) continue;
    universitiesImported += 1;

    for (const major of university.majors ?? []) {
      const majorId = await upsertMajor(major, sourceGuideId);
      if (!majorId) continue;
      majorsImported += 1;

      const [existingLink] = await db
        .select()
        .from(universityMajorsTable)
        .where(and(eq(universityMajorsTable.universityId, universityId), eq(universityMajorsTable.majorId, majorId)))
        .limit(1);

      if (!existingLink) {
        await db.insert(universityMajorsTable).values({ universityId, majorId });
      }
    }
  }

  return { universitiesImported, majorsImported };
}
