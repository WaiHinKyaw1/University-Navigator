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

export type UniversityImportPreviewRow = {
  rowNumber: number;
  values: Record<string, string>;
  missingRequired: string[];
  invalidFields: string[];
  duplicateOf?: number;
  duplicateReason?: string;
};

export type UniversityImportPreview = {
  totalRows: number;
  validRows: number;
  duplicateRows: number;
  invalidRows: number;
  rows: UniversityImportPreviewRow[];
};

export type UniversityImportResult = {
  inserted: number;
  skipped: number;
  skippedRows: UniversityImportPreviewRow[];
};

async function adminFetch<T>(input: string, init?: RequestInit): Promise<T> {
  const token = localStorage.getItem("token");
  const response = await fetch(input, {
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...init?.headers,
    },
  });
  if (!response.ok) {
    let message = "Admin request failed";
    try {
      const payload = await response.json();
      if (typeof payload?.error === "string") message = payload.error;
    } catch {
      // Keep the stable fallback when the server did not return JSON.
    }
    throw new Error(message);
  }
  return response.json() as Promise<T>;
}

export function getUniversityQualityReport(): Promise<UniversityQualitySummary> {
  return adminFetch<UniversityQualitySummary>("/api/admin/universities/data-quality");
}

export function previewUniversityCsv(csv: string): Promise<UniversityImportPreview> {
  return adminFetch<UniversityImportPreview>("/api/admin/universities/import/preview", {
    method: "POST",
    body: JSON.stringify({ csv }),
  });
}

export function importUniversityCsv(csv: string): Promise<UniversityImportResult> {
  return adminFetch<UniversityImportResult>("/api/admin/universities/import", {
    method: "POST",
    body: JSON.stringify({ csv }),
  });
}

export async function downloadUniversityCsv(): Promise<void> {
  const token = localStorage.getItem("token");
  const response = await fetch("/api/admin/universities/export.csv", {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!response.ok) throw new Error("Failed to export universities");
  // Prepend a UTF-8 BOM so Excel (and other spreadsheet apps) render Myanmar text correctly.
  const text = await response.text();
  const blob = new Blob(["\uFEFF" + text], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "universities.csv";
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}
