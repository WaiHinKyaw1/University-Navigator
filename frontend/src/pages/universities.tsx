import { useEffect, useState } from "react";
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
} from "lucide-react";
import { Link } from "wouter";

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
}: {
  university: University;
  academicYear: string;
}) {
  return (
    <Card className="group flex flex-col overflow-hidden rounded-2xl border-gray-100 shadow-sm transition-all hover:border-primary/30 hover:shadow-md">
      <div
        className={`h-1.5 w-full ${TYPE_STRIP[university.type] ?? "bg-gradient-to-r from-gray-300 to-gray-400"}`}
      />

      <div className="relative h-32 overflow-hidden bg-gray-50">
        {university.imageUrl ? (
          <img
            src={university.imageUrl}
            alt={university.name}
            className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <Building2 className="h-10 w-10 text-gray-200" />
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
          <h3 className="line-clamp-2 text-sm font-bold leading-snug text-gray-900">
            {university.name}
          </h3>
          <p className="mt-0.5 line-clamp-1 text-[11px] text-gray-400">
            {university.nameEn}
          </p>
        </div>

        <div className="flex flex-wrap gap-1">
          <span className="flex items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] text-gray-500">
            <MapPin className="h-2.5 w-2.5" />
            {university.city || university.state}
          </span>
          <span className="flex items-center gap-1 rounded-full bg-primary/5 px-2 py-0.5 text-[10px] font-medium text-primary">
            <GraduationCap className="h-2.5 w-2.5" /> {academicYear}
          </span>
        </div>

        {university.majors && university.majors.length > 0 && (
          <div className="flex items-start gap-1 text-[11px] text-gray-500">
            <BookOpen className="mt-0.5 h-3 w-3 shrink-0 text-gray-400" />
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

        <div className="flex items-center justify-between border-t border-gray-100 pt-2">
          <span className="text-[11px] text-gray-400">လိုအပ်ရမှတ်</span>
          <span
            className={`rounded-full px-2.5 py-1 text-xs font-black ${SCORE_COLOR(university.minScore)}`}
          >
            {university.minScore} မှတ်
          </span>
        </div>
      </CardContent>

      <CardFooter className="p-4 pt-0">
        <Button asChild className="w-full rounded-xl" variant="outline" size="sm">
          <Link href={`/universities/${university.id}`}>အသေးစိတ် ကြည့်ရန်</Link>
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
    <div className="flex items-center justify-center gap-1.5 pt-4">
      <button
        type="button"
        onClick={() => onChange(page - 1)}
        disabled={page === 1}
        className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 transition-colors hover:border-primary/50 hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
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
            className={`h-9 min-w-9 rounded-xl px-2.5 text-sm font-semibold transition-colors ${
              candidate === page
                ? "bg-primary text-white shadow-sm"
                : "border border-gray-200 bg-white text-gray-600 hover:border-primary/50 hover:text-primary"
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
        className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 transition-colors hover:border-primary/50 hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
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

  const { data: siteSettings } = useGetSiteSettings();
  const { data: response, isLoading, isFetching, isError, refetch } =
    useListUniversities({
      search: search || undefined,
      type: activeCategory === "all" ? undefined : activeCategory,
      state: activeState === "all" ? undefined : activeState,
      page,
      limit: PAGE_SIZE,
      sortBy: "name",
      sortOrder: "asc",
    });

  useEffect(() => {
    const timeout = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);

    return () => window.clearTimeout(timeout);
  }, [searchInput]);

  const universities = response?.universities ?? [];
  const total = response?.total ?? 0;
  const academicYear = `ပညာသင်နှစ် ${siteSettings?.academicYear ?? "၂၀၂၅-၂၀၂၆"}`;

  const resetFilters = () => {
    setSearchInput("");
    setSearch("");
    setActiveCategory("all");
    setActiveState("all");
    setPage(1);
  };

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50/30">
        <div className="mx-auto max-w-6xl space-y-6 px-4 py-8">
          <div className="space-y-2 text-center">
            <div className="flex items-center justify-center gap-2">
              <h1 className="text-2xl font-bold text-gray-900">တက္ကသိုလ်များ</h1>
              {!isLoading && <Badge variant="secondary">{total} ခု</Badge>}
            </div>
            <p className="text-sm text-gray-500">
              မြန်မာနိုင်ငံရှိ တက္ကသိုလ်များကို အမည်၊ နေရာဒေသ၊ အမျိုးအစားအလိုက် ရှာဖွေကြည့်ရှုပါ — {academicYear}
            </p>
          </div>

          <div className="mx-auto flex max-w-3xl flex-col gap-3 sm:flex-row">
            <div className="relative flex-1">
              <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-gray-400" />
              <Input
                type="search"
                placeholder="အမည်၊ English name၊ abbreviation၊ မြို့ သို့မဟုတ် ပြည်နယ် ရှာပါ..."
                className="h-12 rounded-2xl border-gray-100 bg-white pl-10 shadow-sm"
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
              <SelectTrigger className="h-12 w-full shrink-0 rounded-2xl border-gray-100 bg-white shadow-sm sm:w-[240px]">
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

          <div className="flex flex-wrap justify-center gap-2">
            {CATEGORIES.map((category) => (
              <button
                key={category.value}
                type="button"
                onClick={() => {
                  setActiveCategory(category.value);
                  setPage(1);
                }}
                className={`flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-semibold transition-all ${
                  activeCategory === category.value
                    ? "border-primary bg-primary text-white shadow-sm"
                    : "border-gray-200 bg-white text-gray-600 hover:border-primary/40 hover:text-primary"
                }`}
              >
                <span>{category.emoji}</span>
                {category.label}
              </button>
            ))}
          </div>

          <div className="flex min-h-5 items-center justify-center gap-2 text-center text-xs text-gray-400">
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
            <div className="rounded-2xl border border-red-100 bg-white py-20 text-center">
              <Building2 className="mx-auto mb-3 h-12 w-12 text-red-200" />
              <p className="font-semibold text-gray-700">Data ရယူ၍ မရပါ</p>
              <p className="mt-1 text-sm text-gray-400">ကွန်ယက်ချိတ်ဆက်မှု စစ်ပြီး ပြန်လည် ကြိုးစားပါ</p>
              <Button variant="outline" className="mt-5" onClick={() => void refetch()}>
                ပြန်လည်ကြိုးစားမယ်
              </Button>
            </div>
          ) : universities.length === 0 ? (
            <div className="rounded-2xl border border-gray-100 bg-white py-20 text-center">
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
