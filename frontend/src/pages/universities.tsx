import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/layout";
import FavoriteButton from "@/components/favorite-button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  getListUniversitiesQueryOptions,
  useGetSiteSettings,
  useListUniversities,
  type University,
} from "@workspace/api-client-react";
import {
  MYANMAR_REGIONS,
  MYANMAR_STATE_DIVISIONS,
  MYANMAR_UNION_TERRITORIES,
} from "@/lib/myanmar-locations";
import {
  Search,
  MapPin,
  BookOpen,
  Building2,
  GraduationCap,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  GitCompareArrows,
  X,
} from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";
import { useCompare } from "@/hooks/use-compare";

const PAGE_SIZE = 9;

const CATEGORIES = [
  { value: "all", label: "ကျောင်းအားလုံး", emoji: "🏛️" },
  { value: "medical", label: "ဆေးပညာ", emoji: "🏥" },
  { value: "technical", label: "နည်းပညာ/ကွန်ပျူတာ", emoji: "⚙️" },
  { value: "government", label: "ဝိဇ္ဇာ/သိပ္ပံ", emoji: "📚" },
  { value: "education", label: "ပညာရေး", emoji: "🎓" },
  { value: "business", label: "စီးပွားရေး", emoji: "💼" },
  { value: "law", label: "ဥပဒေ", emoji: "⚖️" },
  { value: "distance", label: "အဝေးသင်", emoji: "📡" },
];

const TYPE_LABEL: Record<string, string> = {
  medical: "ဆေးပညာ",
  technical: "နည်းပညာ",
  government: "ဝိဇ္ဇာ/သိပ္ပံ",
  education: "ပညာရေး",
  business: "စီးပွားရေး",
  law: "ဥပဒေ",
  distance: "အဝေးသင်",
};

const TYPE_STRIP: Record<string, string> = {
  medical: "bg-gradient-to-r from-rose-400 to-pink-500",
  technical: "bg-gradient-to-r from-blue-400 to-indigo-500",
  education: "bg-gradient-to-r from-amber-400 to-orange-400",
  government: "bg-gradient-to-r from-violet-400 to-purple-500",
  business: "bg-gradient-to-r from-emerald-400 to-teal-500",
  law: "bg-gradient-to-r from-slate-400 to-gray-500",
  distance: "bg-gradient-to-r from-cyan-400 to-blue-500",
};

const TYPE_BADGE: Record<string, string> = {
  medical: "bg-rose-50 text-rose-700 border-rose-200",
  technical: "bg-blue-50 text-blue-700 border-blue-200",
  government: "bg-violet-50 text-violet-700 border-violet-200",
  education: "bg-amber-50 text-amber-700 border-amber-200",
  business: "bg-emerald-50 text-emerald-700 border-emerald-200",
  law: "bg-slate-50 text-slate-700 border-slate-200",
  distance: "bg-cyan-50 text-cyan-700 border-cyan-200",
};

const SCORE_COLOR = (score: number) =>
  score >= 450
    ? "bg-rose-50 text-rose-700"
    : score >= 400
      ? "bg-orange-50 text-orange-700"
      : score >= 360
        ? "bg-yellow-50 text-yellow-700"
        : "bg-emerald-50 text-emerald-700";

function UniversityCard({
  university,
  academicYear,
  isCompared,
  onToggleCompare,
}: {
  university: University;
  academicYear: string;
  isCompared: boolean;
  onToggleCompare: (university: University) => void;
}) {
  return (
    <Card className="group flex flex-col overflow-hidden rounded-2xl border-border bg-card shadow-sm transition-all hover:border-primary/30 hover:shadow-md">
      <div
        className={`h-1.5 w-full ${TYPE_STRIP[university.type] ?? "bg-gradient-to-r from-gray-300 to-gray-400"}`}
      />

      <div className="relative h-32 overflow-hidden bg-muted/30">
        {university.imageUrl ? (
            <img
            src={university.imageUrl}
            alt={university.name}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Building2 className="h-10 w-10 text-muted-foreground/40" />
          </div>
        )}
        <div className="absolute right-2 top-2 flex items-center gap-2">
          <span
            className={`rounded-full border px-2 py-0.5 text-[10px] font-bold ${TYPE_BADGE[university.type] ?? "border-gray-200 bg-gray-50 text-gray-600"}`}
          >
            {TYPE_LABEL[university.type] ?? university.type}
          </span>
          <FavoriteButton universityId={university.id} compact />
        </div>
        {university.abbreviation && (
          <div className="absolute bottom-2 left-2">
            <span className="rounded-lg bg-black/50 px-2 py-0.5 text-xs font-bold text-white">
              {university.abbreviation}
            </span>
          </div>
        )}
      </div>

      <CardContent className="flex-1 space-y-2.5 p-4">
        <div>
          <h3 className="line-clamp-2 text-sm font-bold leading-snug text-card-foreground">
            {university.name}
          </h3>
          <p className="mt-0.5 line-clamp-1 text-[11px] text-muted-foreground">
            {university.nameEn}
          </p>
        </div>

        <div className="flex flex-wrap gap-1">
          <span className="flex items-center gap-1 rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
            <MapPin className="h-2.5 w-2.5" />
            {university.city || university.state}
          </span>
          <span className="flex items-center gap-1 rounded-full bg-primary/5 px-2 py-0.5 text-[10px] font-medium text-primary">
            <GraduationCap className="h-2.5 w-2.5" /> {academicYear}
          </span>
        </div>

        {university.majors && university.majors.length > 0 && (
          <div className="flex items-start gap-1 text-[11px] text-muted-foreground">
            <BookOpen className="mt-0.5 h-3 w-3 shrink-0 text-muted-foreground" />
            <span className="line-clamp-2">
              {university.majors
                .slice(0, 3)
                .map((major) => major.name)
                .join(" • ")}
              {university.majors.length > 3
                ? ` +${university.majors.length - 3}`
                : ""}
            </span>
          </div>
        )}

        <div className="flex items-center justify-between border-t border-border pt-2">
          <span className="text-[11px] text-muted-foreground">လိုအပ်ရမှတ်</span>
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-black ${SCORE_COLOR(university.minScore)}`}
          >
            {university.minScore} မှတ်
          </span>
        </div>
      </CardContent>

      <CardFooter className="grid grid-cols-2 gap-2 p-4 pt-0">
        <Button asChild className="rounded-xl" variant="outline" size="sm">
          <Link href={`/universities/${university.id}`}>အသေးစိတ် ကြည့်ရန်</Link>
        </Button>
        <Button
          type="button"
          className="rounded-xl"
          variant={isCompared ? "default" : "secondary"}
          size="sm"
          onClick={() => onToggleCompare(university)}
          aria-pressed={isCompared}
        >
          <GitCompareArrows className="mr-1.5 h-3.5 w-3.5" />
          {isCompared ? "ရွေးပြီး" : "Compare"}
        </Button>
      </CardFooter>
    </Card>
  );
}

function Pagination({
  page,
  total,
  pageSize,
  onChange,
}: {
  page: number;
  total: number;
  pageSize: number;
  onChange: (nextPage: number) => void;
}) {
  const totalPages = Math.ceil(total / pageSize);
  if (totalPages <= 1) return null;

  const pages = Array.from({ length: totalPages }, (_, index) => index + 1);
  const visiblePages = pages.filter(
    (candidate) =>
      candidate === 1 ||
      candidate === totalPages ||
      Math.abs(candidate - page) <= 1,
  );

  return (
    <div className="flex flex-wrap items-center justify-center gap-1.5 pt-4">
      <button
        type="button"
        onClick={() => onChange(page - 1)}
        disabled={page === 1}
        className="touch-target flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="Previous page"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      {visiblePages.map((candidate, index, visible) => (
        <span key={candidate} className="flex items-center gap-1.5">
          {index > 0 && visible[index - 1] !== candidate - 1 && (
            <span className="px-1 text-sm text-gray-400">…</span>
          )}
          <button
            type="button"
            onClick={() => onChange(candidate)}
            className={`touch-target h-9 min-w-9 rounded-xl px-2.5 text-sm font-semibold transition-colors ${
              candidate === page
                ? "bg-primary text-white shadow-sm"
                : "border border-border bg-card text-muted-foreground hover:border-primary/50 hover:text-primary"
            }`}
            aria-label={`Page ${candidate}`}
            aria-current={candidate === page ? "page" : undefined}
          >
            {candidate}
          </button>
        </span>
      ))}

      <button
        type="button"
        onClick={() => onChange(page + 1)}
        disabled={page === totalPages}
        className="touch-target flex h-9 w-9 items-center justify-center rounded-xl border border-border bg-card text-muted-foreground transition-colors hover:border-primary/50 hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
        aria-label="Next page"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </div>
  );
}

export default function Universities() {
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");
  const [activeState, setActiveState] = useState("all");
  const [page, setPage] = useState(1);
  const {
    universities: compareUniversities,
    isSelected,
    canAdd,
    addUniversity,
    removeUniversity,
    clearUniversities,
  } = useCompare();

  const queryClient = useQueryClient();
  const { data: siteSettings } = useGetSiteSettings();
  const listParams = useMemo(
    () => ({
      search: search || undefined,
      type: activeCategory === "all" ? undefined : activeCategory,
      state: activeState === "all" ? undefined : activeState,
      page,
      limit: PAGE_SIZE,
      compact: true,
      sortBy: "name" as const,
      sortOrder: "asc" as const,
    }),
    [activeCategory, activeState, page, search],
  );
  const { data: response, isLoading, isFetching, isError, refetch } =
    useListUniversities(listParams);

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [searchInput]);

  const universities = response?.universities ?? [];
  const total = response?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const academicYear = `ပညာသင်နှစ် ${siteSettings?.academicYear ?? "၂၀၂၅-၂၀၂၆"}`;

  useEffect(() => {
    if (page >= totalPages) return;

    void queryClient.prefetchQuery(
      getListUniversitiesQueryOptions({ ...listParams, page: page + 1 }),
    );
  }, [getListUniversitiesQueryOptions, listParams, page, queryClient, totalPages]);

  const resetFilters = () => {
    setSearchInput("");
    setSearch("");
    setActiveCategory("all");
    setActiveState("all");
    setPage(1);
  };

  const handleToggleCompare = (university: University) => {
    if (isSelected(university.id)) {
      removeUniversity(university.id);
      return;
    }

    if (!canAdd) {
      toast.error("တက္ကသိုလ် ၄ ခုအထိသာ Compare လုပ်နိုင်ပါတယ်");
      return;
    }

    addUniversity(university);
    toast.success(`${university.name} ကို Compare စာရင်းထဲ ထည့်ပြီးပါပြီ`);
  };

  return (
    <Layout>
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-6xl space-y-5 px-4 py-6 sm:space-y-6 sm:py-8">
          <div className="space-y-2 text-center">
            <div className="flex items-center justify-center gap-2">
              <h1 className="text-2xl font-bold text-foreground sm:text-3xl">တက္ကသိုလ်များ</h1>
              {!isLoading && <Badge variant="secondary">{total} ခု</Badge>}
            </div>
            <p className="text-sm text-muted-foreground">
              မြန်မာနိုင်ငံရှိ တက္ကသိုလ်များကို အမည်၊ နေရာဒေသ၊ အမျိုးအစားအလိုက် ရှာဖွေကြည့်ရှုပါ — {academicYear}
            </p>
          </div>

          <div className="mx-auto flex max-w-3xl flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-gray-400" />
              <Input
                type="search"
                placeholder="အမည်၊ English name၊ abbreviation၊ မြို့ သို့မဟုတ် ပြည်နယ် ရှာပါ..."
                className="h-12 rounded-2xl border-input bg-card pl-10 shadow-sm"
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                aria-label="Search universities"
              />
            </div>
            <Select
              value={activeState}
              onValueChange={(value) => {
                setActiveState(value);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-12 w-full shrink-0 rounded-2xl border-input bg-card shadow-sm sm:w-[240px]">
                <SelectValue placeholder="တိုင်းဒေသကြီး / ပြည်နယ်" />
              </SelectTrigger>
              <SelectContent className="max-h-[320px] overflow-y-auto">
                <SelectItem value="all">ပြည်နယ်/တိုင်းအားလုံး</SelectItem>
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
          </div>

          <div className="-mx-1 flex flex-wrap justify-center gap-2 px-1">
            {CATEGORIES.map((category) => (
              <button
                key={category.value}
                type="button"
                onClick={() => {
                  setActiveCategory(category.value);
                  setPage(1);
                }}
                className={`touch-target flex items-center gap-1.5 rounded-full border px-3 py-2 text-sm font-semibold transition-all sm:px-4 ${
                  activeCategory === category.value
                    ? "border-primary bg-primary text-white shadow-sm"
                    : "border-border bg-card text-muted-foreground hover:border-primary/40 hover:text-primary"
                }`}
              >
                <span>{category.emoji}</span>
                {category.label}
              </button>
            ))}
          </div>

          <div className="flex min-h-5 flex-wrap items-center justify-center gap-x-2 gap-y-1 text-center text-xs text-muted-foreground">
            {isFetching && !isLoading && <span>ရှာဖွေနေသည်...</span>}
            {!isLoading && !isFetching && total > 0 && (
              <span>
                {total} ခု တွေ့ရှိသည် — စာမျက်နှာ {page}/{Math.ceil(total / PAGE_SIZE)}
              </span>
            )}
            {(search || activeCategory !== "all" || activeState !== "all") && !isLoading && (
              <button
                type="button"
                onClick={resetFilters}
                className="inline-flex items-center gap-1 text-primary hover:underline"
              >
                <RotateCcw className="h-3 w-3" />
                Filter ပြန်စမယ်
              </button>
            )}
          </div>

          {compareUniversities.length > 0 && (
            <div className="safe-area-pb sticky bottom-0 z-30 -mx-2 flex flex-col gap-3 rounded-2xl border border-primary/20 bg-background/95 p-3 shadow-lg backdrop-blur sm:bottom-4 sm:mx-0 sm:flex-row sm:items-center sm:justify-between sm:p-4">
              <div className="flex min-w-0 items-center gap-3">
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <GitCompareArrows className="h-4 w-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-foreground">
                    Compare စာရင်း <Badge variant="secondary" className="ml-1">{compareUniversities.length}/4</Badge>
                  </p>
                  <div className="mt-1 flex max-w-full gap-1.5 overflow-x-auto">
                    {compareUniversities.map((university) => (
                      <button
                        key={university.id}
                        type="button"
                        onClick={() => removeUniversity(university.id)}
                        className="inline-flex max-w-48 shrink-0 items-center gap-1 rounded-full border border-border bg-muted/40 px-2 py-1 text-[11px] text-muted-foreground hover:border-destructive/40 hover:text-destructive"
                        title="Compare စာရင်းမှ ဖယ်မယ်"
                      >
                        <span className="truncate">{university.name}</span>
                        <X className="h-3 w-3 shrink-0" />
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="flex w-full shrink-0 items-center gap-2 sm:w-auto">
                <Button type="button" variant="ghost" size="sm" className="flex-1 sm:flex-none" onClick={clearUniversities}>
                  အားလုံးဖယ်မယ်
                </Button>
                <Button asChild size="sm" className="flex-1 sm:flex-none" disabled={compareUniversities.length < 2}>
                  <Link href="/compare">
                    <GitCompareArrows className="mr-1.5 h-4 w-4" />
                    Compare ကြည့်မယ်
                  </Link>
                </Button>
              </div>
            </div>
          )}

          {isLoading ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3, 4, 5, 6].map((index) => (
                <Card key={index} className="overflow-hidden rounded-2xl border-gray-100">
                  <Skeleton className="h-32 rounded-none" />
                  <div className="space-y-3 p-4">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="mt-2 h-8 w-full" />
                  </div>
                </Card>
              ))}
            </div>
          ) : isError ? (
            <div className="rounded-2xl border border-red-200/60 bg-card px-4 py-16 text-center">
              <Building2 className="mx-auto mb-3 h-12 w-12 text-red-200" />
              <p className="font-semibold text-gray-700">Data ရယူ၍ မရပါ</p>
              <p className="mt-1 text-sm text-gray-400">ကွန်ယက်ချိတ်ဆက်မှု စစ်ပြီး ပြန်လည် ကြိုးစားပါ</p>
              <Button variant="outline" className="mt-5" onClick={() => void refetch()}>
                ပြန်လည်ကြိုးစားမယ်
              </Button>
            </div>
          ) : universities.length === 0 ? (
            <div className="rounded-2xl border border-border bg-card px-4 py-16 text-center">
              <Building2 className="mx-auto mb-3 h-12 w-12 text-gray-200" />
              <p className="font-medium text-gray-600">တက္ကသိုလ် မတွေ့ပါ</p>
              <p className="mt-1 text-sm text-gray-400">ရှာဖွေမှု သို့မဟုတ် Filter ပြောင်းကြည့်ပါ</p>
              <Button variant="outline" className="mt-5" onClick={resetFilters}>
                Filter ပြန်စမယ်
              </Button>
            </div>
          ) : (
            <>
              <div className={`grid grid-cols-1 gap-5 transition-opacity sm:grid-cols-2 lg:grid-cols-3 ${isFetching ? "opacity-60" : "opacity-100"}`}>
                {universities.map((university) => (
                  <UniversityCard
                    key={university.id}
                    university={university}
                    academicYear={academicYear}
                    isCompared={isSelected(university.id)}
                    onToggleCompare={handleToggleCompare}
                  />
                ))}
              </div>
              <Pagination
                page={page}
                total={total}
                pageSize={PAGE_SIZE}
                onChange={(nextPage) => {
                  setPage(nextPage);
                  window.scrollTo({ top: 0, behavior: "smooth" });
                }}
              />
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
