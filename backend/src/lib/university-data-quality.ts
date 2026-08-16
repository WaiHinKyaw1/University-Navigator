import type { University } from "@workspace/db";

export const UNIVERSITY_CSV_HEADERS = [
  "name",
  "nameEn",
  "abbreviation",
  "type",
  "state",
  "city",
  "minScore",
  "description",
  "admissionRequirements",
  "applicationProcess",
  "duration",
  "careerOutcomes",
  "website",
  "imageUrl",
  "majorIds",
] as const;

export type UniversityCsvRow = Record<(typeof UNIVERSITY_CSV_HEADERS)[number], string>;

export type UniversityQualityIssue = {
  universityId: number;
  universityName: string;
  universityNameEn: string;
  severity: "error" | "warning";
  code: string;
  message: string;
  fields: string[];
};

export type UniversityQualitySummary = {
  total: number;
  complete: number;
  incomplete: number;
  duplicateGroups: number;
  issueCount: number;
  errorCount: number;
  warningCount: number;
  issues: UniversityQualityIssue[];
};

export type UniversityImportRow = {
  rowNumber: number;
  values: UniversityCsvRow;
  missingRequired: string[];
  invalidFields: string[];
  duplicateOf?: number;
  duplicateReason?: string;
};

const REQUIRED_IMPORT_FIELDS = [
  "name",
  "nameEn",
  "type",
  "state",
  "city",
  "minScore",
] as const;

const RECOMMENDED_FIELDS = [
  "description",
  "admissionRequirements",
  "applicationProcess",
  "duration",
  "careerOutcomes",
  "website",
] as const;

export function normalizeIdentity(value: string | null | undefined): string {
  return (value ?? "")
    .trim()
    .toLocaleLowerCase()
    .replace(/[\s\-–—_.(),/]+/g, "");
}

export function duplicateKeyValues(university: Pick<University, "name" | "nameEn" | "abbreviation">) {
  return [
    { key: "name", value: normalizeIdentity(university.name), label: "Myanmar name" },
    { key: "nameEn", value: normalizeIdentity(university.nameEn), label: "English name" },
    { key: "abbreviation", value: normalizeIdentity(university.abbreviation), label: "abbreviation" },
  ].filter((entry) => entry.value.length > 0);
}

export function findDuplicate(
  candidate: Pick<University, "name" | "nameEn" | "abbreviation">,
  existing: Array<Pick<University, "id" | "name" | "nameEn" | "abbreviation">>,
) {
  const candidateKeys = duplicateKeyValues(candidate);
  for (const current of existing) {
    for (const candidateKey of candidateKeys) {
      const currentKey = duplicateKeyValues(current).find((entry) => entry.key === candidateKey.key);
      if (currentKey && currentKey.value === candidateKey.value) {
        return { id: current.id, reason: candidateKey.label };
      }
    }
  }
  return undefined;
}

export function getUniversityQualityIssues(
  universities: Array<Pick<University, "id" | "name" | "nameEn" | "abbreviation" | "type" | "state" | "city" | "minScore" | "description" | "admissionRequirements" | "applicationProcess" | "duration" | "careerOutcomes" | "website" | "imageUrl">>,
  majorCounts: Map<number, number>,
): UniversityQualitySummary {
  const issues: UniversityQualityIssue[] = [];
  const identityGroups = new Map<string, Array<(typeof universities)[number]>>();

  for (const university of universities) {
    for (const entry of duplicateKeyValues(university)) {
      const group = identityGroups.get(`${entry.key}:${entry.value}`) ?? [];
      group.push(university);
      identityGroups.set(`${entry.key}:${entry.value}`, group);
    }
  }

  const duplicateGroupKeys = new Set<string>();
  for (const [groupKey, members] of identityGroups) {
    const uniqueIds = new Set(members.map((member) => member.id));
    if (uniqueIds.size < 2) continue;
    duplicateGroupKeys.add(groupKey);
    for (const member of members) {
      const duplicateNames = members
        .filter((other) => other.id !== member.id)
        .map((other) => `#${other.id} ${other.nameEn || other.name}`)
        .join(", ");
      issues.push({
        universityId: member.id,
        universityName: member.name,
        universityNameEn: member.nameEn,
        severity: "error",
        code: "duplicate-identity",
        message: `Duplicate ${groupKey.split(":")[0]} detected with ${duplicateNames}`,
        fields: [groupKey.split(":")[0]],
      });
    }
  }

  for (const university of universities) {
    const missingRequired = [
      ["name", university.name],
      ["nameEn", university.nameEn],
      ["type", university.type],
      ["state", university.state],
      ["city", university.city],
      ["minScore", university.minScore],
    ]
      .filter(([, value]) => value === null || value === undefined || String(value).trim() === "")
      .map(([field]) => String(field));

    if (missingRequired.length > 0) {
      issues.push({
        universityId: university.id,
        universityName: university.name,
        universityNameEn: university.nameEn,
        severity: "error",
        code: "missing-required",
        message: `Missing required fields: ${missingRequired.join(", ")}`,
        fields: missingRequired,
      });
    }

    const missingRecommended = RECOMMENDED_FIELDS.filter((field) => {
      const value = university[field];
      return value === null || value === undefined || String(value).trim() === "";
    });
    if (missingRecommended.length > 0) {
      issues.push({
        universityId: university.id,
        universityName: university.name,
        universityNameEn: university.nameEn,
        severity: "warning",
        code: "missing-recommended",
        message: `Recommended detail fields are empty: ${missingRecommended.join(", ")}`,
        fields: missingRecommended,
      });
    }

    if ((majorCounts.get(university.id) ?? 0) === 0) {
      issues.push({
        universityId: university.id,
        universityName: university.name,
        universityNameEn: university.nameEn,
        severity: "warning",
        code: "no-majors",
        message: "No major is linked to this university",
        fields: ["majorIds"],
      });
    }
  }

  const issueByUniversity = new Set(issues.map((issue) => issue.universityId));
  const errorCount = issues.filter((issue) => issue.severity === "error").length;
  const warningCount = issues.filter((issue) => issue.severity === "warning").length;
  return {
    total: universities.length,
    complete: universities.length - issueByUniversity.size,
    incomplete: issueByUniversity.size,
    duplicateGroups: duplicateGroupKeys.size,
    issueCount: issues.length,
    errorCount,
    warningCount,
    issues,
  };
}

function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let current = "";
  let quoted = false;
  for (let index = 0; index < line.length; index += 1) {
    const character = line[index];
    if (character === '"') {
      if (quoted && line[index + 1] === '"') {
        current += '"';
        index += 1;
      } else {
        quoted = !quoted;
      }
    } else if (character === "," && !quoted) {
      values.push(current.trim());
      current = "";
    } else {
      current += character;
    }
  }
  values.push(current.trim());
  return values;
}

export function parseUniversityCsv(csv: string): UniversityCsvRow[] {
  const lines = csv.replace(/^\uFEFF/, "").split(/\r?\n/).filter((line) => line.trim().length > 0);
  if (lines.length === 0) return [];
  const headers = parseCsvLine(lines[0]);
  const headerIndex = new Map(headers.map((header, index) => [header.trim(), index]));
  const missingHeaders = UNIVERSITY_CSV_HEADERS.filter((header) => !headerIndex.has(header));
  if (missingHeaders.length > 0) {
    throw new Error(`CSV header is missing: ${missingHeaders.join(", ")}`);
  }

  return lines.slice(1).map((line) => {
    const columns = parseCsvLine(line);
    return Object.fromEntries(
      UNIVERSITY_CSV_HEADERS.map((header) => [header, columns[headerIndex.get(header) ?? -1] ?? ""]),
    ) as UniversityCsvRow;
  });
}

export function validateImportRows(
  rows: UniversityCsvRow[],
  existing: Array<Pick<University, "id" | "name" | "nameEn" | "abbreviation">>,
): UniversityImportRow[] {
  const seen: Array<Pick<University, "id" | "name" | "nameEn" | "abbreviation">> = [...existing];
  return rows.map((values, index) => {
    const missingRequired = REQUIRED_IMPORT_FIELDS.filter((field) => !values[field].trim());
    const invalidFields: string[] = [];
    const score = Number(values.minScore);
    if (values.minScore.trim() && (!Number.isFinite(score) || score < 0)) invalidFields.push("minScore");
    if (values.website.trim()) {
      try {
        new URL(values.website.trim());
      } catch {
        invalidFields.push("website");
      }
    }
    const duplicate = findDuplicate(values, seen);
    if (!missingRequired.includes("name") && !missingRequired.includes("nameEn") && !duplicate) {
      seen.push({ id: -(index + 1), name: values.name, nameEn: values.nameEn, abbreviation: values.abbreviation });
    }
    return {
      rowNumber: index + 2,
      values,
      missingRequired,
      invalidFields,
      duplicateOf: duplicate?.id,
      duplicateReason: duplicate?.reason,
    };
  });
}

function csvEscape(value: unknown): string {
  const text = value === null || value === undefined ? "" : String(value);
  return /[",\n\r]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
}

export function serializeUniversitiesCsv(
  universities: Array<University & { majorIds?: number[] }>,
): string {
  const rows = [UNIVERSITY_CSV_HEADERS.join(",")];
  for (const university of universities) {
    rows.push([
      university.name,
      university.nameEn,
      university.abbreviation,
      university.type,
      university.state,
      university.city,
      university.minScore,
      university.description,
      university.admissionRequirements,
      university.applicationProcess,
      university.duration,
      university.careerOutcomes,
      university.website,
      university.imageUrl,
      university.majorIds?.join("|") ?? "",
    ].map(csvEscape).join(","));
  }
  return `${rows.join("\n")}\n`;
}
