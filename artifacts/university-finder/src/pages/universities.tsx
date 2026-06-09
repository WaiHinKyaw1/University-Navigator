import { useState, useMemo } from "react";
import { Layout } from "@/components/layout";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useListUniversities } from "@workspace/api-client-react";
import { Search, MapPin, BookOpen, Building2, GraduationCap } from "lucide-react";
import { Link } from "wouter";

// ─── Category config ──────────────────────────────────────────────────────────

const CATEGORIES = [
  { value: "all",        label: "ကျောင်းအားလုံး",    emoji: "🏛️" },
  { value: "medical",    label: "ဆေးပညာ",            emoji: "🏥" },
  { value: "technical",  label: "နည်းပညာ/ကွန်ပျူတာ", emoji: "⚙️" },
  { value: "government", label: "ဝိဇ္ဇာ/သိပ္ပံ",       emoji: "📚" },
  { value: "education",  label: "ပညာရေး",             emoji: "🎓" },
];

const TYPE_LABEL: Record<string, string> = {
  medical: "ဆေးပညာ",
  technical: "နည်းပညာ",
  government: "ဝိဇ္ဇာ/သိပ္ပံ",
  education: "ပညာရေး",
};

const TYPE_COLOR: Record<string, string> = {
  medical:    "bg-rose-50 text-rose-700 border-rose-200",
  technical:  "bg-blue-50 text-blue-700 border-blue-200",
  government: "bg-violet-50 text-violet-700 border-violet-200",
  education:  "bg-amber-50 text-amber-700 border-amber-200",
};

const CURRENT_YEAR = "၂၀၂၆";

// ─── University card ──────────────────────────────────────────────────────────

function UniCard({ uni }: { uni: any }) {
  const colorClass = TYPE_COLOR[uni.type] ?? "bg-gray-50 text-gray-600 border-gray-200";
  const typeLabel = TYPE_LABEL[uni.type] ?? uni.type;

  return (
    <Card className="flex flex-col overflow-hidden border-gray-100 shadow-sm hover:shadow-md transition-all hover:border-primary/30 rounded-2xl group">
      {/* Colour accent strip */}
      <div className={`h-1.5 w-full ${
        uni.type === "medical" ? "bg-gradient-to-r from-rose-400 to-pink-500" :
        uni.type === "technical" ? "bg-gradient-to-r from-blue-400 to-indigo-500" :
        uni.type === "education" ? "bg-gradient-to-r from-amber-400 to-orange-400" :
        "bg-gradient-to-r from-violet-400 to-purple-500"
      }`} />

      {/* Image / placeholder */}
      <div className="h-36 bg-gray-50 relative overflow-hidden">
        {uni.imageUrl ? (
          <img src={uni.imageUrl} alt={uni.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <Building2 className="h-12 w-12 text-gray-200" />
          </div>
        )}
        {/* Type badge overlay */}
        <div className="absolute top-2.5 right-2.5">
          <span className={`text-[11px] font-semibold px-2.5 py-1 rounded-full border ${colorClass} backdrop-blur-sm bg-opacity-90`}>
            {typeLabel}
          </span>
        </div>
        {/* Abbreviation overlay */}
        {uni.abbreviation && (
          <div className="absolute bottom-2.5 left-2.5">
            <span className="text-xs font-bold text-white bg-black/50 backdrop-blur-sm px-2 py-0.5 rounded-lg">
              {uni.abbreviation}
            </span>
          </div>
        )}
      </div>

      <CardContent className="flex-1 p-4 space-y-3">
        {/* Names */}
        <div>
          <h3 className="font-bold text-gray-900 text-base leading-snug line-clamp-2">{uni.name}</h3>
          {uni.nameEn && <p className="text-xs text-gray-400 mt-0.5 line-clamp-1">{uni.nameEn}</p>}
        </div>

        {/* Meta chips */}
        <div className="flex flex-wrap gap-1.5">
          {uni.state && (
            <span className="flex items-center gap-1 text-[11px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
              <MapPin className="h-2.5 w-2.5" /> {uni.city ? `${uni.city}, ` : ""}{uni.state}
            </span>
          )}
          <span className="flex items-center gap-1 text-[11px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
            <GraduationCap className="h-2.5 w-2.5" /> ကျောင်းတက်မည့်ခုနှစ်: {CURRENT_YEAR}
          </span>
        </div>

        {/* Majors */}
        {uni.majors?.length > 0 && (
          <div className="flex items-start gap-1.5 text-xs text-gray-500">
            <BookOpen className="h-3.5 w-3.5 shrink-0 mt-0.5 text-gray-400" />
            <span className="line-clamp-2">{uni.majors.slice(0, 4).map((m: any) => m.name ?? m).join("  •  ")}{uni.majors.length > 4 ? ` +${uni.majors.length - 4}` : ""}</span>
          </div>
        )}

        {/* Min score */}
        <div className="pt-2.5 border-t border-gray-100 flex items-center justify-between">
          <span className="text-xs text-gray-500">လိုအပ်ရမှတ်</span>
          <span className={`text-sm font-black px-3 py-1 rounded-full ${
            uni.minScore >= 450 ? "bg-rose-50 text-rose-700" :
            uni.minScore >= 400 ? "bg-orange-50 text-orange-700" :
            uni.minScore >= 360 ? "bg-yellow-50 text-yellow-700" :
            "bg-emerald-50 text-emerald-700"
          }`}>{uni.minScore} မှတ်</span>
        </div>
      </CardContent>

      <CardFooter className="p-4 pt-0">
        <Button asChild className="w-full rounded-xl" variant="outline" size="sm">
          <Link href={`/universities/${uni.id}`}>အသေးစိတ် ကြည့်ရန်</Link>
        </Button>
      </CardFooter>
    </Card>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function Universities() {
  const [search, setSearch] = useState("");
  const [activeCategory, setActiveCategory] = useState("all");

  const { data: response, isLoading } = useListUniversities({
    search: search || undefined,
  });

  const universities: any[] = (response as any)?.universities ?? [];

  const filtered = useMemo(() => {
    if (activeCategory === "all") return universities;
    return universities.filter((u) => u.type === activeCategory);
  }, [universities, activeCategory]);

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50/30">
        <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">

          {/* Header */}
          <div className="text-center space-y-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">တက္ကသိုလ်များ</h1>
            <p className="text-gray-500 text-sm">မြန်မာနိုင်ငံ တက္ကသိုလ်ပေါင်း {universities.length}+ ကို ဝင်ရောက်ကြည့်ရှုနိုင်သည်</p>
          </div>

          {/* Search */}
          <div className="relative max-w-lg mx-auto">
            <Search className="absolute left-3.5 top-3.5 h-4 w-4 text-gray-400" />
            <Input
              type="search"
              placeholder="တက္ကသိုလ်နာမည် ရှာပါ..."
              className="pl-10 h-12 bg-white rounded-2xl border-gray-100 shadow-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Category filter chips */}
          <div className="flex gap-2 flex-wrap justify-center">
            {CATEGORIES.map((cat) => {
              const count = cat.value === "all"
                ? universities.length
                : universities.filter((u) => u.type === cat.value).length;
              return (
                <button
                  key={cat.value}
                  onClick={() => setActiveCategory(cat.value)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-full text-sm font-semibold transition-all border ${
                    activeCategory === cat.value
                      ? "bg-primary text-white border-primary shadow-sm"
                      : "bg-white text-gray-600 border-gray-200 hover:border-primary/40 hover:text-primary"
                  }`}
                >
                  <span>{cat.emoji}</span>
                  {cat.label}
                  <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                    activeCategory === cat.value ? "bg-white/20 text-white" : "bg-gray-100 text-gray-500"
                  }`}>{count}</span>
                </button>
              );
            })}
          </div>

          {/* Grid */}
          {isLoading ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {[1,2,3,4,5,6].map((i) => (
                <Card key={i} className="overflow-hidden rounded-2xl border-gray-100">
                  <div className="h-36 bg-gray-100 animate-pulse" />
                  <div className="p-4 space-y-3">
                    <Skeleton className="h-5 w-3/4" />
                    <Skeleton className="h-3 w-1/2" />
                    <Skeleton className="h-3 w-full" />
                    <Skeleton className="h-8 w-full mt-2" />
                  </div>
                </Card>
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-20 bg-white rounded-2xl border border-gray-100">
              <Building2 className="mx-auto h-12 w-12 text-gray-200 mb-3" />
              <p className="text-gray-600 font-medium">တက္ကသိုလ် မတွေ့ပါ</p>
              <p className="text-gray-400 text-sm mt-1">ရှာဖွေမှု သို့ Filter ပြောင်းကြည့်ပါ</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
              {filtered.map((uni) => <UniCard key={uni.id} uni={uni} />)}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
