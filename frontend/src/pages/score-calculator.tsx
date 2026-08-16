import { Layout } from "@/components/layout";
import {
  useCalculateScore,
  useListMajors,
  useListUniversities,
} from "@workspace/api-client-react";
import {
  CheckCircle2,
  XCircle,
  ChevronRight,
  GraduationCap,
  BookOpen,
  FlaskConical,
  SlidersHorizontal,
  PenLine,
} from "lucide-react";
import { Link } from "wouter";
import { useState, useMemo, useEffect } from "react";
import { useScoreStore } from "@/store/score-store";

// ─── Subject definitions ──────────────────────────────────────────────────────

const BASE_SUBJECT = {
  myanmar: {
    id: "myanmar",
    label: "မြန်မာ",
    labelEn: "Myanmar",
    color: "bg-emerald-500",
    accent: "#10b981",
  },
  english: {
    id: "english",
    label: "အင်္ဂလိပ်",
    labelEn: "English",
    color: "bg-blue-500",
    accent: "#3b82f6",
  },
  mathematics: {
    id: "mathematics",
    label: "သင်္ချာ",
    labelEn: "Mathematics",
    color: "bg-violet-500",
    accent: "#8b5cf6",
  },
  physics: {
    id: "physics",
    label: "ရူပဗေဒ",
    labelEn: "Physics",
    color: "bg-orange-500",
    accent: "#f97316",
  },
  chemistry: {
    id: "chemistry",
    label: "ဓာတုဗေဒ",
    labelEn: "Chemistry",
    color: "bg-pink-500",
    accent: "#ec4899",
  },
  biology: {
    id: "biology",
    label: "ဇီဝဗေဒ",
    labelEn: "Biology",
    color: "bg-teal-500",
    accent: "#14b8a6",
  },
  economics: {
    id: "economics",
    label: "ဘောဂဗေဒ",
    labelEn: "Economics",
    color: "bg-rose-500",
    accent: "#f43f5e",
  },
  history: {
    id: "history",
    label: "သမိုင်း",
    labelEn: "History",
    color: "bg-amber-500",
    accent: "#f59e0b",
  },
  geography: {
    id: "geography",
    label: "ဘူမိဗေဒ",
    labelEn: "Geography",
    color: "bg-cyan-500",
    accent: "#06b6d4",
  },
} as const;

type SubjectDef = (typeof BASE_SUBJECT)[keyof typeof BASE_SUBJECT];

const SCIENCE_BASE_SUBJECTS: SubjectDef[] = [
  BASE_SUBJECT.myanmar,
  BASE_SUBJECT.english,
  BASE_SUBJECT.mathematics,
  BASE_SUBJECT.physics,
  BASE_SUBJECT.chemistry,
];

const SCIENCE_SIXTH_SUBJECTS = {
  biology: BASE_SUBJECT.biology,
  economics: BASE_SUBJECT.economics,
} as const;

const ARTS_SUBJECTS: SubjectDef[] = [
  BASE_SUBJECT.myanmar,
  BASE_SUBJECT.english,
  BASE_SUBJECT.mathematics,
  BASE_SUBJECT.history,
  BASE_SUBJECT.geography,
  BASE_SUBJECT.economics,
];

type Stream = "science" | "arts";
type ScienceSixth = keyof typeof SCIENCE_SIXTH_SUBJECTS;
type InputMode = "subjects" | "slider";
type Scores = Record<string, string>;

// ─── Subject score input card ─────────────────────────────────────────────────

function ScoreInput({
  subject,
  value,
  onChange,
}: {
  subject: SubjectDef;
  value: string;
  onChange: (val: string) => void;
}) {
  const num = Math.min(100, Math.max(0, Number(value) || 0));
  const pct = num;
  const isFailed = value !== "" && Number(value) < 40;

  return (
    <div className={`flex flex-col gap-2.5 rounded-2xl border p-4 shadow-sm transition-colors ${isFailed ? "border-red-300 bg-red-50/50 shadow-red-100 dark:bg-red-950/20" : "border-border bg-card"}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-bold leading-tight text-card-foreground">
            {subject.label}
          </p>
          <p className="mt-0.5 text-[11px] text-muted-foreground">{subject.labelEn}</p>
        </div>
        <div className="flex flex-col items-end">
          <input
            type="number"
            min={0}
            max={100}
            value={value}
            onChange={(e) => {
              const v = e.target.value;
              if (v === "" || (Number(v) >= 0 && Number(v) <= 100)) onChange(v);
            }}
            placeholder="—"
            className={`h-11 w-14 rounded-xl border-2 text-center text-xl font-black transition-colors focus:outline-none ${isFailed ? "border-red-300 bg-red-50 text-red-700 focus:border-red-500 dark:bg-red-950/30" : "border-input bg-muted/40 text-foreground focus:border-primary"}`}
          />
          {isFailed && <p className="text-[10px] text-red-500 font-bold mt-1">ကျရှုံး</p>}
        </div>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-all duration-300 ${isFailed ? "bg-red-400" : subject.color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

// ─── Total score slider ───────────────────────────────────────────────────────

const SLIDER_MIN = 240;
const SLIDER_MAX = 600;

function TotalScoreSlider({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  // pct for gradient fill position (240→600 range)
  const fillPct = Math.round(
    ((value - SLIDER_MIN) / (SLIDER_MAX - SLIDER_MIN)) * 100,
  );
  // pct shown in circle (actual score out of 600)
  const scorePct = Math.round((value / 600) * 100);
  const PRIMARY = "hsl(161, 80%, 25%)";
  const label =
    value < 320
      ? { text: "ဝင်ခွင့်ရမှတ် မရောက်သေး", color: "text-red-500" }
      : value < 380
        ? { text: "ကျောင်းအချို့ ဝင်ခွင့်ရနိုင်", color: "text-orange-500" }
        : value < 430
          ? { text: "ကောင်းမွန်သည်", color: "text-yellow-600" }
          : value < 470
            ? { text: "အလွန်ကောင်းသည်", color: "text-emerald-600" }
            : {
              text: "🏆 ဆေးကျောင်း ဝင်ခွင့်ရနိုင်",
              color: "text-emerald-700 font-bold",
            };

  return (
    <div className="space-y-5 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-sm text-muted-foreground">စုစုပေါင်း ရမှတ် ရွေးချယ်ရန်</p>
          <div className="flex items-end gap-1.5 mt-1">
            <span className="text-6xl font-black text-primary leading-none tabular-nums">
              {value}
            </span>
            <span className="mb-1.5 text-xl text-muted-foreground">/ 600</span>
          </div>
        </div>
        <div className="text-right">
          <div className="h-16 w-16 rounded-full border-4 border-primary/20 flex items-center justify-center bg-primary/5 ml-auto">
            <span className="text-base font-bold text-primary">
              {scorePct}%
            </span>
          </div>
        </div>
      </div>

      {/* Slider */}
      <div className="relative pt-1">
        <input
          type="range"
          min={SLIDER_MIN}
          max={SLIDER_MAX}
          step={5}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-full h-3 rounded-full appearance-none cursor-pointer"
          style={{
            background: `linear-gradient(to right, ${PRIMARY} 0%, ${PRIMARY} ${fillPct}%, #e5e7eb ${fillPct}%, #e5e7eb 100%)`,
          }}
        />
        <style>{`
          input[type=range]::-webkit-slider-thumb {
            -webkit-appearance: none;
            width: 24px; height: 24px;
            border-radius: 50%;
            background: hsl(161, 80%, 25%);
            border: 3px solid white;
            box-shadow: 0 2px 6px rgba(0,0,0,0.25);
            cursor: pointer;
          }
          input[type=range]::-moz-range-thumb {
            width: 24px; height: 24px;
            border-radius: 50%;
            background: hsl(161, 80%, 25%);
            border: 3px solid white;
            box-shadow: 0 2px 6px rgba(0,0,0,0.25);
            cursor: pointer;
            border: none;
          }
        `}</style>
        <div className="mt-2 flex justify-between text-[11px] text-muted-foreground">
          <span>240</span>
          <span>330</span>
          <span>420</span>
          <span>510</span>
          <span>600</span>
        </div>
      </div>

      <p className={`text-sm text-center font-medium ${label.color}`}>
        {label.text}
      </p>
    </div>
  );
}

// ─── Result card (shared between modes) ──────────────────────────────────────

function ResultCard({
  uni,
  userTotal,
  eligible,
  matchScore,
  majorMatch,
  recommendationTier,
  recommendationReasons,
}: {
  uni: any;
  userTotal: number;
  eligible: boolean;
  matchScore?: number;
  majorMatch?: boolean;
  recommendationTier?: string;
  recommendationReasons?: string[];
}) {
  const required = uni.minScore ?? 0;
  const gap = required - userTotal;
  const pct = Math.min(
    100,
    Math.round((userTotal / Math.max(required, 1)) * 100),
  );

  const TYPE_LABELS: Record<string, string> = {
    medical: "ဆေးပညာ",
    technical: "နည်းပညာ",
    government: "ဝိဇ္ဇာ/သိပ္ပံ",
    education: "ပညာရေး",
  };

  return (
    <div
      className="rounded-2xl border border-primary/30 bg-card overflow-hidden transition-all hover:shadow-md shadow-sm"
    >
              <div className="h-1 w-full bg-gradient-to-r from-primary to-emerald-400" />
      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold leading-tight text-card-foreground">
                {uni.name}
              </h3>
              {uni.abbreviation && (
                <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full shrink-0">
                  {uni.abbreviation}
                </span>
              )}
            </div>
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {uni.nameEn}
            </p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {uni.state && (
                <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                  📍 {uni.state}
                </span>
              )}
              {uni.type && (
                <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                  {TYPE_LABELS[uni.type] ?? uni.type}
                </span>
              )}
              <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                🎓 ၂၀၂၆ ခုနှစ်
              </span>
            </div>

            {/* Progress bar toward cutoff */}
            <div className="mt-3 space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>
                  သင်ရမှတ်: <b className="text-card-foreground">{userTotal}</b>
                </span>
                <span>
                  လိုအပ်မှတ်: <b className="text-card-foreground">{required}</b>
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary to-emerald-400 transition-all duration-500"
                  style={{ width: `${pct}%` }}
                />
              </div>
              {recommendationReasons && recommendationReasons.length > 0 && (
                <div className="mt-3 rounded-xl border border-primary/15 bg-primary/5 p-3">
                  <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-primary">
                    <span>{recommendationTier === "strong" ? "အထူးသင့်တော်" : recommendationTier === "near" ? "နီးစပ်သော ရွေးချယ်မှု" : "ကိုက်ညီမှု ရှင်းလင်းချက်"}</span>
                    {typeof matchScore === "number" && <span className="rounded-full bg-primary/10 px-2 py-0.5">{matchScore}%</span>}
                    {majorMatch && <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-emerald-700 dark:text-emerald-300">ဘာသာရပ်ကိုက်ညီ</span>}
                  </div>
                  <ul className="mt-1.5 space-y-1 text-[11px] text-muted-foreground">
                    {recommendationReasons.slice(0, 3).map((reason) => <li key={reason}>• {reason}</li>)}
                  </ul>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-col items-end gap-2 shrink-0">
            <div className="flex items-center gap-1.5 text-emerald-600 font-semibold text-sm bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full">
              <CheckCircle2 className="h-3.5 w-3.5" /> ဝင်ခွင့်ရ
            </div>
            <Link href={`/universities/${uni.id}`}>
              <span
                className={`flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-full cursor-pointer transition-colors ${eligible
                  ? "text-primary bg-primary/10 hover:bg-primary/20"
                  : "text-gray-500 bg-gray-100 hover:bg-gray-200"
                  }`}
              >
                အသေးစိတ် <ChevronRight className="h-3 w-3" />
              </span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ScoreCalculator() {
  // const [inputMode, setInputMode] = useState<InputMode>("subjects");
  // const [stream, setStream] = useState<Stream>("science");
  // const [scienceSixth, setScienceSixth] = useState<ScienceSixth>("biology");
  // const [scores, setScores] = useState<Scores>({});
  // const [sliderTotal, setSliderTotal] = useState(SLIDER_MIN);
  // const [hasSearched, setHasSearched] = useState(false);
  const {
    inputMode,
    setInputMode,

    stream,
    setStream,

    scienceSixth,
    setScienceSixth,

    scores,
    setScores,

    sliderTotal,
    setSliderTotal,

    preferredMajorIds,
    setPreferredMajorIds,

    hasSearched,
    setHasSearched,

    results,
    setResults,
  } = useScoreStore();

  const calculateMutation = useCalculateScore();
  const { data: majorListResponse, isLoading: isMajorsLoading } = useListMajors();
  useEffect(() => {
    if (calculateMutation.data) {
      setResults(calculateMutation.data as any[]);
    }
  }, [calculateMutation.data, setResults]);

  // For slider mode — fetch all universities, filter client-side
  const { data: allUnisResponse } = useListUniversities({
    compact: true,
    limit: 1000,
  });
  const allUniversities: any[] = (allUnisResponse as any)?.universities ?? [];
  const majorOptions: any[] = ((majorListResponse as any[]) ?? []).slice(0, 24);

  const subjects = useMemo(() => {
    if (stream === "science") {
      return [...SCIENCE_BASE_SUBJECTS, SCIENCE_SIXTH_SUBJECTS[scienceSixth]];
    }
    return ARTS_SUBJECTS;
  }, [stream, scienceSixth]);

  const subjectTotal = useMemo(
    () => subjects.reduce((sum, s) => sum + (Number(scores[s.id]) || 0), 0),
    [scores, subjects],
  );

  const isFailedExam = useMemo(() => {
    return subjects.some(s => {
      const val = scores[s.id];
      return val !== "" && val !== undefined && Number(val) < 40;
    });
  }, [scores, subjects]);

  const maxPossible = subjects.length * 100;
  const subjectPct =
    maxPossible > 0 ? Math.round((subjectTotal / maxPossible) * 100) : 0;

  const handleStreamChange = (s: Stream) => {
    setStream(s);
    setScores({});
    setScienceSixth("biology");
    setHasSearched(false);
    calculateMutation.reset();
  };

  const handleScienceSixthChange = (sixth: ScienceSixth) => {
    setScienceSixth(sixth);

    const next = { ...scores };
    const other = sixth === "biology" ? "economics" : "biology";
    delete next[other];

    setScores(next);

    setHasSearched(false);
    calculateMutation.reset();
  };
  const togglePreferredMajor = (majorId: number) => {
    if (!preferredMajorIds.includes(majorId) && preferredMajorIds.length >= 3) return;
    const next = preferredMajorIds.includes(majorId)
      ? preferredMajorIds.filter((id) => id !== majorId)
      : [...preferredMajorIds, majorId];
    setPreferredMajorIds(next);
    setHasSearched(false);
    calculateMutation.reset();
  };

  const handleSubjectSearch = () => {
    setHasSearched(true);
    const subjectData: Record<string, number> = {};
    subjects.forEach((s) => {
      subjectData[s.id] = Number(scores[s.id]) || 0;
    });
    calculateMutation.mutate({
      data: {
        totalScore: subjectTotal,
        subjects: subjectData as any,
        preferredMajorIds: preferredMajorIds.length > 0 ? preferredMajorIds : undefined,
      },
    });
  };

  // Slider mode — live filter from allUniversities
  const sliderResults = useMemo(() => {
    if (inputMode !== "slider" || allUniversities.length === 0) return [];
    const eligible = allUniversities.filter(
      (u) => u.minScore != null && u.minScore <= sliderTotal,
    );
    return [
      ...eligible
        .sort((a, b) => b.minScore - a.minScore)
        .map((u) => ({ uni: u, eligible: true })),
    ];
  }, [sliderTotal, allUniversities, inputMode]);

  // const subjectResults = calculateMutation.data;
  const subjectResults = (calculateMutation.data as any[]) || results;
  const filteredSubjectResults = useMemo(() => {
    const list = (subjectResults as any[]) ?? [];
    if (stream === "science" && scienceSixth === "economics") {
      // Myanmar rules: economics (science option) students are not eligible for medical universities
      return list.filter((r) => r?.university?.type !== "medical");
    }
    return list;
  }, [subjectResults, stream, scienceSixth]);

  const subjectEligible =
    filteredSubjectResults.filter((r: any) => r.eligible) ?? [];
  const sliderEligibleCount = sliderResults.filter((r) => r.eligible).length;

  return (
    <Layout>
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-4xl space-y-5 px-4 py-6 sm:py-8">
          {/* Header */}
          <div className="text-center space-y-1">
            <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
              ဝင်ခွင့်ရမှတ် စစ်ဆေးရန်
            </h1>
            <p className="text-sm text-muted-foreground">
              G-12 ရမှတ်ထည့်ပြီး တက္ကသိုလ်ဝင်ခွင့် စစ်ဆေးပါ
            </p>
          </div>

          {/* Input mode toggle */}
          <div className="flex gap-2 rounded-2xl border border-border bg-card p-2 shadow-sm">
            <button
              onClick={() => {
                setInputMode("subjects");
                setHasSearched(false);
                calculateMutation.reset();
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold text-sm transition-all ${inputMode === "subjects"
                ? "bg-primary text-white shadow-sm"
                : "text-muted-foreground hover:bg-muted"
                }`}
            >
              <PenLine className="h-4 w-4" />
              ဘာသာရပ်တိုင်း ထည့်မည်
            </button>
            <button
              onClick={() => setInputMode("slider")}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold text-sm transition-all ${inputMode === "slider"
                ? "bg-primary text-white shadow-sm"
                : "text-muted-foreground hover:bg-muted"
                }`}
            >
              <SlidersHorizontal className="h-4 w-4" />
              စုစုပေါင်းဖြင့် ရှာမည်
            </button>
          </div>

          {/* Preferred major preferences */}
          <section className="space-y-3 rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="text-sm font-bold text-card-foreground">စိတ်ဝင်စားသော ဘာသာရပ်များ</h2>
                <p className="mt-1 text-xs text-muted-foreground">အများဆုံး ၃ ခုရွေးပါ။ ရွေးချယ်မှုများကို ရလဒ်အစီအစဉ်တွင် ထည့်သွင်းစဉ်းစားမည်။</p>
              </div>
              <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">{preferredMajorIds.length}/3</span>
            </div>
            {isMajorsLoading ? (
              <div className="h-10 animate-pulse rounded-xl bg-muted" />
            ) : majorOptions.length > 0 ? (
              <div className="grid grid-cols-1 gap-2 min-[420px]:grid-cols-2 sm:grid-cols-3">
                {majorOptions.map((major) => {
                  const selected = preferredMajorIds.includes(major.id);
                  const disabled = !selected && preferredMajorIds.length >= 3;
                  return (
                    <button
                      key={major.id}
                      type="button"
                      onClick={() => togglePreferredMajor(major.id)}
                      disabled={disabled}
                      aria-pressed={selected}
                      className={`touch-target rounded-xl border px-3 py-2 text-left text-xs transition-colors ${selected ? "border-primary bg-primary/10 text-primary" : "border-border bg-background text-muted-foreground hover:bg-muted"} ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
                    >
                      <span className="block font-semibold">{major.name}</span>
                      <span className="mt-0.5 block truncate text-[10px] opacity-80">{major.nameEn}</span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">ဘာသာရပ်စာရင်း မရရှိသေးပါ။ ရမှတ်အပေါ်မူတည်၍ ရှာဖွေနိုင်ပါသည်။</p>
            )}
          </section>

          {/* ── SUBJECT MODE ── */}
          {inputMode === "subjects" && (
            <>
              {/* Stream selector */}
              <div className="flex gap-2 rounded-2xl border border-border bg-card p-2 shadow-sm">
                <button
                  onClick={() => handleStreamChange("science")}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-semibold text-sm transition-all ${stream === "science"
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted"
                    }`}
                >
                  <FlaskConical className="h-4 w-4" /> သိပ္ပံ (Science)
                </button>
                <button
                  onClick={() => handleStreamChange("arts")}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-semibold text-sm transition-all ${stream === "arts"
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground hover:bg-muted"
                    }`}
                >
                  <BookOpen className="h-4 w-4" /> ဝိဇ္ဇာ (Arts)
                </button>
              </div>

              {/* Science 6th subject choice */}
              {stream === "science" && (
                <div className="space-y-2">
                  <div className="flex gap-2 rounded-2xl border border-border bg-card p-2 shadow-sm">
                    <button
                      onClick={() => handleScienceSixthChange("biology")}
                      className={`flex-1 py-2.5 px-4 rounded-xl font-semibold text-sm transition-all ${scienceSixth === "biology"
                        ? "bg-teal-50 text-teal-700 border border-teal-200"
                        : "text-muted-foreground hover:bg-muted"
                        }`}
                    >
                      ဇီဝဗေဒ (Biology)
                    </button>
                    <button
                      onClick={() => handleScienceSixthChange("economics")}
                      className={`flex-1 py-2.5 px-4 rounded-xl font-semibold text-sm transition-all ${scienceSixth === "economics"
                        ? "bg-rose-50 text-rose-700 border border-rose-200"
                        : "text-muted-foreground hover:bg-muted"
                        }`}
                    >
                      ဘောဂ (Economics)
                    </button>
                  </div>
                  {scienceSixth === "economics" && (
                    <p className="px-1 text-[12px] text-muted-foreground">
                      မှတ်ချက်: ဘောဂ ရွေးထားပါက <b>ဆေးတက္ကသိုလ်</b> များကို
                      ရလဒ်တွင် မပြပါ။
                    </p>
                  )}
                </div>
              )}

              {/* Subject input grid */}
              <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 sm:grid-cols-3">
                {subjects.map((subject) => (
                  <ScoreInput
                    key={`${stream}-${subject.id}`}
                    subject={subject}
                    value={scores[subject.id] ?? ""}
                    onChange={(val) =>
                      setScores({
                        ...scores,
                        [subject.id]: val,
                      })
                    }
                  />
                ))}
              </div>

              {/* Total summary */}
              <div className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">စုစုပေါင်း ရမှတ်</p>
                    <div className="flex items-end gap-1.5 mt-1">
                      <span className="text-5xl font-black text-primary leading-none tabular-nums">
                        {subjectTotal}
                      </span>
                      <span className="mb-1 text-lg text-muted-foreground">
                        / {maxPossible}
                      </span>
                    </div>
                  </div>
                  <div className="h-16 w-16 rounded-full border-4 border-primary/20 flex items-center justify-center bg-primary/5">
                    <span className="text-base font-bold text-primary">
                      {subjectPct}%
                    </span>
                  </div>
                </div>
                <div className="h-3 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary to-emerald-400 transition-all duration-500"
                    style={{ width: `${subjectPct}%` }}
                  />
                </div>
                <p className="text-center text-sm font-medium text-muted-foreground">
                  {isFailedExam
                    ? <span className="text-red-500 font-bold">❌ ဘာသာရပ်တစ်ခုခု ၄၀ အောက်ရရှိပါက တက္ကသိုလ်ဝင်ခွင့် မရနိုင်ပါ</span>
                    : subjectTotal < 350
                    ? "🔴 ဝင်ခွင့်ရမှတ် မရောက်သေး"
                    : subjectTotal < 400
                      ? "🟡 ကောင်းသည်"
                      : subjectTotal < 450
                        ? "🟢 ကောင်းမွန်သည်"
                        : "🏆 အထူးကောင်းမွန်သည်"}
                </p>
              </div>

              {/* Search button */}
              <button
                onClick={handleSubjectSearch}
                disabled={subjectTotal === 0 || isFailedExam || calculateMutation.isPending}
                className="touch-target flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-base font-bold text-primary-foreground shadow-md transition-all hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50"
              >
                {calculateMutation.isPending ? (
                  <>
                    <div className="h-5 w-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />{" "}
                    စစ်ဆေးနေသည်...
                  </>
                ) : (
                  <>
                    <GraduationCap className="h-5 w-5" /> တက္ကသိုလ် ဝင်ခွင့်
                    စစ်ဆေးရန်
                  </>
                )}
              </button>

              {/* Loading */}
              {calculateMutation.isPending && (
                <div className="space-y-3">
                  {[1, 2, 3].map((i) => (
                    <div
                      key={i}
                      className="animate-pulse rounded-2xl border border-border bg-card p-5"
                    >
                      <div className="mb-2 h-5 w-1/2 rounded bg-muted" />
                      <div className="mb-4 h-3 w-1/3 rounded bg-muted" />
                      <div className="h-2 w-full rounded bg-muted" />
                    </div>
                  ))}
                </div>
              )}

              {/* Subject mode results */}
              {isFailedExam ? (
                <div className="mt-4 space-y-3 rounded-2xl border border-red-200 bg-red-50 p-6 text-center dark:bg-red-950/20">
                  <XCircle className="mx-auto h-12 w-12 text-red-500" />
                  <h3 className="text-lg font-bold text-red-700">တက္ကသိုလ်တက်ရောက်ရန် မအောင်မြင်ပါ</h3>
                  <p className="text-sm text-red-600">
                    ဘာသာရပ်တိုင်းတွင် အနည်းဆုံး ရမှတ် (၄၀) ရရှိရန် လိုအပ်ပါသည်။
                  </p>
                </div>
              ) : subjectResults && !calculateMutation.isPending && (
                <div className="space-y-6 mt-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-foreground">
                      ရလဒ်များ
                    </h2>
                    <div className="flex gap-2">
                      <span className="text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 rounded-full">
                        ✓ {subjectEligible.length} ကျောင်း
                      </span>
                    </div>
                  </div>

                  {subjectEligible.length > 0 && (
                    <div className="space-y-3">
                      <p className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />{" "}
                        ဝင်ခွင့်ရနိုင်သော တက္ကသိုလ်များ
                      </p>
                      {subjectEligible.map((m: any, i: number) => (
                        <ResultCard
                          key={i}
                          uni={m.university}
                          userTotal={subjectTotal}
                          eligible
                          matchScore={m.matchScore}
                          majorMatch={m.majorMatch}
                          recommendationTier={m.recommendationTier}
                          recommendationReasons={m.recommendationReasons}
                        />
                      ))}
                    </div>
                  )}

                </div>
              )}
            </>
          )}

          {/* ── SLIDER MODE ── */}
          {inputMode === "slider" && (
            <>
              <TotalScoreSlider value={sliderTotal} onChange={setSliderTotal} />

              {/* Live results */}
              {allUniversities.length > 0 && (
                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-foreground">
                      ရလဒ်များ
                    </h2>
                    <div className="flex gap-2">
                      <span className="text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 rounded-full">
                        ✓ {sliderEligibleCount} ကျောင်း
                      </span>
                    </div>
                  </div>

                  {sliderEligibleCount > 0 && (
                    <div className="space-y-3">
                      <p className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />{" "}
                        ဝင်ခွင့်ရနိုင်သော တက္ကသိုလ်များ
                      </p>
                      {sliderResults
                        .filter((r) => r.eligible)
                        .map(({ uni }, i) => (
                          <ResultCard
                            key={i}
                            uni={uni}
                            userTotal={sliderTotal}
                            eligible
                          />
                        ))}
                    </div>
                  )}


                  {sliderEligibleCount === 0 && (
                    <div className="text-center py-10 bg-white rounded-2xl border border-gray-100">
                      <GraduationCap className="h-12 w-12 text-gray-200 mx-auto mb-3" />
                      <p className="text-gray-500 font-medium">
                        ရမှတ် {sliderTotal} ဖြင့် ဝင်ခွင့်ရနိုင်သော ကျောင်း
                        မတွေ့ပါ
                      </p>
                      <p className="text-gray-400 text-sm mt-1">
                        Slider ကို ညာဘက် ဆွဲ၍ ရမှတ်မြှင့်ကြည့်ပါ
                      </p>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </Layout>
  );
}
