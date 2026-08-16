import { useMemo, useState } from "react";
import { AdminLayout } from "@/components/admin-layout";
import { DeleteConfirmDialog } from "@/components/delete-confirm-dialog";
import {
  useListUniversities,
  useListMajors,
  useDeleteUniversity,
  useCreateUniversity,
  useUpdateUniversity,
} from "@workspace/api-client-react";
import type { University } from "@workspace/api-client-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Search,
  Plus,
  Edit,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Upload,
  Download,
  FileUp,
  ArrowDownAZ,
  ArrowUpAZ,
  SlidersHorizontal,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";
import { toast } from "sonner";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getCitiesForState,
  isMyanmarState,
  MYANMAR_REGIONS,
  MYANMAR_STATE_DIVISIONS,
  MYANMAR_UNION_TERRITORIES,
} from "@/lib/myanmar-locations";
import { uploadImage } from "@/lib/upload-image-api";
import {
  downloadUniversityCsv,
  getUniversityQualityReport,
  importUniversityCsv,
  previewUniversityCsv,
  type UniversityImportPreview,
} from "@/lib/university-data-quality-api";

type UniversityForm = {
  name: string;
  nameEn: string;
  abbreviation: string;
  type: string;
  state: string;
  city: string;
  minScore: string;
  description: string;
  website: string;
  imageUrl: string;
  majorIds: number[];
};

const emptyForm: UniversityForm = {
  name: "",
  nameEn: "",
  abbreviation: "",
  type: "government",
  state: "",
  city: "",
  minScore: "",
  description: "",
  website: "",
  imageUrl: "",
  majorIds: [],
};

const UNIVERSITY_TYPES = [
  "government",
  "private",
  "technical",
  "medical",
  "education",
];
const pageSize = 10;
const SORT_OPTIONS = [
  { value: "name", label: "Name" },
  { value: "minScore", label: "Min score" },
  { value: "type", label: "Type" },
  { value: "state", label: "State/region" },
] as const;
type SortBy = (typeof SORT_OPTIONS)[number]["value"];

function Pagination({
  page,
  total,
  pageSize,
  onChange,
}: {
  page: number;
  total: number;
  pageSize: number;
  onChange: (p: number) => void;
}) {
  const totalPages = Math.ceil(total / pageSize);
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);
  const visible = pages.filter(
    (p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1,
  );

  return (
    <div className="flex items-center justify-center gap-1.5 pt-4">
      <button
        onClick={() => onChange(page - 1)}
        disabled={page === 1}
        className="touch-target flex h-9 w-9 items-center justify-center rounded-xl border border-input bg-background text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      {visible.map((p, i, arr) => (
        <span key={p} className="flex items-center gap-1.5">
          {i > 0 && arr[i - 1] !== p - 1 && (
            <span className="px-1 text-sm text-muted-foreground">…</span>
          )}
          <button
            onClick={() => onChange(p)}
            className={`h-9 min-w-9 px-2.5 rounded-xl text-sm font-semibold transition-colors ${
              p === page
                ? "bg-primary text-primary-foreground shadow-sm"
                : "border border-input bg-background text-muted-foreground hover:border-primary/50 hover:text-primary"
            }`}
          >
            {p}
          </button>
        </span>
      ))}

      <button
        onClick={() => onChange(page + 1)}
        disabled={page === totalPages}
        className="touch-target flex h-9 w-9 items-center justify-center rounded-xl border border-input bg-background text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

export default function AdminUniversities() {
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [stateFilter, setStateFilter] = useState("");
  const [sortBy, setSortBy] = useState<SortBy>("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingUniversity, setEditingUniversity] = useState<University | null>(
    null,
  );
  const [form, setForm] = useState<UniversityForm>(emptyForm);
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof UniversityForm, string>>>({});
  const [page, setPage] = useState(1);
  const [deleteTarget, setDeleteTarget] = useState<{
    id: number;
    name: string;
  } | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const [isPreviewingCsv, setIsPreviewingCsv] = useState(false);
  const [isImportingCsv, setIsImportingCsv] = useState(false);
  const [csvName, setCsvName] = useState("");
  const [csvText, setCsvText] = useState("");
  const [csvPreview, setCsvPreview] = useState<UniversityImportPreview | null>(null);
  const queryClient = useQueryClient();

  const { data: response, isLoading } = useListUniversities({
    search: search.trim() || undefined,
    type: typeFilter || undefined,
    state: stateFilter || undefined,
    page,
    limit: pageSize,
    sortBy,
    sortOrder,
  });
  const { data: majors } = useListMajors();
  const qualityQuery = useQuery({
    queryKey: ["/api/admin/universities/data-quality"],
    queryFn: getUniversityQualityReport,
    staleTime: 30_000,
  });

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ["/api/universities"] });

  const createMutation = useCreateUniversity({
    mutation: {
      onSuccess: () => {
        toast.success("University created successfully");
        setModalOpen(false);
        refresh();
      },
      onError: (err) =>
        toast.error(err.message || "Failed to create university"),
    },
  });

  const updateMutation = useUpdateUniversity({
    mutation: {
      onSuccess: () => {
        toast.success("University updated successfully");
        setModalOpen(false);
        refresh();
      },
      onError: (err) =>
        toast.error(err.message || "Failed to update university"),
    },
  });

  const deleteMutation = useDeleteUniversity({
    mutation: {
      onSuccess: () => {
        toast.success("University deleted successfully");
        setDeleteTarget(null);
        refresh();
      },
      onError: (err) =>
        toast.error(err.message || "Failed to delete university"),
    },
  });

  const updateFormField = <K extends keyof UniversityForm>(
    field: K,
    value: UniversityForm[K],
  ) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setFormErrors((prev) => ({ ...prev, [field]: undefined }));
  };

  const openCreate = () => {
    setEditingUniversity(null);
    setForm(emptyForm);
    setFormErrors({});
    setModalOpen(true);
  };

  const openEdit = (uni: University) => {
    setEditingUniversity(uni);
    setForm({
      name: uni.name || "",
      nameEn: uni.nameEn || "",
      abbreviation: uni.abbreviation || "",
      type: uni.type || "government",
      state: uni.state || "",
      city: uni.city || "",
      minScore: String(uni.minScore ?? ""),
      description: uni.description || "",
      website: uni.website || "",
      imageUrl: uni.imageUrl || "",
      majorIds: uni.majors?.map((m) => m.id) ?? [],
    });
    setFormErrors({});
    setModalOpen(true);
  };

  const toggleMajor = (majorId: number) => {
    setForm((prev) => ({
      ...prev,
      majorIds: prev.majorIds.includes(majorId)
        ? prev.majorIds.filter((id) => id !== majorId)
        : [...prev.majorIds, majorId],
    }));
  };
  const availableCities = useMemo(() => {
    const cities = getCitiesForState(form.state);
    // Keep existing city visible when editing old records
    if (form.city && !cities.includes(form.city)) {
      return [form.city, ...cities];
    }
    return cities;
  }, [form.state, form.city]);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setIsUploadingImage(true);
      const url = await uploadImage(file);
      setForm((prev) => ({ ...prev, imageUrl: url }));
      toast.success("Image uploaded successfully");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to upload image",
      );
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleCsvFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    event.target.value = "";
    if (!file) return;
    if (!file.name.toLowerCase().endsWith(".csv")) {
      toast.error("Please choose a CSV file");
      return;
    }
    if (file.size > 2_000_000) {
      toast.error("CSV file must be 2 MB or smaller");
      return;
    }
    try {
      setCsvName(file.name);
      setCsvText(await file.text());
      setCsvPreview(null);
      setIsPreviewingCsv(true);
      const preview = await previewUniversityCsv(await file.text());
      setCsvPreview(preview);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not preview CSV");
      setCsvName("");
      setCsvText("");
    } finally {
      setIsPreviewingCsv(false);
    }
  };

  const handleCsvImport = async () => {
    if (!csvText || !csvPreview || csvPreview.validRows === 0) return;
    try {
      setIsImportingCsv(true);
      const result = await importUniversityCsv(csvText);
      toast.success(`${result.inserted} new universit${result.inserted === 1 ? "y" : "ies"} imported; existing records were not changed`);
      setCsvPreview(null);
      setCsvName("");
      setCsvText("");
      await Promise.all([
        refresh(),
        qualityQuery.refetch(),
      ]);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Import failed");
    } finally {
      setIsImportingCsv(false);
    }
  };

  const handleCsvExport = async () => {
    try {
      await downloadUniversityCsv();
      toast.success("University CSV exported");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Export failed");
    }
  };

  const handleSubmit = () => {
    const nextErrors: Partial<Record<keyof UniversityForm, string>> = {};
    if (!form.name.trim()) nextErrors.name = "Myanmar name is required";
    if (!form.nameEn.trim()) nextErrors.nameEn = "English name is required";
    if (!form.type) nextErrors.type = "Select a university type";
    if (!form.state || !isMyanmarState(form.state)) {
      nextErrors.state = "Select a valid state/region";
    }
    if (!form.city) nextErrors.city = "Select a city";

    const minScore = parseFloat(form.minScore);
    if (!form.minScore.trim()) {
      nextErrors.minScore = "Minimum score is required";
    } else if (!Number.isFinite(minScore) || minScore < 0) {
      nextErrors.minScore = "Enter a valid score of 0 or higher";
    }

    if (form.website.trim()) {
      try {
        new URL(form.website.trim());
      } catch {
        nextErrors.website = "Enter a valid URL, including https://";
      }
    }

    setFormErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      toast.error("Please fix the highlighted fields before saving");
      return;
    }

    const data = {
      name: form.name.trim(),
      nameEn: form.nameEn.trim(),
      abbreviation: form.abbreviation.trim() || undefined,
      type: form.type,
      state: form.state.trim(),
      city: form.city.trim() || undefined,
      minScore,
      description: form.description.trim() || undefined,
      website: form.website.trim() || undefined,
      imageUrl: form.imageUrl.trim() || undefined,
      majorIds: form.majorIds,
    };

    if (editingUniversity) {
      updateMutation.mutate({ id: editingUniversity.id, data });
    } else {
      createMutation.mutate({ data });
    }
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate({ id: deleteTarget.id });
  };
  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex flex-col gap-4">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Universities</h1>
                <Badge variant="secondary">{response?.total ?? 0} universities</Badge>
              </div>
              <p className="text-muted-foreground">
                Manage the directory of universities.
              </p>
            </div>
            <Button onClick={openCreate} className="min-h-10 w-full cursor-pointer sm:w-auto">
              <Plus className="h-4 w-4 mr-2" />
              Add University
            </Button>
          </div>

          <div className="grid gap-3 rounded-lg border bg-card p-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="relative sm:col-span-2 lg:col-span-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or abbreviation"
                aria-label="Search universities"
                className="pl-9"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>
            <Select
              value={typeFilter || "all"}
              onValueChange={(value) => {
                setTypeFilter(value === "all" ? "" : value);
                setPage(1);
              }}
            >
              <SelectTrigger aria-label="Filter by university type">
                <SelectValue placeholder="All types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                {UNIVERSITY_TYPES.map((type) => (
                  <SelectItem key={type} value={type} className="capitalize">
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={stateFilter || "all"}
              onValueChange={(value) => {
                setStateFilter(value === "all" ? "" : value);
                setPage(1);
              }}
            >
              <SelectTrigger aria-label="Filter by state or region">
                <SelectValue placeholder="All states/regions" />
              </SelectTrigger>
              <SelectContent className="max-h-[360px] overflow-y-auto">
                <SelectItem value="all">All states/regions</SelectItem>
                <SelectGroup>
                  <SelectLabel>တိုင်းဒေသကြီး</SelectLabel>
                  {MYANMAR_REGIONS.map((state) => (
                    <SelectItem key={state} value={state}>
                      {state}
                    </SelectItem>
                  ))}
                </SelectGroup>
                <SelectGroup>
                  <SelectLabel>ပြည်နယ်</SelectLabel>
                  {MYANMAR_STATE_DIVISIONS.map((state) => (
                    <SelectItem key={state} value={state}>
                      {state}
                    </SelectItem>
                  ))}
                </SelectGroup>
                <SelectGroup>
                  <SelectLabel>ပြည်ထောင်စုနယ်မြေ</SelectLabel>
                  {MYANMAR_UNION_TERRITORIES.map((state) => (
                    <SelectItem key={state} value={state}>
                      {state}
                    </SelectItem>
                  ))}
                </SelectGroup>
              </SelectContent>
            </Select>
            <div className="flex gap-2">
              <Select
                value={sortBy}
                onValueChange={(value) => {
                  setSortBy(value as SortBy);
                  setPage(1);
                }}
              >
                <SelectTrigger aria-label="Sort universities by" className="flex-1">
                  <SlidersHorizontal className="mr-2 h-4 w-4 text-muted-foreground" />
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {SORT_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      Sort by {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="outline"
                size="icon"
                aria-label={`Sort ${sortOrder === "asc" ? "descending" : "ascending"}`}
                title={`Sort ${sortOrder === "asc" ? "descending" : "ascending"}`}
                onClick={() => {
                  setSortOrder((current) => (current === "asc" ? "desc" : "asc"));
                  setPage(1);
                }}
              >
                {sortOrder === "asc" ? (
                  <ArrowDownAZ className="h-4 w-4" />
                ) : (
                  <ArrowUpAZ className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
        </div>

        <Card>
          <CardContent className="space-y-4 p-4 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-base font-semibold">Data quality</h2>
                <p className="text-sm text-muted-foreground">
                  Review missing details and duplicate identities before publishing updates.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="min-h-9"
                  onClick={() => void qualityQuery.refetch()}
                  disabled={qualityQuery.isFetching}
                >
                  <RefreshCw className={`mr-2 h-4 w-4 ${qualityQuery.isFetching ? "animate-spin" : ""}`} />
                  Refresh report
                </Button>
                <Button type="button" variant="outline" className="min-h-9" onClick={() => void handleCsvExport()}>
                  <Download className="mr-2 h-4 w-4" />
                  Export CSV
                </Button>
                <Button type="button" variant="outline" className="relative min-h-9 overflow-hidden">
                  <FileUp className="mr-2 h-4 w-4" />
                  Import CSV
                  <Input
                    type="file"
                    accept=".csv,text/csv"
                    onChange={handleCsvFile}
                    disabled={isPreviewingCsv || isImportingCsv}
                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                    aria-label="Import university CSV"
                  />
                </Button>
              </div>
            </div>

            {qualityQuery.isLoading ? (
              <div className="h-20 animate-pulse rounded-lg bg-muted" />
            ) : qualityQuery.error ? (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-3 text-sm text-destructive">
                Could not load the data-quality report. Check your admin session and try again.
              </div>
            ) : qualityQuery.data ? (
              <>
                <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
                  <div className="rounded-lg border bg-muted/20 p-3">
                    <p className="text-xs text-muted-foreground">Total records</p>
                    <p className="mt-1 text-xl font-semibold">{qualityQuery.data.total}</p>
                  </div>
                  <div className="rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-3">
                    <p className="text-xs text-muted-foreground">Complete</p>
                    <p className="mt-1 flex items-center gap-1 text-xl font-semibold text-emerald-600 dark:text-emerald-400">
                      <CheckCircle2 className="h-4 w-4" /> {qualityQuery.data.complete}
                    </p>
                  </div>
                  <div className="rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
                    <p className="text-xs text-muted-foreground">Warnings</p>
                    <p className="mt-1 text-xl font-semibold text-amber-600 dark:text-amber-400">{qualityQuery.data.warningCount}</p>
                  </div>
                  <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-3">
                    <p className="text-xs text-muted-foreground">Errors / duplicates</p>
                    <p className="mt-1 flex items-center gap-1 text-xl font-semibold text-destructive">
                      <AlertTriangle className="h-4 w-4" /> {qualityQuery.data.errorCount} / {qualityQuery.data.duplicateGroups}
                    </p>
                  </div>
                </div>
                {qualityQuery.data.issues.length > 0 && (
                  <div className="space-y-2 rounded-lg border p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">Priority issues</p>
                      <span className="text-xs text-muted-foreground">{qualityQuery.data.issueCount} total</span>
                    </div>
                    <div className="space-y-2">
                      {qualityQuery.data.issues.slice(0, 5).map((issue, index) => (
                        <div key={`${issue.universityId}-${issue.code}-${index}`} className="flex items-start gap-2 text-sm">
                          {issue.severity === "error" ? (
                            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                          ) : (
                            <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-amber-500" />
                          )}
                          <span className="min-w-0 text-muted-foreground">
                            <span className="font-medium text-foreground">{issue.universityNameEn || issue.universityName}</span>{" "}
                            {issue.message}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : null}

            {isPreviewingCsv && (
              <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-sm text-muted-foreground">
                Checking {csvName || "CSV"} for missing fields and duplicates…
              </div>
            )}
            {csvPreview && (
              <div className="space-y-3 rounded-lg border border-primary/30 bg-primary/5 p-3">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="text-sm font-medium">Preview: {csvName}</p>
                    <p className="text-xs text-muted-foreground">
                      {csvPreview.validRows} safe new rows · {csvPreview.duplicateRows} duplicates · {csvPreview.invalidRows} invalid rows
                    </p>
                  </div>
                  <Button
                    type="button"
                    className="min-h-9"
                    onClick={() => void handleCsvImport()}
                    disabled={isImportingCsv || csvPreview.validRows === 0}
                  >
                    {isImportingCsv ? "Importing…" : `Add ${csvPreview.validRows} safe rows`}
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Import is additive only: duplicate or invalid rows are skipped, and existing records are never updated or deleted.
                </p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader className="bg-muted/50">
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Min Score</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, index) => (
                    <TableRow key={`skeleton-${index}`}>
                      <TableCell>
                        <div className="space-y-2">
                          <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
                          <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
                        </div>
                      </TableCell>
                      <TableCell><div className="h-6 w-20 animate-pulse rounded-full bg-muted" /></TableCell>
                      <TableCell><div className="h-4 w-32 animate-pulse rounded bg-muted" /></TableCell>
                      <TableCell><div className="h-4 w-12 animate-pulse rounded bg-muted" /></TableCell>
                      <TableCell><div className="ml-auto h-8 w-20 animate-pulse rounded bg-muted" /></TableCell>
                    </TableRow>
                  ))
                ) : response?.universities.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={5}
                      className="text-center py-8 text-muted-foreground"
                    >
                      No universities found. Try changing the search or filters.
                    </TableCell>
                  </TableRow>
                ) : (
                  response?.universities.map((uni) => (
                    <TableRow key={uni.id}>
                      <TableCell>
                        <div className="font-medium">{uni.name}</div>
                        <div className="text-xs text-muted-foreground">
                          {uni.nameEn}
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" className="capitalize">
                          {uni.type}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {uni.city ? `${uni.city}, ` : ""}
                        {uni.state}
                      </TableCell>
                      <TableCell>{uni.minScore}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          aria-label={`Edit ${uni.nameEn || uni.name}`}
                          onClick={() => openEdit(uni)}
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          aria-label={`Delete ${uni.nameEn || uni.name}`}
                          onClick={() =>
                            setDeleteTarget({
                              id: uni.id,
                              name: uni.nameEn || uni.name,
                            })
                          }
                          disabled={deleteMutation.isPending}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        <Pagination
          page={page}
          total={response?.total ?? 0}
          pageSize={pageSize}
          onChange={(p) => {
            setPage(p);
            window.scrollTo({ top: 0, behavior: "smooth" });
          }}
        />

        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogContent className="flex max-h-[80vh] w-full max-w-2xl flex-col overflow-hidden p-0">
            <DialogHeader className="px-6 pt-6">
              <DialogTitle>
                {editingUniversity ? "Edit University" : "Add University"}
              </DialogTitle>
            </DialogHeader>
            <div className="scrollbar-hide grid flex-1 gap-4 overflow-y-auto overflow-x-hidden px-6 py-2">
              <div className="grid gap-2">
                <Label htmlFor="uni-name">Name (Myanmar) <span className="text-destructive">*</span></Label>
                <Input
                  id="uni-name"
                  value={form.name}
                  aria-invalid={Boolean(formErrors.name)}
                  onChange={(e) => updateFormField("name", e.target.value)}
                />
                {formErrors.name && <p className="text-xs text-destructive">{formErrors.name}</p>}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="uni-name-en">English Name <span className="text-destructive">*</span></Label>
                <Input
                  id="uni-name-en"
                  value={form.nameEn}
                  aria-invalid={Boolean(formErrors.nameEn)}
                  onChange={(e) => updateFormField("nameEn", e.target.value)}
                />
                {formErrors.nameEn && <p className="text-xs text-destructive">{formErrors.nameEn}</p>}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="uni-abbreviation">Abbreviation</Label>
                <Input
                  id="uni-abbreviation"
                  value={form.abbreviation}
                  onChange={(e) => updateFormField("abbreviation", e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label>Type <span className="text-destructive">*</span></Label>
                <Select
                  value={form.type}
                  onValueChange={(type) => updateFormField("type", type)}
                >
                  <SelectTrigger aria-invalid={Boolean(formErrors.type)}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {UNIVERSITY_TYPES.map((type) => (
                      <SelectItem
                        key={type}
                        value={type}
                        className="capitalize"
                      >
                        {type}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formErrors.type && <p className="text-xs text-destructive">{formErrors.type}</p>}
              </div>
              <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                  <Label>State/Region <span className="text-destructive">*</span></Label>
                  <Select
                    value={form.state}
                    onValueChange={(state) => {
                      updateFormField("state", state);
                      updateFormField("city", "");
                    }}
                  >
                    <SelectTrigger aria-invalid={Boolean(formErrors.state)}>
                      <SelectValue placeholder="Select state/region" />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px] overflow-y-auto">
                      <SelectGroup>
                        {/* <SelectLabel>တိုင်းဒေသကြီး</SelectLabel> */}
                        {MYANMAR_REGIONS.map((state) => (
                          <SelectItem key={state} value={state}>
                            {state}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                      <SelectGroup>
                        {/* <SelectLabel>ပြည်နယ်</SelectLabel> */}
                        {MYANMAR_STATE_DIVISIONS.map((state) => (
                          <SelectItem key={state} value={state}>
                            {state}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                      <SelectGroup>
                        {/* <SelectLabel>ပြည်ထောင်စုနယ်မြေ</SelectLabel> */}
                        {MYANMAR_UNION_TERRITORIES.map((state) => (
                          <SelectItem key={state} value={state}>
                            {state}
                          </SelectItem>
                        ))}
                      </SelectGroup>
                    </SelectContent>
                  </Select>
                  {formErrors.state && <p className="text-xs text-destructive">{formErrors.state}</p>}
                </div>

                <div className="grid gap-2">
                  <Label>City <span className="text-destructive">*</span></Label>
                  <Select
                    value={form.city}
                    onValueChange={(city) => updateFormField("city", city)}
                    disabled={!form.state}
                  >
                    <SelectTrigger aria-invalid={Boolean(formErrors.city)}>
                      <SelectValue
                        placeholder={
                          form.state ? "Select city" : "Select state first"
                        }
                      />
                    </SelectTrigger>
                    <SelectContent className="max-h-[300px] overflow-y-auto">
                      {availableCities.map((city) => (
                        <SelectItem key={city} value={city}>
                          {city}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {formErrors.city && <p className="text-xs text-destructive">{formErrors.city}</p>}
                </div>
              </div>
              <div className="grid gap-2">
                <Label htmlFor="uni-min-score">Min Score <span className="text-destructive">*</span></Label>
                <Input
                  id="uni-min-score"
                  type="number"
                  min="0"
                  value={form.minScore}
                  aria-invalid={Boolean(formErrors.minScore)}
                  onChange={(e) => updateFormField("minScore", e.target.value)}
                />
                {formErrors.minScore && <p className="text-xs text-destructive">{formErrors.minScore}</p>}
              </div>
              <div className="grid gap-2">
                <Label htmlFor="uni-description">Description</Label>
                <Textarea
                  id="uni-description"
                  value={form.description}
                  className="h-36"
                  onChange={(e) => updateFormField("description", e.target.value)}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="uni-website">Website</Label>
                <Input
                  id="uni-website"
                  type="url"
                  placeholder="https://example.edu.mm"
                  value={form.website}
                  aria-invalid={Boolean(formErrors.website)}
                  onChange={(e) => updateFormField("website", e.target.value)}
                />
                {formErrors.website && <p className="text-xs text-destructive">{formErrors.website}</p>}
              </div>
              <div className="grid gap-2">
                <Label>University Image</Label>
                <div className="flex flex-col gap-4">
                  {form.imageUrl && (
                    <div className="relative w-full h-40 rounded-md overflow-hidden border">
                      <img
                        src={form.imageUrl}
                        alt="University"
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="relative overflow-hidden shrink-0"
                      disabled={isUploadingImage}
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      {isUploadingImage ? "Uploading..." : "Upload Photo"}
                      <Input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        disabled={isUploadingImage}
                        className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
                      />
                    </Button>
                  </div>
                </div>
              </div>
              {majors && majors.length > 0 && (
                <div className="grid gap-2 mb-5">
                  <Label>Majors</Label>
                  <div className="grid gap-2 max-h-48 overflow-y-auto border rounded-md p-3">
                    {majors.map((major) => (
                      <label
                        key={major.id}
                        className="flex items-center gap-2 text-sm cursor-pointer"
                      >
                        <Checkbox
                          checked={form.majorIds.includes(major.id)}
                          onCheckedChange={() => toggleMajor(major.id)}
                        />
                        <span>{major.nameEn}</span>
                      </label>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <DialogFooter className="px-6 pb-6">
              <Button variant="outline" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={createMutation.isPending || updateMutation.isPending}
              >
                {editingUniversity ? "Save Changes" : "Create University"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <DeleteConfirmDialog
          open={deleteTarget !== null}
          onOpenChange={(open) => !open && setDeleteTarget(null)}
          title="Delete University"
          description={
            deleteTarget
              ? `Are you sure you want to delete "${deleteTarget.name}"? This action cannot be undone.`
              : ""
          }
          onConfirm={confirmDelete}
          isPending={deleteMutation.isPending}
        />
      </div>
    </AdminLayout>
  );
}
