import { Layout } from "@/components/layout";
import { useCalculateScore, useListUniversities } from "@workspace/api-client-react";
import { CheckCircle2, XCircle, ChevronRight, GraduationCap, BookOpen, FlaskConical, SlidersHorizontal, PenLine } from "lucide-react";
import { Link } from "wouter";
import { useState, useMemo, useEffect, useRef } from "react";

// ─── Subject definitions ──────────────────────────────────────────────────────

const SCIENCE_SUBJECTS = [
  { id: "myanmar",     label: "မြန်မာ",     labelEn: "Myanmar",     color: "bg-emerald-500", accent: "#10b981" },
  { id: "english",     label: "အင်္ဂလိပ်",  labelEn: "English",     color: "bg-blue-500",    accent: "#3b82f6" },
  { id: "mathematics", label: "သင်္ချာ",     labelEn: "Mathematics", color: "bg-violet-500",  accent: "#8b5cf6" },
  { id: "physics",     label: "ရူပဗေဒ",     labelEn: "Physics",     color: "bg-orange-500",  accent: "#f97316" },
  { id: "chemistry",   label: "ဓာတုဗေဒ",   labelEn: "Chemistry",   color: "bg-pink-500",    accent: "#ec4899" },
  { id: "biology",     label: "ဇီဝဗေဒ",    labelEn: "Biology",     color: "bg-teal-500",    accent: "#14b8a6" },
];

const ARTS_SUBJECTS = [
  { id: "myanmar",     label: "မြန်မာ",     labelEn: "Myanmar",     color: "bg-emerald-500", accent: "#10b981" },
  { id: "english",     label: "အင်္ဂလိပ်",  labelEn: "English",     color: "bg-blue-500",    accent: "#3b82f6" },
  { id: "mathematics", label: "သင်္ချာ",     labelEn: "Mathematics", color: "bg-violet-500",  accent: "#8b5cf6" },
  { id: "history",     label: "သမိုင်း",     labelEn: "History",     color: "bg-amber-500",   accent: "#f59e0b" },
  { id: "geography",   label: "ဘူမိဗေဒ",   labelEn: "Geography",   color: "bg-cyan-500",    accent: "#06b6d4" },
  { id: "economics",   label: "စီးပွားရေး", labelEn: "Economics",   color: "bg-rose-500",    accent: "#f43f5e" },
];

type Stream = "science" | "arts";
type InputMode = "subjects" | "slider";
type Scores = Record<string, string>;

// ─── Subject score input card ─────────────────────────────────────────────────

function ScoreInput({ subject, value, onChange }: {
  subject: typeof SCIENCE_SUBJECTS[number];
  value: string;
  onChange: (val: string) => void;
}) {
  const num = Math.min(100, Math.max(0, Number(value) || 0));
  const pct = num;

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col gap-2.5">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-bold text-gray-800 text-sm leading-tight">{subject.label}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">{subject.labelEn}</p>
        </div>
        <input
          type="number" min={0} max={100}
          value={value}
          onChange={(e) => {
            const v = e.target.value;
            if (v === "" || (Number(v) >= 0 && Number(v) <= 100)) onChange(v);
          }}
          placeholder="—"
          className="w-14 h-11 rounded-xl border-2 border-gray-200 focus:border-primary focus:outline-none text-center text-xl font-black text-gray-900 bg-gray-50 transition-colors"
        />
      </div>
      <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
        <div className={`h-full rounded-full transition-all duration-300 ${subject.color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ─── Total score slider ───────────────────────────────────────────────────────

const SLIDER_MIN = 240;
const SLIDER_MAX = 600;

function TotalScoreSlider({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  // pct for gradient fill position (240→600 range)
  const fillPct = Math.round(((value - SLIDER_MIN) / (SLIDER_MAX - SLIDER_MIN)) * 100);
  // pct shown in circle (actual score out of 600)
  const scorePct = Math.round((value / 600) * 100);
  const PRIMARY = "hsl(161, 80%, 25%)";
  const label =
    value < 320 ? { text: "ဝင်ခွင့်ရမှတ် မရောက်သေး", color: "text-red-500" } :
    value < 380 ? { text: "ကျောင်းအချို့ ဝင်ခွင့်ရနိုင်", color: "text-orange-500" } :
    value < 430 ? { text: "ကောင်းမွန်သည်", color: "text-yellow-600" } :
    value < 470 ? { text: "အလွန်ကောင်းသည်", color: "text-emerald-600" } :
    { text: "🏆 ဆေးကျောင်း ဝင်ခွင့်ရနိုင်", color: "text-emerald-700 font-bold" };

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6 space-y-5">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-sm text-gray-500">စုစုပေါင်း ရမှတ် ရွေးချယ်ရန်</p>
          <div className="flex items-end gap-1.5 mt-1">
            <span className="text-6xl font-black text-primary leading-none tabular-nums">{value}</span>
            <span className="text-gray-400 text-xl mb-1.5">/ 600</span>
          </div>
        </div>
        <div className="text-right">
          <div className="h-16 w-16 rounded-full border-4 border-primary/20 flex items-center justify-center bg-primary/5 ml-auto">
            <span className="text-base font-bold text-primary">{scorePct}%</span>
          </div>
        </div>
      </div>

      {/* Slider */}
      <div className="relative pt-1">
        <input
          type="range" min={SLIDER_MIN} max={SLIDER_MAX} step={5}
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
        <div className="flex justify-between text-[11px] text-gray-400 mt-2">
          <span>240</span><span>330</span><span>420</span><span>510</span><span>600</span>
        </div>
      </div>

      <p className={`text-sm text-center font-medium ${label.color}`}>{label.text}</p>
    </div>
  );
}

// ─── Result card (shared between modes) ──────────────────────────────────────

function ResultCard({ uni, userTotal, eligible }: { uni: any; userTotal: number; eligible: boolean }) {
  const required = uni.minScore ?? 0;
  const gap = required - userTotal;
  const pct = Math.min(100, Math.round((userTotal / Math.max(required, 1)) * 100));

  const TYPE_LABELS: Record<string, string> = {
    medical: "ဆေးပညာ", technical: "နည်းပညာ", government: "ဝိဇ္ဇာ/သိပ္ပံ", education: "ပညာရေး",
  };

  return (
    <div className={`rounded-2xl border overflow-hidden transition-all hover:shadow-md ${
      eligible ? "border-primary/30 bg-white shadow-sm" : "border-gray-200 bg-gray-50/60"
    }`}>
      <div className={`h-1 w-full ${eligible ? "bg-gradient-to-r from-primary to-emerald-400" : "bg-gray-200"}`} />
      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-gray-900 text-base leading-tight">{uni.name}</h3>
              {uni.abbreviation && (
                <span className="text-xs font-semibold text-primary bg-primary/10 px-2 py-0.5 rounded-full shrink-0">
                  {uni.abbreviation}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-0.5 truncate">{uni.nameEn}</p>
            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {uni.state && (
                <span className="text-[11px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">📍 {uni.state}</span>
              )}
              {uni.type && (
                <span className="text-[11px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                  {TYPE_LABELS[uni.type] ?? uni.type}
                </span>
              )}
              <span className="text-[11px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                🎓 ၂၀၂၆ ခုနှစ်
              </span>
            </div>

            {/* Progress bar toward cutoff */}
            <div className="mt-3 space-y-1">
              <div className="flex justify-between text-xs text-gray-500">
                <span>သင်ရမှတ်: <b className="text-gray-800">{userTotal}</b></span>
                <span>လိုအပ်မှတ်: <b className="text-gray-800">{required}</b></span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${eligible ? "bg-gradient-to-r from-primary to-emerald-400" : "bg-orange-300"}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              {!eligible && <p className="text-[11px] text-orange-600 font-medium">ဝင်ခွင့်ရရန် {gap} မှတ် ပိုလိုသေး</p>}
            </div>
          </div>

          <div className="flex flex-col items-end gap-2 shrink-0">
            {eligible ? (
              <div className="flex items-center gap-1.5 text-emerald-600 font-semibold text-sm bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full">
                <CheckCircle2 className="h-3.5 w-3.5" /> ဝင်ခွင့်ရ
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-gray-400 font-medium text-sm bg-gray-100 px-3 py-1.5 rounded-full">
                <XCircle className="h-3.5 w-3.5" /> မဝင်နိုင်သေး
              </div>
            )}
            <Link href={`/universities/${uni.id}`}>
              <span className={`flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-full cursor-pointer transition-colors ${
                eligible ? "text-primary bg-primary/10 hover:bg-primary/20" : "text-gray-500 bg-gray-100 hover:bg-gray-200"
              }`}>
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
  const [inputMode, setInputMode] = useState<InputMode>("subjects");
  const [stream, setStream] = useState<Stream>("science");
  const [scores, setScores] = useState<Scores>({});
  const [sliderTotal, setSliderTotal] = useState(SLIDER_MIN);
  const [hasSearched, setHasSearched] = useState(false);

  const calculateMutation = useCalculateScore();

  // For slider mode — fetch all universities, filter client-side
  const { data: allUnisResponse } = useListUniversities({});
  const allUniversities: any[] = (allUnisResponse as any)?.universities ?? [];

  const subjects = stream === "science" ? SCIENCE_SUBJECTS : ARTS_SUBJECTS;

  const subjectTotal = useMemo(
    () => subjects.reduce((sum, s) => sum + (Number(scores[s.id]) || 0), 0),
    [scores, subjects]
  );

  const maxPossible = subjects.length * 100;
  const subjectPct = maxPossible > 0 ? Math.round((subjectTotal / maxPossible) * 100) : 0;

  const handleStreamChange = (s: Stream) => {
    setStream(s); setScores({}); setHasSearched(false); calculateMutation.reset();
  };

  const handleSubjectSearch = () => {
    setHasSearched(true);
    const subjectData: Record<string, number> = {};
    subjects.forEach((s) => { subjectData[s.id] = Number(scores[s.id]) || 0; });
    calculateMutation.mutate({ data: { totalScore: subjectTotal, subjects: subjectData as any } });
  };

  // Slider mode — live filter from allUniversities
  const sliderResults = useMemo(() => {
    if (inputMode !== "slider" || allUniversities.length === 0) return [];
    const eligible = allUniversities.filter((u) => u.minScore != null && u.minScore <= sliderTotal);
    const notEligible = allUniversities
      .filter((u) => u.minScore != null && u.minScore > sliderTotal)
      .sort((a, b) => a.minScore - b.minScore)
      .slice(0, 8);
    return [
      ...eligible.sort((a, b) => b.minScore - a.minScore).map((u) => ({ uni: u, eligible: true })),
      ...notEligible.map((u) => ({ uni: u, eligible: false })),
    ];
  }, [sliderTotal, allUniversities, inputMode]);

  const subjectResults = calculateMutation.data;
  const subjectEligible = subjectResults?.filter((r: any) => r.eligible) ?? [];
  const subjectNotEligible = subjectResults?.filter((r: any) => !r.eligible) ?? [];

  const sliderEligibleCount = sliderResults.filter((r) => r.eligible).length;

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50/50">
        <div className="max-w-2xl mx-auto px-4 py-8 space-y-5">

          {/* Header */}
          <div className="text-center space-y-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">ဝင်ခွင့်ရမှတ် စစ်ဆေးရန်</h1>
            <p className="text-gray-500 text-sm">G-12 ရမှတ်ထည့်ပြီး တက္ကသိုလ်ဝင်ခွင့် စစ်ဆေးပါ</p>
          </div>

          {/* Input mode toggle */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-2 flex gap-2">
            <button
              onClick={() => { setInputMode("subjects"); setHasSearched(false); calculateMutation.reset(); }}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold text-sm transition-all ${
                inputMode === "subjects" ? "bg-primary text-white shadow-sm" : "text-gray-500 hover:bg-gray-50"
              }`}
            >
              <PenLine className="h-4 w-4" />
              ဘာသာရပ်တိုင်း ထည့်မည်
            </button>
            <button
              onClick={() => setInputMode("slider")}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold text-sm transition-all ${
                inputMode === "slider" ? "bg-primary text-white shadow-sm" : "text-gray-500 hover:bg-gray-50"
              }`}
            >
              <SlidersHorizontal className="h-4 w-4" />
              စုစုပေါင်းဖြင့် ရှာမည်
            </button>
          </div>

          {/* ── SUBJECT MODE ── */}
          {inputMode === "subjects" && (
            <>
              {/* Stream selector */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-2 flex gap-2">
                <button
                  onClick={() => handleStreamChange("science")}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-semibold text-sm transition-all ${
                    stream === "science" ? "bg-primary/10 text-primary" : "text-gray-500 hover:bg-gray-50"
                  }`}
                >
                  <FlaskConical className="h-4 w-4" /> သိပ္ပံ (Science)
                </button>
                <button
                  onClick={() => handleStreamChange("arts")}
                  className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-semibold text-sm transition-all ${
                    stream === "arts" ? "bg-primary/10 text-primary" : "text-gray-500 hover:bg-gray-50"
                  }`}
                >
                  <BookOpen className="h-4 w-4" /> ဝိဇ္ဇာ (Arts)
                </button>
              </div>

              {/* Subject input grid */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {subjects.map((subject) => (
                  <ScoreInput
                    key={`${stream}-${subject.id}`}
                    subject={subject}
                    value={scores[subject.id] ?? ""}
                    onChange={(val) => setScores((prev) => ({ ...prev, [subject.id]: val }))}
                  />
                ))}
              </div>

              {/* Total summary */}
              <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5 space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-500">စုစုပေါင်း ရမှတ်</p>
                    <div className="flex items-end gap-1.5 mt-1">
                      <span className="text-5xl font-black text-primary leading-none tabular-nums">{subjectTotal}</span>
                      <span className="text-gray-400 text-lg mb-1">/ {maxPossible}</span>
                    </div>
                  </div>
                  <div className="h-16 w-16 rounded-full border-4 border-primary/20 flex items-center justify-center bg-primary/5">
                    <span className="text-base font-bold text-primary">{subjectPct}%</span>
                  </div>
                </div>
                <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-gradient-to-r from-primary to-emerald-400 transition-all duration-500" style={{ width: `${subjectPct}%` }} />
                </div>
                <p className="text-center text-sm font-medium text-gray-500">
                  {subjectTotal < 350 ? "🔴 ဝင်ခွင့်ရမှတ် မရောက်သေး" :
                   subjectTotal < 400 ? "🟡 ကောင်းသည်" :
                   subjectTotal < 450 ? "🟢 ကောင်းမွန်သည်" : "🏆 အထူးကောင်းမွန်သည်"}
                </p>
              </div>

              {/* Search button */}
              <button
                onClick={handleSubjectSearch}
                disabled={subjectTotal === 0 || calculateMutation.isPending}
                className="w-full py-4 rounded-2xl bg-primary text-white font-bold text-base shadow-md hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {calculateMutation.isPending ? (
                  <><div className="h-5 w-5 rounded-full border-2 border-white/30 border-t-white animate-spin" /> စစ်ဆေးနေသည်...</>
                ) : (
                  <><GraduationCap className="h-5 w-5" /> တက္ကသိုလ် ဝင်ခွင့် စစ်ဆေးရန်</>
                )}
              </button>

              {/* Loading */}
              {calculateMutation.isPending && (
                <div className="space-y-3">
                  {[1,2,3].map((i) => (
                    <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse">
                      <div className="h-5 bg-gray-100 rounded w-1/2 mb-2" />
                      <div className="h-3 bg-gray-100 rounded w-1/3 mb-4" />
                      <div className="h-2 bg-gray-100 rounded w-full" />
                    </div>
                  ))}
                </div>
              )}

              {/* Subject mode results */}
              {subjectResults && !calculateMutation.isPending && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <h2 className="font-bold text-gray-900 text-lg">ရလဒ်များ</h2>
                    <div className="flex gap-2">
                      <span className="text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 rounded-full">✓ {subjectEligible.length} ကျောင်း</span>
                      <span className="text-xs font-semibold bg-gray-100 text-gray-500 px-3 py-1 rounded-full">✗ {subjectNotEligible.length} ကျောင်း</span>
                    </div>
                  </div>

                  {subjectEligible.length > 0 && (
                    <div className="space-y-3">
                      <p className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" /> ဝင်ခွင့်ရနိုင်သော တက္ကသိုလ်များ
                      </p>
                      {subjectEligible.map((m: any, i: number) => (
                        <ResultCard key={i} uni={m.university} userTotal={subjectTotal} eligible />
                      ))}
                    </div>
                  )}

                  {subjectNotEligible.length > 0 && (
                    <div className="space-y-3">
                      <p className="flex items-center gap-2 text-sm font-semibold text-gray-500">
                        <XCircle className="h-4 w-4 text-gray-400" /> မဝင်နိုင်သေးသော တက္ကသိုလ်များ
                      </p>
                      {subjectNotEligible.slice(0, 6).map((m: any, i: number) => (
                        <ResultCard key={i} uni={m.university} userTotal={subjectTotal} eligible={false} />
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
                    <h2 className="font-bold text-gray-900 text-lg">ရလဒ်များ</h2>
                    <div className="flex gap-2">
                      <span className="text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 rounded-full">
                        ✓ {sliderEligibleCount} ကျောင်း
                      </span>
                    </div>
                  </div>

                  {sliderEligibleCount > 0 && (
                    <div className="space-y-3">
                      <p className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" /> ဝင်ခွင့်ရနိုင်သော တက္ကသိုလ်များ
                      </p>
                      {sliderResults.filter((r) => r.eligible).map(({ uni }, i) => (
                        <ResultCard key={i} uni={uni} userTotal={sliderTotal} eligible />
                      ))}
                    </div>
                  )}

                  {sliderResults.filter((r) => !r.eligible).length > 0 && (
                    <div className="space-y-3">
                      <p className="flex items-center gap-2 text-sm font-semibold text-gray-500">
                        <XCircle className="h-4 w-4 text-gray-400" /> နီးစပ်သော တက္ကသိုလ်များ ({sliderTotal} + မှတ် ပိုလိုသည်)
                      </p>
                      {sliderResults.filter((r) => !r.eligible).map(({ uni }, i) => (
                        <ResultCard key={i} uni={uni} userTotal={sliderTotal} eligible={false} />
                      ))}
                    </div>
                  )}

                  {sliderEligibleCount === 0 && (
                    <div className="text-center py-10 bg-white rounded-2xl border border-gray-100">
                      <GraduationCap className="h-12 w-12 text-gray-200 mx-auto mb-3" />
                      <p className="text-gray-500 font-medium">ရမှတ် {sliderTotal} ဖြင့် ဝင်ခွင့်ရနိုင်သော ကျောင်း မတွေ့ပါ</p>
                      <p className="text-gray-400 text-sm mt-1">Slider ကို ညာဘက် ဆွဲ၍ ရမှတ်မြှင့်ကြည့်ပါ</p>
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
