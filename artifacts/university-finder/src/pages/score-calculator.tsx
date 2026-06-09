import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useCalculateScore } from "@workspace/api-client-react";
import { CheckCircle2, XCircle, ChevronRight, GraduationCap, BookOpen, FlaskConical } from "lucide-react";
import { Link } from "wouter";
import { useState, useMemo } from "react";

// ─── Subject definitions ──────────────────────────────────────────────────────

const SCIENCE_SUBJECTS = [
  { id: "myanmar",     label: "မြန်မာ",       labelEn: "Myanmar",     color: "bg-emerald-500" },
  { id: "english",     label: "အင်္ဂလိပ်",    labelEn: "English",     color: "bg-blue-500" },
  { id: "mathematics", label: "သင်္ချာ",       labelEn: "Mathematics", color: "bg-violet-500" },
  { id: "physics",     label: "ရူပဗေဒ",       labelEn: "Physics",     color: "bg-orange-500" },
  { id: "chemistry",   label: "ဓာတုဗေဒ",     labelEn: "Chemistry",   color: "bg-pink-500" },
  { id: "biology",     label: "ဇီဝဗေဒ",      labelEn: "Biology",     color: "bg-teal-500" },
];

const ARTS_SUBJECTS = [
  { id: "myanmar",     label: "မြန်မာ",       labelEn: "Myanmar",     color: "bg-emerald-500" },
  { id: "english",     label: "အင်္ဂလိပ်",    labelEn: "English",     color: "bg-blue-500" },
  { id: "mathematics", label: "သင်္ချာ",       labelEn: "Mathematics", color: "bg-violet-500" },
  { id: "history",     label: "သမိုင်း",       labelEn: "History",     color: "bg-amber-500" },
  { id: "geography",   label: "ဘူမိဗေဒ",     labelEn: "Geography",   color: "bg-cyan-500" },
  { id: "economics",   label: "စီးပွားရေး",   labelEn: "Economics",   color: "bg-rose-500" },
];

type Stream = "science" | "arts";
type Scores = Record<string, string>;

function ScoreInput({
  subject,
  value,
  onChange,
}: {
  subject: { id: string; label: string; labelEn: string; color: string };
  value: string;
  onChange: (val: string) => void;
}) {
  const num = Number(value) || 0;
  const pct = Math.min(100, (num / 100) * 100);

  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="font-semibold text-gray-800 text-sm leading-tight">{subject.label}</p>
          <p className="text-[11px] text-gray-400 mt-0.5">{subject.labelEn}</p>
        </div>
        <div className="relative">
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
            className="w-16 h-12 rounded-xl border-2 border-gray-200 focus:border-primary focus:outline-none text-center text-xl font-bold text-gray-800 bg-gray-50 transition-colors"
          />
        </div>
      </div>
      {/* progress bar */}
      <div className="h-1.5 rounded-full bg-gray-100 overflow-hidden">
        <div
          className={`h-full rounded-full transition-all duration-300 ${subject.color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <div className="flex justify-between text-[10px] text-gray-400">
        <span>0</span>
        <span>100 မှတ်</span>
      </div>
    </div>
  );
}

// ─── Result card ──────────────────────────────────────────────────────────────

function ResultCard({
  match,
  userTotal,
}: {
  match: any;
  userTotal: number;
}) {
  const eligible = match.eligible;
  const required = match.university.minScore ?? 0;
  const pct = Math.min(100, Math.round((userTotal / required) * 100));
  const gap = required - userTotal;

  return (
    <div
      className={`rounded-2xl border overflow-hidden transition-all ${
        eligible
          ? "border-primary/30 bg-white shadow-sm hover:shadow-md hover:border-primary/50"
          : "border-gray-200 bg-gray-50/50 opacity-80 hover:opacity-100"
      }`}
    >
      {/* top strip */}
      <div className={`h-1 w-full ${eligible ? "bg-gradient-to-r from-primary to-emerald-400" : "bg-gray-200"}`} />

      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-4">
          {/* left info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="font-bold text-gray-900 text-base leading-tight truncate">
                {match.university.name}
              </h3>
              {match.university.abbreviation && (
                <span className="text-xs font-medium text-primary bg-primary/10 px-2 py-0.5 rounded-full shrink-0">
                  {match.university.abbreviation}
                </span>
              )}
            </div>
            <p className="text-xs text-gray-400 mt-0.5 truncate">{match.university.nameEn}</p>

            <div className="flex items-center gap-2 mt-2 flex-wrap">
              {match.university.state && (
                <span className="text-[11px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full">
                  📍 {match.university.state}
                </span>
              )}
              {match.university.type && (
                <span className="text-[11px] text-gray-500 bg-gray-100 px-2 py-0.5 rounded-full capitalize">
                  {match.university.type}
                </span>
              )}
            </div>

            {/* Progress toward cutoff */}
            <div className="mt-3 space-y-1">
              <div className="flex justify-between text-xs text-gray-500">
                <span>သင်ရမှတ်: <span className="font-semibold text-gray-800">{userTotal}</span></span>
                <span>လိုအပ်ရမှတ်: <span className="font-semibold text-gray-800">{required}</span></span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${eligible ? "bg-gradient-to-r from-primary to-emerald-400" : "bg-orange-300"}`}
                  style={{ width: `${pct}%` }}
                />
              </div>
              {!eligible && (
                <p className="text-[11px] text-orange-600 font-medium">
                  ဝင်ခွင့်ရရန် {gap} မှတ် ပိုလိုသေး
                </p>
              )}
            </div>
          </div>

          {/* right badge + button */}
          <div className="flex flex-col items-end gap-2 shrink-0">
            {eligible ? (
              <div className="flex items-center gap-1.5 text-emerald-600 font-semibold text-sm bg-emerald-50 border border-emerald-200 px-3 py-1.5 rounded-full">
                <CheckCircle2 className="h-4 w-4" />
                ဝင်ခွင့်ရသည်
              </div>
            ) : (
              <div className="flex items-center gap-1.5 text-gray-500 font-medium text-sm bg-gray-100 px-3 py-1.5 rounded-full">
                <XCircle className="h-4 w-4" />
                မဝင်နိုင်သေး
              </div>
            )}
            <Link href={`/universities/${match.university.id}`}>
              <button className={`flex items-center gap-1 text-xs font-medium px-3 py-1.5 rounded-full transition-colors ${
                eligible
                  ? "text-primary bg-primary/10 hover:bg-primary/20"
                  : "text-gray-500 bg-gray-100 hover:bg-gray-200"
              }`}>
                အသေးစိတ် <ChevronRight className="h-3 w-3" />
              </button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────

export default function ScoreCalculator() {
  const [stream, setStream] = useState<Stream>("science");
  const [scores, setScores] = useState<Scores>({});
  const [hasSearched, setHasSearched] = useState(false);

  const calculateMutation = useCalculateScore();

  const subjects = stream === "science" ? SCIENCE_SUBJECTS : ARTS_SUBJECTS;

  const total = useMemo(() =>
    subjects.reduce((sum, s) => sum + (Number(scores[s.id]) || 0), 0),
    [scores, subjects]
  );

  const maxPossible = subjects.length * 100;

  const handleStreamChange = (s: Stream) => {
    setStream(s);
    setScores({});
    setHasSearched(false);
    calculateMutation.reset();
  };

  const handleCheck = () => {
    setHasSearched(true);
    const subjectData: Record<string, number> = {};
    subjects.forEach((s) => { subjectData[s.id] = Number(scores[s.id]) || 0; });
    calculateMutation.mutate({
      data: { totalScore: total, subjects: subjectData as any },
    });
  };

  const results = calculateMutation.data;
  const eligible = results?.filter((r: any) => r.eligible) ?? [];
  const notEligible = results?.filter((r: any) => !r.eligible) ?? [];

  const totalPct = maxPossible > 0 ? Math.round((total / maxPossible) * 100) : 0;

  return (
    <Layout>
      <div className="min-h-screen bg-gray-50/50">
        <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

          {/* Header */}
          <div className="text-center space-y-1">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">ဝင်ခွင့်ရမှတ် စစ်ဆေးရန်</h1>
            <p className="text-gray-500 text-sm">G-12 ရမှတ်ထည့်ပြီး တက္ကသိုလ်ဝင်ခွင့် စစ်ဆေးပါ</p>
          </div>

          {/* Stream selector */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-2 flex gap-2">
            <button
              onClick={() => handleStreamChange("science")}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold text-sm transition-all ${
                stream === "science"
                  ? "bg-primary text-white shadow-sm"
                  : "text-gray-500 hover:bg-gray-50"
              }`}
            >
              <FlaskConical className="h-4 w-4" />
              သိပ္ပံ (Science)
            </button>
            <button
              onClick={() => handleStreamChange("arts")}
              className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-semibold text-sm transition-all ${
                stream === "arts"
                  ? "bg-primary text-white shadow-sm"
                  : "text-gray-500 hover:bg-gray-50"
              }`}
            >
              <BookOpen className="h-4 w-4" />
              ဝိဇ္ဇာ (Arts)
            </button>
          </div>

          {/* Score inputs grid */}
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

          {/* Total score card */}
          <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-5">
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className="text-sm text-gray-500">စုစုပေါင်း ရမှတ်</p>
                <div className="flex items-end gap-2 mt-1">
                  <span className="text-5xl font-black text-primary leading-none">{total}</span>
                  <span className="text-gray-400 text-lg mb-1">/ {maxPossible}</span>
                </div>
              </div>
              <div className="h-16 w-16 rounded-full border-4 border-primary/20 flex items-center justify-center bg-primary/5">
                <span className="text-lg font-bold text-primary">{totalPct}%</span>
              </div>
            </div>
            {/* overall bar */}
            <div className="h-3 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primary to-emerald-400 transition-all duration-500"
                style={{ width: `${totalPct}%` }}
              />
            </div>
            <div className="flex justify-between text-[11px] text-gray-400 mt-1.5">
              <span>0</span>
              <span>
                {total < 350 ? "🔴 ဝင်ခွင့်ရမှတ် မရောက်သေး" :
                 total < 400 ? "🟡 ကောင်းသည်" :
                 total < 450 ? "🟢 ကောင်းမွန်သည်" : "🏆 အထူးကောင်းမွန်သည်"}
              </span>
              <span>{maxPossible}</span>
            </div>
          </div>

          {/* CTA button */}
          <button
            onClick={handleCheck}
            disabled={total === 0 || calculateMutation.isPending}
            className="w-full py-4 rounded-2xl bg-primary text-white font-bold text-base shadow-md hover:bg-primary/90 active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {calculateMutation.isPending ? (
              <>
                <div className="h-5 w-5 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                စစ်ဆေးနေသည်...
              </>
            ) : (
              <>
                <GraduationCap className="h-5 w-5" />
                တက္ကသိုလ် ဝင်ခွင့် စစ်ဆေးရန်
              </>
            )}
          </button>

          {/* Loading skeletons */}
          {calculateMutation.isPending && (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-white rounded-2xl border border-gray-100 p-5 animate-pulse">
                  <div className="h-5 bg-gray-100 rounded w-1/2 mb-2" />
                  <div className="h-3 bg-gray-100 rounded w-1/3 mb-4" />
                  <div className="h-2 bg-gray-100 rounded w-full" />
                </div>
              ))}
            </div>
          )}

          {/* Results */}
          {results && !calculateMutation.isPending && (
            <div className="space-y-6">
              {/* summary chips */}
              <div className="flex items-center justify-between">
                <h2 className="font-bold text-gray-900 text-lg">ရလဒ်များ</h2>
                <div className="flex gap-2">
                  <span className="text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-3 py-1 rounded-full">
                    ✓ {eligible.length} ကျောင်း ဝင်နိုင်
                  </span>
                  <span className="text-xs font-semibold bg-gray-100 text-gray-500 px-3 py-1 rounded-full">
                    ✗ {notEligible.length} ကျောင်း
                  </span>
                </div>
              </div>

              {eligible.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                    <h3 className="font-semibold text-emerald-700 text-sm">ဝင်ခွင့်ရနိုင်သော တက္ကသိုလ်များ</h3>
                  </div>
                  {eligible.map((match: any, idx: number) => (
                    <ResultCard key={idx} match={match} userTotal={total} />
                  ))}
                </div>
              )}

              {notEligible.length > 0 && (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <XCircle className="h-4 w-4 text-gray-400" />
                    <h3 className="font-semibold text-gray-500 text-sm">မဝင်နိုင်သေးသော တက္ကသိုလ်များ</h3>
                  </div>
                  {notEligible.slice(0, 6).map((match: any, idx: number) => (
                    <ResultCard key={idx} match={match} userTotal={total} />
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Empty state */}
          {hasSearched && results?.length === 0 && !calculateMutation.isPending && (
            <div className="text-center py-12 bg-white rounded-2xl border border-gray-100">
              <GraduationCap className="h-12 w-12 text-gray-200 mx-auto mb-3" />
              <p className="text-gray-500 font-medium">ကိုက်ညီသော တက္ကသိုလ် မတွေ့ပါ</p>
              <p className="text-gray-400 text-sm mt-1">ရမှတ်စစ်ကြည့်ပြီး ပြန်ကြိုးစားပါ</p>
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
