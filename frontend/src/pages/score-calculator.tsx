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

/* ============================================================================
 * SUBJECT DEFINITIONS
 * ========================================================================== */

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
    label: "ပထဝီဝင်",
    labelEn: "Geography",
    color: "bg-cyan-500",
    accent: "#06b6d4",
  },

  /**
   * ဝိဇ္ဇာတွဲအတွက်
   */
  myanmarElective: {
    id: "myanmar_elective",
    label: "စိတ်ကြိုက်မြန်မာ",
    labelEn: "Elective Myanmar",
    color: "bg-emerald-600",
    accent: "#059669",
  },

  /**
   * ဝိဇ္ဇာတွဲအတွက်
   */
  socialScience: {
    id: "social_science",
    label: "လူမှုရေးသိပ္ပံ",
    labelEn: "Social Science",
    color: "bg-sky-500",
    accent: "#0ea5e9",
  },
} as const;

type SubjectDef = (typeof BASE_SUBJECT)[keyof typeof BASE_SUBJECT];

/* ============================================================================
 * SCIENCE SUBJECTS
 * ========================================================================== */

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

/* ============================================================================
 * ARTS SUBJECTS
 *
 * ဝိဇ္ဇာတွဲရိုးရိုး
 * မြန်မာ + အင်္ဂလိပ် + သင်္ချာ + ပထဝီ + သမိုင်း + ဘောဂ
 * ========================================================================== */

const ARTS_REGULAR_SUBJECTS: SubjectDef[] = [
  BASE_SUBJECT.myanmar,
  BASE_SUBJECT.english,
  BASE_SUBJECT.mathematics,
  BASE_SUBJECT.geography,
  BASE_SUBJECT.history,
  BASE_SUBJECT.economics,
];

/* ============================================================================
 * ARTS SPECIAL SUBJECTS
 *
 * ဝိဇ္ဇာတွဲ
 * မြန်မာ + အင်္ဂလိပ် + သင်္ချာ + စိတ်ကြိုက်မြန်မာ + ဘောဂ + လူမှုရေးသိပ္ပံ
 * ========================================================================== */

const ARTS_SPECIAL_SUBJECTS: SubjectDef[] = [
  BASE_SUBJECT.myanmar,
  BASE_SUBJECT.english,
  BASE_SUBJECT.mathematics,
  BASE_SUBJECT.myanmarElective,
  BASE_SUBJECT.economics,
  BASE_SUBJECT.socialScience,
];

/* ============================================================================
 * TYPES
 * ========================================================================== */

type Stream = "science" | "arts";

type ScienceSixth = "biology" | "economics";

type ArtsSixth = "regular" | "special";

type InputMode = "subjects" | "slider";

type Scores = Record<string, string>;

/* ============================================================================
 * SCORE INPUT
 * ========================================================================== */

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
    <div
      className={`flex flex-col gap-2.5 rounded-2xl border p-4 shadow-sm transition-colors ${
        isFailed
          ? "border-red-300 bg-red-50/50 shadow-red-100 dark:bg-red-950/20"
          : "border-border bg-card"
      }`}
    >
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-bold leading-tight text-card-foreground">
            {subject.label}
          </p>

          <p className="mt-0.5 text-[11px] text-muted-foreground">
            {subject.labelEn}
          </p>
        </div>

        <div className="flex flex-col items-end">
          <input
            type="number"
            min={0}
            max={100}
            value={value}
            onChange={(e) => {
              const v = e.target.value;

              if (v === "" || (Number(v) >= 0 && Number(v) <= 100)) {
                onChange(v);
              }
            }}
            placeholder="—"
            className={`h-11 w-14 rounded-xl border-2 text-center text-xl font-black transition-colors focus:outline-none ${
              isFailed
                ? "border-red-300 bg-red-50 text-red-700 focus:border-red-500 dark:bg-red-950/30"
                : "border-input bg-muted/40 text-foreground focus:border-primary"
            }`}
          />

          {isFailed && (
            <p className="mt-1 text-[10px] font-bold text-red-500">ကျရှုံး</p>
          )}
        </div>
      </div>

      <div className="h-1.5 overflow-hidden rounded-full bg-muted">
        <div
          className={`h-full rounded-full transition-all duration-300 ${
            isFailed ? "bg-red-400" : subject.color
          }`}
          style={{
            width: `${pct}%`,
          }}
        />
      </div>
    </div>
  );
}

/* ============================================================================
 * TOTAL SCORE SLIDER
 * ========================================================================== */

const SLIDER_MIN = 240;
const SLIDER_MAX = 600;

function TotalScoreSlider({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const fillPct = Math.round(
    ((value - SLIDER_MIN) / (SLIDER_MAX - SLIDER_MIN)) * 100,
  );

  const scorePct = Math.round((value / 600) * 100);

  const PRIMARY = "hsl(161, 80%, 25%)";

  const label =
    value < 240
      ? {
          text: "ဝင်ခွင့်ရမှတ် မရောက်သေး",
          color: "text-red-500",
        }
      : value < 380
        ? {
            text: "ကျောင်းအချို့ ဝင်ခွင့်ရနိုင်",
            color: "text-orange-500",
          }
        : value < 430
          ? {
              text: "ကောင်းမွန်သည်",
              color: "text-yellow-600",
            }
          : value < 470
            ? {
                text: "အလွန်ကောင်းသည်",
                color: "text-emerald-600",
              }
            : {
                text: "🏆 ဆေးကျောင်း ဝင်ခွင့်ရနိုင်",
                color: "text-emerald-700 font-bold",
              };

  return (
    <div className="space-y-5 rounded-2xl border border-border bg-card p-5 shadow-sm sm:p-6">
      <div className="flex items-end justify-between">
        <div>
          <p className="text-sm text-muted-foreground">
            စုစုပေါင်း ရမှတ် ရွေးချယ်ရန်
          </p>

          <div className="mt-1 flex items-end gap-1.5">
            <span className="text-6xl font-black leading-none tabular-nums text-primary">
              {value}
            </span>

            <span className="mb-1.5 text-xl text-muted-foreground">/ 600</span>
          </div>
        </div>

        <div className="text-right">
          <div className="ml-auto flex h-16 w-16 items-center justify-center rounded-full border-4 border-primary/20 bg-primary/5">
            <span className="text-base font-bold text-primary">
              {scorePct}%
            </span>
          </div>
        </div>
      </div>

      <div className="relative pt-1">
        <input
          type="range"
          min={SLIDER_MIN}
          max={SLIDER_MAX}
          step={5}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className="h-3 w-full cursor-pointer appearance-none rounded-full"
          style={{
            background: `linear-gradient(
              to right,
              ${PRIMARY} 0%,
              ${PRIMARY} ${fillPct}%,
              #e5e7eb ${fillPct}%,
              #e5e7eb 100%
            )`,
          }}
        />

        <style>{`
          input[type=range]::-webkit-slider-thumb {
            -webkit-appearance: none;
            width: 24px;
            height: 24px;
            border-radius: 50%;
            background: hsl(161, 80%, 25%);
            border: 3px solid white;
            box-shadow: 0 2px 6px rgba(0,0,0,0.25);
            cursor: pointer;
          }

          input[type=range]::-moz-range-thumb {
            width: 24px;
            height: 24px;
            border-radius: 50%;
            background: hsl(161, 80%, 25%);
            border: 3px solid white;
            box-shadow: 0 2px 6px rgba(0,0,0,0.25);
            cursor: pointer;
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

      <p className={`text-center text-sm font-medium ${label.color}`}>
        {label.text}
      </p>
    </div>
  );
}

/* ============================================================================
 * UNIVERSITY TYPE LABELS
 * ========================================================================== */

const TYPE_LABELS: Record<string, string> = {
  medical: "ဆေးပညာ",
  technical: "နည်းပညာ",
  government: "ဝိဇ္ဇာ/သိပ္ပံ",
  education: "ပညာရေး",
};

/* ============================================================================
 * ARTS / SCIENCE UNIVERSITY FILTER
 *
 * IMPORTANT:
 * Backend က university တစ်ခုချင်းစီမှာ
 * type / name / nameEn ရှိတယ်လို့ယူဆပြီး filter လုပ်ထားပါတယ်။
 * ========================================================================== */

function getUniversitySearchText(uni: any): string {
  return [uni?.name, uni?.nameEn, uni?.type, uni?.abbreviation]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

/**
 * Arts students မတက်နိုင်တဲ့ university categories
 */
function isTechnologyUniversity(uni: any): boolean {
  const text = getUniversitySearchText(uni);

  const blockedKeywords = [
    "နည်းပညာတက္ကသိုလ်",
    "နည်းပညာ",
    "technology university",
    "technological university",

    "ကွန်ပျူတာတက္ကသိုလ်",
    "computer university",

    "polytechnic",
    "polytechnic university",

    "အစိုးရနည်းပညာကောလိပ်",
    "government technical college",

    "technical university",

    "လေကြောင်းနှင့်အာကာသ",
    "aerospace",

    "သတင်းအချက်အလက်နည်းပညာ",
    "information technology",
  ];

  return blockedKeywords.some((keyword) =>
    text.includes(keyword.toLowerCase()),
  );
}

function isMedicalUniversity(uni: any): boolean {
  const text = getUniversitySearchText(uni);

  const medicalKeywords = [
    "ဆေးတက္ကသိုလ်",
    "ဆေးဘက်",
    "ဆေးဝါး",
    "သွားဘက်",
    "သူနာပြု",
    "ကျန်းမာရေး",
    "တိုင်းရင်းဆေး",

    "medical university",
    "medicine",
    "dental",
    "pharmacy",
    "nursing",
    "health",
  ];

  return (
    uni?.type === "medical" ||
    medicalKeywords.some((keyword) => text.includes(keyword.toLowerCase()))
  );
}

/**
 * Stream အလိုက် university eligibility
 */
function isAllowedForStream(
  uni: any,
  stream: Stream,
  scienceSixth: ScienceSixth,
): boolean {
  /**
   * Science Economics
   *
   * Medical မရ
   */
  if (stream === "science" && scienceSixth === "economics") {
    return !isMedicalUniversity(uni);
  }

  /**
   * Arts
   *
   * Technology / Computer / Polytechnic /
   * Technical / Medical မရ
   */
  if (stream === "arts") {
    if (isTechnologyUniversity(uni)) {
      return false;
    }

    if (isMedicalUniversity(uni)) {
      return false;
    }

    return true;
  }

  /**
   * Science Biology
   */
  return true;
}

/* ============================================================================
 * RESULT CARD
 * ========================================================================== */

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
  const required = uni?.minScore ?? 0;

  const pct = Math.min(
    100,
    Math.round((userTotal / Math.max(required, 1)) * 100),
  );

  return (
    <div className="overflow-hidden rounded-2xl border border-primary/30 bg-card shadow-sm transition-all hover:shadow-md">
      <div className="h-1 w-full bg-gradient-to-r from-primary to-emerald-400" />

      <div className="p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="text-base font-bold leading-tight text-card-foreground">
                {uni?.name}
              </h3>

              {uni?.abbreviation && (
                <span className="shrink-0 rounded-full bg-primary/10 px-2 py-0.5 text-xs font-semibold text-primary">
                  {uni.abbreviation}
                </span>
              )}
            </div>

            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {uni?.nameEn}
            </p>

            <div className="mt-2 flex flex-wrap items-center gap-2">
              {uni?.state && (
                <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                  📍 {uni.state}
                </span>
              )}

              {uni?.type && (
                <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                  {TYPE_LABELS[uni.type] ?? uni.type}
                </span>
              )}

              <span className="rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
                🎓 ၂၀၂၆ ခုနှစ်
              </span>
            </div>

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
                  style={{
                    width: `${pct}%`,
                  }}
                />
              </div>

              {recommendationReasons && recommendationReasons.length > 0 && (
                <div className="mt-3 rounded-xl border border-primary/15 bg-primary/5 p-3">
                  <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-primary">
                    <span>
                      {recommendationTier === "strong"
                        ? "အထူးသင့်တော်"
                        : recommendationTier === "near"
                          ? "နီးစပ်သော ရွေးချယ်မှု"
                          : "ကိုက်ညီမှု ရှင်းလင်းချက်"}
                    </span>

                    {typeof matchScore === "number" && (
                      <span className="rounded-full bg-primary/10 px-2 py-0.5">
                        {matchScore}%
                      </span>
                    )}

                    {majorMatch && (
                      <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-emerald-700 dark:text-emerald-300">
                        ဘာသာရပ်ကိုက်ညီ
                      </span>
                    )}
                  </div>

                  <ul className="mt-1.5 space-y-1 text-[11px] text-muted-foreground">
                    {recommendationReasons.slice(0, 3).map((reason) => (
                      <li key={reason}>• {reason}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          <div className="flex shrink-0 flex-col items-end gap-2">
            {eligible && (
              <div className="flex items-center gap-1.5 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-600">
                <CheckCircle2 className="h-3.5 w-3.5" />
                ဝင်ခွင့်ရ
              </div>
            )}

            <Link href={`/universities/${uni?.id}`}>
              <span
                className={`flex cursor-pointer items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium transition-colors ${
                  eligible
                    ? "bg-primary/10 text-primary hover:bg-primary/20"
                    : "bg-gray-100 text-gray-500 hover:bg-gray-200"
                }`}
              >
                အသေးစိတ်
                <ChevronRight className="h-3 w-3" />
              </span>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ============================================================================
 * MAIN PAGE
 * ========================================================================== */

export default function ScoreCalculator() {
  const {
    inputMode,
    setInputMode,

    stream,
    setStream,

    scienceSixth,
    setScienceSixth,

    artsSixth,
    setArtsSixth,

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

  const { data: majorListResponse, isLoading: isMajorsLoading } =
    useListMajors();

  const { data: allUnisResponse } = useListUniversities({
    compact: true,
    limit: 1000,
  });

  /* ------------------------------------------------------------------------
   * Save API results to Zustand
   * ---------------------------------------------------------------------- */

  useEffect(() => {
    if (calculateMutation.data) {
      setResults(calculateMutation.data as any[]);
    }
  }, [calculateMutation.data, setResults]);

  /* ------------------------------------------------------------------------
   * Universities
   * ---------------------------------------------------------------------- */

  const allUniversities: any[] = (allUnisResponse as any)?.universities ?? [];

  /* ------------------------------------------------------------------------
   * Majors
   * ---------------------------------------------------------------------- */

  const majorOptions: any[] = ((majorListResponse as any[]) ?? []).slice(0, 24);

  /* ==========================================================================
   * SUBJECTS
   * ======================================================================== */

  const subjects = useMemo(() => {
    /**
     * SCIENCE
     */
    if (stream === "science") {
      return [...SCIENCE_BASE_SUBJECTS, SCIENCE_SIXTH_SUBJECTS[scienceSixth]];
    }

    /**
     * ARTS - ဝိဇ္ဇာတွဲရိုးရိုး
     */
    if (artsSixth === "regular") {
      return ARTS_REGULAR_SUBJECTS;
    }

    /**
     * ARTS - ဝိဇ္ဇာတွဲ
     */
    return ARTS_SPECIAL_SUBJECTS;
  }, [stream, scienceSixth, artsSixth]);

  /* ==========================================================================
   * TOTAL SCORE
   * ======================================================================== */

  const subjectTotal = useMemo(() => {
    return subjects.reduce(
      (sum, subject) => sum + (Number(scores[subject.id]) || 0),
      0,
    );
  }, [scores, subjects]);

  /* ==========================================================================
   * FAILED EXAM
   * ======================================================================== */

  const isFailedExam = useMemo(() => {
    return subjects.some((subject) => {
      const val = scores[subject.id];

      return val !== "" && val !== undefined && Number(val) < 40;
    });
  }, [scores, subjects]);

  const maxPossible = subjects.length * 100;

  const subjectPct =
    maxPossible > 0 ? Math.round((subjectTotal / maxPossible) * 100) : 0;

  /* ==========================================================================
   * STREAM CHANGE
   * ======================================================================== */

  const handleStreamChange = (newStream: Stream) => {
    setStream(newStream);

    /**
     * Reset subjects
     */
    setScores({});

    /**
     * Reset subgroup
     */
    setScienceSixth("biology");

    setArtsSixth("regular");

    /**
     * Reset search
     */
    setHasSearched(false);

    calculateMutation.reset();
  };

  /* ==========================================================================
   * SCIENCE SIXTH SUBJECT CHANGE
   * ======================================================================== */

  const handleScienceSixthChange = (sixth: ScienceSixth) => {
    setScienceSixth(sixth);

    const next = {
      ...scores,
    };

    /**
     * Biology / Economics
     * တစ်ခုတည်းထားရန်
     */
    const other = sixth === "biology" ? "economics" : "biology";

    delete next[other];

    setScores(next);

    setHasSearched(false);

    calculateMutation.reset();
  };

  /* ==========================================================================
   * ARTS GROUP CHANGE
   * ======================================================================== */

  const handleArtsSixthChange = (group: ArtsSixth) => {
    setArtsSixth(group);

    /**
     * Arts subgroup ပြောင်းတဲ့အခါ
     * score အဟောင်းတွေကို reset
     */
    setScores({});

    setHasSearched(false);

    calculateMutation.reset();
  };

  /* ==========================================================================
   * MAJOR SELECT
   * ======================================================================== */

  const togglePreferredMajor = (majorId: number) => {
    if (!preferredMajorIds.includes(majorId) && preferredMajorIds.length >= 3) {
      return;
    }

    const next = preferredMajorIds.includes(majorId)
      ? preferredMajorIds.filter((id) => id !== majorId)
      : [...preferredMajorIds, majorId];

    setPreferredMajorIds(next);

    setHasSearched(false);

    calculateMutation.reset();
  };

  /* ==========================================================================
   * SUBJECT SEARCH
   * ======================================================================== */

  const handleSubjectSearch = () => {
    setHasSearched(true);

    const subjectData: Record<string, number> = {};

    subjects.forEach((subject) => {
      subjectData[subject.id] = Number(scores[subject.id]) || 0;
    });

    calculateMutation.mutate({
      data: {
        totalScore: subjectTotal,

        subjects: subjectData as any,

        preferredMajorIds:
          preferredMajorIds.length > 0 ? preferredMajorIds : undefined,
      },
    });
  };

  /* ==========================================================================
   * SLIDER RESULTS
   * ======================================================================== */

  const sliderResults = useMemo(() => {
    if (inputMode !== "slider" || allUniversities.length === 0) {
      return [];
    }

    const selected = preferredMajorIds.length > 0 ? preferredMajorIds : [];

    /**
     * First filter by score
     */
    const eligible = allUniversities.filter(
      (u) => u?.minScore != null && u.minScore <= sliderTotal,
    );

    /**
     * Then stream filter
     */
    const streamAllowed = eligible.filter((u) =>
      isAllowedForStream(u, stream, scienceSixth),
    );

    const built = streamAllowed.map((u: any) => {
      const majors: any[] = (u?.majors ?? []).map((m: any) =>
        typeof m === "number" ? { id: m } : m,
      );

      const matched = majors.filter((m: any) => selected.includes(m?.id));

      const majorMatch = matched.length > 0;

      const gap = sliderTotal - (u?.minScore ?? 0);

      let matchScore = Math.max(0, 100 - Math.abs(gap) * 0.5);

      if (majorMatch) {
        matchScore += 15;
      }

      const reasons: string[] = [
        "သင့်ရမှတ်ဖြင့် ဝင်ခွင့်အနိမ့်ဆုံးရမှတ်ကို ဖြည့်မီသည်",
      ];

      if (majorMatch) {
        const majorNames = matched
          .map((m: any) => m?.nameEn || m?.name)
          .filter(Boolean)
          .slice(0, 2)
          .join(", ");

        reasons.push(`သင်ရွေးထားသော ဘာသာရပ်နှင့် ကိုက်ညီသည်: ${majorNames}`);
      }

      if (gap <= 30) {
        reasons.push(
          "သင့်ရမှတ်နှင့် ဝင်ခွင့်ဖြတ်မှတ် နီးစပ်သော ရွေးချယ်မှုဖြစ်သည်",
        );
      }

      const tier = majorMatch ? "strong" : "eligible";

      return {
        uni: {
          ...u,
          majors,
        },

        eligible: true,

        matchScore: Math.min(100, Math.round(matchScore)),

        majorMatch,

        recommendationTier: tier,

        recommendationReasons: reasons,
      };
    });

    /**
     * Preferred major ရွေးထားရင်
     * အဲဒီ major ရှိတဲ့ university ပဲပြ
     */
    return built
      .filter((r) => (selected.length > 0 ? r.majorMatch : true))
      .sort((a, b) => {
        if (a.majorMatch !== b.majorMatch) {
          return a.majorMatch ? -1 : 1;
        }

        return b.matchScore - a.matchScore;
      });
  }, [
    sliderTotal,
    allUniversities,
    inputMode,
    preferredMajorIds,
    stream,
    scienceSixth,
  ]);

  /* ==========================================================================
   * SUBJECT RESULTS
   * ======================================================================== */

  const subjectResults = (calculateMutation.data as any[]) || results;

  /**
   * Filter result according to stream
   */
  const filteredSubjectResults = useMemo(() => {
    const list = (subjectResults as any[]) ?? [];

    return list.filter((r: any) => {
      const university = r?.university;

      if (!university) {
        return true;
      }

      return isAllowedForStream(university, stream, scienceSixth);
    });
  }, [subjectResults, stream, scienceSixth]);

  const subjectEligible =
    filteredSubjectResults.filter((r: any) => r?.eligible) ?? [];

  const sliderEligibleCount = sliderResults.filter((r) => r?.eligible).length;

  /* ==========================================================================
   * RENDER
   * ======================================================================== */

  return (
    <Layout>
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-4xl space-y-5 px-4 py-6 sm:py-8">
          {/* ================================================================
              HEADER
          ================================================================= */}

          <div className="space-y-1 text-center">
            <h1 className="text-2xl font-bold text-foreground sm:text-3xl">
              ဝင်ခွင့်ရမှတ် စစ်ဆေးရန်
            </h1>

            <p className="text-sm text-muted-foreground">
              G-12 ရမှတ်ထည့်ပြီး တက္ကသိုလ်ဝင်ခွင့် စစ်ဆေးပါ
            </p>
          </div>

          {/* ================================================================
              INPUT MODE
          ================================================================= */}

          <div className="flex gap-2 rounded-2xl border border-border bg-card p-2 shadow-sm">
            <button
              onClick={() => {
                setInputMode("subjects");

                setHasSearched(false);

                calculateMutation.reset();
              }}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
                inputMode === "subjects"
                  ? "bg-primary text-white shadow-sm"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <PenLine className="h-4 w-4" />
              ဘာသာရပ်တိုင်း ထည့်မည်
            </button>

            <button
              onClick={() => setInputMode("slider")}
              className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition-all ${
                inputMode === "slider"
                  ? "bg-primary text-white shadow-sm"
                  : "text-muted-foreground hover:bg-muted"
              }`}
            >
              <SlidersHorizontal className="h-4 w-4" />
              စုစုပေါင်းဖြင့် ရှာမည်
            </button>
          </div>

          {/* ================================================================
              PREFERRED MAJORS
          ================================================================= */}

          <section className="space-y-3 rounded-2xl border border-border bg-card p-4 shadow-sm sm:p-5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <h2 className="text-sm font-bold text-card-foreground">
                  စိတ်ဝင်စားသော ဘာသာရပ်များ
                </h2>

                <p className="mt-1 text-xs text-muted-foreground">
                  အများဆုံး ၃ ခုရွေးပါ။ ရွေးချယ်မှုများကို ရလဒ်အစီအစဉ်တွင်
                  ထည့်သွင်းစဉ်းစားမည်။
                </p>
              </div>

              <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary">
                {preferredMajorIds.length}/3
              </span>
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
                      className={`touch-target rounded-xl border px-3 py-2 text-left text-xs transition-colors ${
                        selected
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border bg-background text-muted-foreground hover:bg-muted"
                      } ${disabled ? "cursor-not-allowed opacity-50" : ""}`}
                    >
                      <span className="block font-semibold">{major.name}</span>

                      <span className="mt-0.5 block truncate text-[10px] opacity-80">
                        {major.nameEn}
                      </span>
                    </button>
                  );
                })}
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                ဘာသာရပ်စာရင်း မရရှိသေးပါ။ ရမှတ်အပေါ်မူတည်၍ ရှာဖွေနိုင်ပါသည်။
              </p>
            )}
          </section>

          {/* ================================================================
              SUBJECT MODE
          ================================================================= */}

          {inputMode === "subjects" && (
            <>
              {/* ============================================================
                  STREAM SELECTOR
              ============================================================= */}

              <div className="flex gap-2 rounded-2xl border border-border bg-card p-2 shadow-sm">
                {/* SCIENCE */}

                <button
                  onClick={() => handleStreamChange("science")}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
                    stream === "science"
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <FlaskConical className="h-4 w-4" />
                  သိပ္ပံ (Science)
                </button>

                {/* ARTS */}

                <button
                  onClick={() => handleStreamChange("arts")}
                  className={`flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
                    stream === "arts"
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-muted"
                  }`}
                >
                  <BookOpen className="h-4 w-4" />
                  ဝိဇ္ဇာ (Arts)
                </button>
              </div>

              {/* ============================================================
                  SCIENCE SUBGROUP
              ============================================================= */}

              {stream === "science" && (
                <div className="space-y-2">
                  <div className="flex gap-2 rounded-2xl border border-border bg-card p-2 shadow-sm">
                    {/* BIOLOGY */}

                    <button
                      onClick={() => handleScienceSixthChange("biology")}
                      className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
                        scienceSixth === "biology"
                          ? "border border-teal-200 bg-teal-50 text-teal-700"
                          : "text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      ဇီဝဗေဒ (Biology)
                    </button>

                    {/* ECONOMICS */}

                    <button
                      onClick={() => handleScienceSixthChange("economics")}
                      className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
                        scienceSixth === "economics"
                          ? "border border-rose-200 bg-rose-50 text-rose-700"
                          : "text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      ဘောဂ (Economics)
                    </button>
                  </div>

                  {scienceSixth === "economics" && (
                    <p className="px-1 text-[12px] text-muted-foreground">
                      မှတ်ချက်: ဘောဂ ရွေးထားပါက <b>ဆေးတက္ကသိုလ်</b> နှင့်
                      ဆေးဘက်ဆိုင်ရာ တက္ကသိုလ်များကို ရလဒ်တွင် မပြပါ။
                    </p>
                  )}
                </div>
              )}

              {/* ============================================================
                  ARTS SUBGROUP
              ============================================================= */}

              {stream === "arts" && (
                <div className="space-y-2">
                  <div className="flex gap-2 rounded-2xl border border-border bg-card p-2 shadow-sm">
                    {/* ARTS REGULAR */}

                    <button
                      onClick={() => handleArtsSixthChange("regular")}
                      className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
                        artsSixth === "regular"
                          ? "border border-amber-200 bg-amber-50 text-amber-700"
                          : "text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      ဝိဇ္ဇာတွဲရိုးရိုး
                    </button>

                    {/* ARTS SPECIAL */}

                    <button
                      onClick={() => handleArtsSixthChange("special")}
                      className={`flex-1 rounded-xl px-4 py-2.5 text-sm font-semibold transition-all ${
                        artsSixth === "special"
                          ? "border border-sky-200 bg-sky-50 text-sky-700"
                          : "text-muted-foreground hover:bg-muted"
                      }`}
                    >
                      ဝိဇ္ဇာတွဲ
                    </button>
                  </div>

                  {artsSixth === "regular" ? (
                    <p className="px-1 text-[12px] text-muted-foreground">
                      ဝိဇ္ဇာတွဲရိုးရိုး — မြန်မာ၊ အင်္ဂလိပ်၊ သင်္ချာ၊ ပထဝီဝင်၊
                      သမိုင်း၊ ဘောဂဗေဒ
                    </p>
                  ) : (
                    <p className="px-1 text-[12px] text-muted-foreground">
                      ဝိဇ္ဇာတွဲ — မြန်မာ၊ အင်္ဂလိပ်၊ သင်္ချာ၊ စိတ်ကြိုက်မြန်မာ၊
                      ဘောဂဗေဒ၊ လူမှုရေးသိပ္ပံ
                    </p>
                  )}

                  <p className="px-1 text-[12px] text-orange-600">
                    မှတ်ချက်: ဝိဇ္ဇာတွဲများအတွက် ဆေးတက္ကသိုလ်၊ နည်းပညာတက္ကသိုလ်၊
                    ကွန်ပျူတာတက္ကသိုလ် များကို ဝင်ခွင့်ရလဒ်တွင် မပြပါ။
                  </p>
                </div>
              )}

              {/* ============================================================
                  SUBJECT INPUTS
              ============================================================= */}

              <div className="grid grid-cols-1 gap-3 min-[420px]:grid-cols-2 sm:grid-cols-3">
                {subjects.map((subject) => (
                  <ScoreInput
                    key={`${stream}-${artsSixth}-${scienceSixth}-${subject.id}`}
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

              {/* ============================================================
                  TOTAL
              ============================================================= */}

              <div className="space-y-4 rounded-2xl border border-border bg-card p-5 shadow-sm">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-muted-foreground">
                      စုစုပေါင်း ရမှတ်
                    </p>

                    <div className="mt-1 flex items-end gap-1.5">
                      <span className="text-5xl font-black leading-none tabular-nums text-primary">
                        {subjectTotal}
                      </span>

                      <span className="mb-1 text-lg text-muted-foreground">
                        / {maxPossible}
                      </span>
                    </div>
                  </div>

                  <div className="flex h-16 w-16 items-center justify-center rounded-full border-4 border-primary/20 bg-primary/5">
                    <span className="text-base font-bold text-primary">
                      {subjectPct}%
                    </span>
                  </div>
                </div>

                <div className="h-3 overflow-hidden rounded-full bg-muted">
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-primary to-emerald-400 transition-all duration-500"
                    style={{
                      width: `${subjectPct}%`,
                    }}
                  />
                </div>

                <p className="text-center text-sm font-medium text-muted-foreground">
                  {isFailedExam ? (
                    <span className="font-bold text-red-500">
                      ❌ ဘာသာရပ်တစ်ခုခု ၄၀ အောက်ရရှိပါက တက္ကသိုလ်ဝင်ခွင့်
                      မရနိုင်ပါ
                    </span>
                  ) : subjectTotal < 240 ? (
                    "🔴 ဝင်ခွင့်ရမှတ် မရောက်သေး"
                  ) : subjectTotal < 400 ? (
                    "🟡 ကောင်းသည်"
                  ) : subjectTotal < 450 ? (
                    "🟢 ကောင်းမွန်သည်"
                  ) : (
                    "🏆 အထူးကောင်းမွန်သည်"
                  )}
                </p>
              </div>

              {/* ============================================================
                  SEARCH BUTTON
              ============================================================= */}

              <button
                onClick={handleSubjectSearch}
                disabled={
                  subjectTotal === 0 ||
                  isFailedExam ||
                  calculateMutation.isPending
                }
                className="touch-target flex w-full items-center justify-center gap-2 rounded-2xl bg-primary py-4 text-base font-bold text-primary-foreground shadow-md transition-all hover:bg-primary/90 active:scale-[0.98] disabled:opacity-50"
              >
                {calculateMutation.isPending ? (
                  <>
                    <div className="h-5 w-5 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                    စစ်ဆေးနေသည်...
                  </>
                ) : (
                  <>
                    <GraduationCap className="h-5 w-5" />
                    တက္ကသိုလ် ဝင်ခွင့် စစ်ဆေးရန်
                  </>
                )}
              </button>

              {/* ============================================================
                  LOADING
              ============================================================= */}

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

              {/* ============================================================
                  FAILED
              ============================================================= */}

              {isFailedExam ? (
                <div className="mt-4 space-y-3 rounded-2xl border border-red-200 bg-red-50 p-6 text-center dark:bg-red-950/20">
                  <XCircle className="mx-auto h-12 w-12 text-red-500" />

                  <h3 className="text-lg font-bold text-red-700">
                    တက္ကသိုလ်တက်ရောက်ရန် မအောင်မြင်ပါ
                  </h3>

                  <p className="text-sm text-red-600">
                    ဘာသာရပ်တိုင်းတွင် အနည်းဆုံး ရမှတ် (၄၀) ရရှိရန် လိုအပ်ပါသည်။
                  </p>
                </div>
              ) : (
                hasSearched &&
                !calculateMutation.isPending &&
                subjectResults && (
                  <div className="mt-4 space-y-6">
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-bold text-foreground">
                        ရလဒ်များ
                      </h2>

                      <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                        ✓ {subjectEligible.length} ကျောင်း
                      </span>
                    </div>

                    {subjectEligible.length > 0 ? (
                      <div className="space-y-3">
                        <p className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
                          <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                          ဝင်ခွင့်ရနိုင်သော တက္ကသိုလ်များ
                        </p>

                        {subjectEligible.map((m: any, i: number) => (
                          <ResultCard
                            key={m?.university?.id ?? i}
                            uni={m?.university}
                            userTotal={subjectTotal}
                            eligible
                            matchScore={m?.matchScore}
                            majorMatch={m?.majorMatch}
                            recommendationTier={m?.recommendationTier}
                            recommendationReasons={m?.recommendationReasons}
                          />
                        ))}
                      </div>
                    ) : (
                      <div className="rounded-2xl border border-border bg-card p-8 text-center">
                        <GraduationCap className="mx-auto mb-3 h-12 w-12 text-muted-foreground/30" />

                        <p className="font-medium text-muted-foreground">
                          သင့်ရွေးချယ်ထားသော တွဲနှင့် ကိုက်ညီသော
                          ဝင်ခွင့်ရနိုင်သည့် တက္ကသိုလ် မတွေ့ပါ။
                        </p>
                      </div>
                    )}
                  </div>
                )
              )}
            </>
          )}

          {/* ================================================================
              SLIDER MODE
          ================================================================= */}

          {inputMode === "slider" && (
            <>
              <TotalScoreSlider value={sliderTotal} onChange={setSliderTotal} />

              {allUniversities.length > 0 && (
                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-bold text-foreground">
                      ရလဒ်များ
                    </h2>

                    <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                      ✓ {sliderEligibleCount} ကျောင်း
                    </span>
                  </div>

                  {sliderEligibleCount > 0 ? (
                    <div className="space-y-3">
                      <p className="flex items-center gap-2 text-sm font-semibold text-emerald-700">
                        <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                        ဝင်ခွင့်ရနိုင်သော တက္ကသိုလ်များ
                      </p>

                      {sliderResults
                        .filter((r) => r.eligible)
                        .map((r, i) => (
                          <ResultCard
                            key={r?.uni?.id ?? i}
                            uni={r.uni}
                            userTotal={sliderTotal}
                            eligible
                            matchScore={r.matchScore}
                            majorMatch={r.majorMatch}
                            recommendationTier={r.recommendationTier}
                            recommendationReasons={r.recommendationReasons}
                          />
                        ))}
                    </div>
                  ) : (
                    <div className="rounded-2xl border border-gray-100 bg-white py-10 text-center">
                      <GraduationCap className="mx-auto mb-3 h-12 w-12 text-gray-200" />

                      <p className="font-medium text-gray-500">
                        {preferredMajorIds.length > 0
                          ? `ရမှတ် ${sliderTotal} နှင့် ရွေးထားသော ဘာသာရပ်ကို တက်ရောက်နိုင်သော ကျောင်း မတွေ့ပါ`
                          : `ရမှတ် ${sliderTotal} ဖြင့် ဝင်ခွင့်ရနိုင်သော ကျောင်း မတွေ့ပါ`}
                      </p>

                      <p className="mt-1 text-sm text-gray-400">
                        Slider ကို ညာဘက်ဆွဲ၍ ရမှတ်မြှင့်ကြည့်ပါ
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
