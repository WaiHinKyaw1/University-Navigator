import { useEffect, useMemo, useRef, useState } from "react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Link } from "wouter";

// ============================================================
// TYPES
// ============================================================

type Option = {
  id: number;
  category: string;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
  displayOrder: number;
};

type Major = {
  id: number;
  name: string;
  nameEn: string;
  description?: string | null;
};

type University = {
  id: number;
  name: string;
  nameEn: string;
  type: string;
  state: string;
  city: string | null;
  minScore: number;
  description: string | null;
  website: string | null;
  imageUrl: string | null;
  majors: Major[];
};

type Recommendation = {
  university: University;
  score: number;
  reasons: string[];
};

type SavedInterestGuideData = {
  education: string;
  englishLevel: string;
  interests: string[];
  career: string;
  recommendations: Recommendation[];
  submitted: boolean;
};

const INTEREST_GUIDE_STORAGE_KEY = "interest-guide-form";

// ============================================================
// UNIVERSITY CACHE
// ============================================================

let universitiesCache: University[] | null = null;

// ============================================================
// KEYWORD GROUPS
//
// Admin code can be:
// programming
// programmer
// coding
// software
//
// These will automatically match related university majors.
// ============================================================

const KEYWORD_GROUPS: Record<string, string[]> = {
  // ==========================================================
  // PROGRAMMING / COMPUTER
  // ==========================================================

  programming: [
    "programming",
    "programmer",
    "coding",
    "coder",
    "software",
    "software engineering",
    "computer science",
    "computer engineering",
    "information technology",
    "information technology engineering",
    "information systems",
    "computing",
    "computer studies",
    "informatics",
    "web development",
    "web developer",
    "application development",
    "app development",
    "technology",
    "it",
  ],

  programmer: [
    "programmer",
    "programming",
    "coding",
    "coder",
    "software",
    "software engineering",
    "computer science",
    "computer engineering",
    "information technology",
    "information technology engineering",
    "information systems",
    "computing",
    "computer studies",
    "informatics",
    "web development",
    "web developer",
    "application development",
    "app development",
  ],

  coding: [
    "coding",
    "programming",
    "programmer",
    "coder",
    "computer science",
    "software engineering",
    "computer engineering",
    "information technology",
    "information systems",
    "computing",
    "informatics",
  ],

  software: [
    "software",
    "software engineering",
    "computer science",
    "programming",
    "programmer",
    "information technology",
    "information systems",
    "computing",
  ],

  "computer science": [
    "computer science",
    "computing",
    "computer studies",
    "software engineering",
    "computer engineering",
    "programming",
    "programmer",
    "coding",
    "information technology",
    "information systems",
    "informatics",
  ],

  "computer engineering": [
    "computer engineering",
    "computer science",
    "software engineering",
    "programming",
    "coding",
    "information technology",
    "information systems",
    "computing",
  ],

  "information technology": [
    "information technology",
    "information technology engineering",
    "computer science",
    "computer engineering",
    "software engineering",
    "information systems",
    "computing",
    "informatics",
    "programming",
    "coding",
  ],

  "information systems": [
    "information systems",
    "information technology",
    "computer science",
    "computing",
    "software engineering",
    "programming",
    "database",
    "systems",
  ],

  // ==========================================================
  // LAW
  // ==========================================================

  law: [
    "law",
    "legal studies",
    "legal",
    "lawyer",
    "attorney",
    "jurisprudence",
    "business law",
    "international law",
  ],

  lawyer: [
    "law",
    "legal studies",
    "legal",
    "lawyer",
    "attorney",
    "jurisprudence",
  ],

  legal: [
    "law",
    "legal studies",
    "legal",
    "lawyer",
    "attorney",
    "jurisprudence",
  ],

  // ==========================================================
  // BUSINESS
  // ==========================================================

  business: [
    "business",
    "business administration",
    "business management",
    "management",
    "commerce",
    "marketing",
    "finance",
    "accounting",
    "economics",
    "entrepreneurship",
  ],

  marketing: [
    "marketing",
    "business",
    "business administration",
    "management",
    "commerce",
    "advertising",
    "digital marketing",
  ],

  finance: [
    "finance",
    "financial",
    "accounting",
    "business",
    "economics",
    "banking",
    "commerce",
  ],

  accounting: ["accounting", "finance", "business", "commerce", "economics"],

  // ==========================================================
  // ENGINEERING
  // ==========================================================

  engineering: ["engineering", "engineer", "technology", "technical"],

  mechanical: ["mechanical engineering", "mechanical", "engineering"],

  civil: ["civil engineering", "civil", "construction", "engineering"],

  electrical: [
    "electrical engineering",
    "electrical",
    "electronics",
    "engineering",
  ],

  electronics: [
    "electronics",
    "electrical engineering",
    "electronic engineering",
    "engineering",
  ],

  // ==========================================================
  // ART / DESIGN
  // ==========================================================

  painting: [
    "painting",
    "fine art",
    "fine arts",
    "visual art",
    "visual arts",
    "art",
    "arts",
  ],

  drawing: [
    "drawing",
    "fine art",
    "fine arts",
    "visual art",
    "visual arts",
    "art",
    "design",
  ],

  art: [
    "art",
    "arts",
    "fine art",
    "fine arts",
    "visual art",
    "visual arts",
    "design",
  ],

  design: [
    "design",
    "graphic design",
    "visual design",
    "art",
    "fine arts",
    "architecture",
  ],

  // ==========================================================
  // MEDIA
  // ==========================================================

  photography: [
    "photography",
    "photographic",
    "visual media",
    "media",
    "film",
    "digital media",
  ],

  music: ["music", "musical", "music education", "performing arts", "arts"],

  // ==========================================================
  // SCIENCE
  // ==========================================================

  science: ["science", "scientific", "natural science", "applied science"],

  mathematics: [
    "mathematics",
    "math",
    "mathematical",
    "statistics",
    "applied mathematics",
    "data science",
  ],

  math: ["mathematics", "math", "mathematical", "statistics", "data science"],

  physics: ["physics", "physical science", "engineering", "applied physics"],

  chemistry: ["chemistry", "chemical", "chemical engineering", "science"],

  biology: ["biology", "biological", "life science", "biotechnology"],

  // ==========================================================
  // MEDICAL
  // ==========================================================

  medicine: ["medicine", "medical", "doctor", "health science", "healthcare"],

  nursing: ["nursing", "nurse", "health science", "healthcare", "medical"],

  pharmacy: [
    "pharmacy",
    "pharmaceutical",
    "pharmacology",
    "medical",
    "health science",
  ],

  // ==========================================================
  // EDUCATION
  // ==========================================================

  teaching: ["education", "teaching", "teacher", "pedagogy", "educational"],

  teacher: ["education", "teaching", "teacher", "pedagogy", "educational"],

  // ==========================================================
  // LANGUAGE
  // ==========================================================

  english: [
    "english",
    "english studies",
    "english language",
    "english literature",
    "linguistics",
    "language",
  ],

  language: [
    "language",
    "linguistics",
    "english",
    "foreign language",
    "languages",
  ],

  // ==========================================================
  // ARCHITECTURE
  // ==========================================================

  architecture: [
    "architecture",
    "architectural",
    "architect",
    "building design",
    "design",
  ],

  // ==========================================================
  // AGRICULTURE
  // ==========================================================

  agriculture: [
    "agriculture",
    "agricultural",
    "farming",
    "crop science",
    "animal science",
  ],
};

// ============================================================
// NORMALIZE TEXT
// ============================================================

function normalizeText(value: string | null | undefined): string {
  return (value || "")
    .toLowerCase()
    .replace(/[()[\]{}]/g, " ")
    .replace(/[.,:;!?]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// ============================================================
// GET KEYWORDS
//
// IMPORTANT:
//
// Admin:
// code = programming
// name = Programming
//
// We use CODE first.
//
// This fixes:
//
// getKeywords("programming Programming")
//
// which previously failed to find
// KEYWORD_GROUPS["programming"].
//
// Now:
// getKeywords("programming")
// correctly gets all programming keywords.
// ============================================================

function getKeywords(value: string): string[] {
  const normalized = normalizeText(value);

  if (!normalized) {
    return [];
  }

  const keywords = new Set<string>();

  // ----------------------------------------------------------
  // Exact full value
  // ----------------------------------------------------------

  keywords.add(normalized);

  // ----------------------------------------------------------
  // Exact group
  // ----------------------------------------------------------

  const exactGroup = KEYWORD_GROUPS[normalized];

  if (exactGroup) {
    exactGroup.forEach((keyword) => {
      keywords.add(normalizeText(keyword));
    });
  }

  // ----------------------------------------------------------
  // Individual words
  // ----------------------------------------------------------

  const parts = normalized
    .split(/[\s/_,-]+/)
    .filter((word) => word.length >= 2);

  for (const part of parts) {
    keywords.add(part);

    const group = KEYWORD_GROUPS[part];

    if (group) {
      group.forEach((keyword) => {
        keywords.add(normalizeText(keyword));
      });
    }
  }

  // ----------------------------------------------------------
  // Check known groups inside the value
  // ----------------------------------------------------------

  for (const key of Object.keys(KEYWORD_GROUPS)) {
    if (
      normalized === key ||
      normalized.startsWith(`${key} `) ||
      normalized.includes(` ${key} `)
    ) {
      KEYWORD_GROUPS[key].forEach((keyword) => {
        keywords.add(normalizeText(keyword));
      });
    }
  }

  return Array.from(keywords).filter(Boolean);
}

// ============================================================
// CHECK MATCH
// ============================================================

function keywordMatchesText(
  keywords: string[],
  universityText: string,
): string | null {
  for (const keyword of keywords) {
    const normalizedKeyword = normalizeText(keyword);

    if (!normalizedKeyword) {
      continue;
    }

    if (universityText.includes(normalizedKeyword)) {
      return keyword;
    }
  }

  return null;
}

// ============================================================
// COMPONENT
// ============================================================

export default function InterestGuide() {
  // ==========================================================
  // DATA
  // ==========================================================

  const [options, setOptions] = useState<Option[]>([]);

  const [universities, setUniversities] = useState<University[]>(
    universitiesCache || [],
  );

  // ==========================================================
  // FORM
  // ==========================================================

  const [education, setEducation] = useState("");

  const [englishLevel, setEnglishLevel] = useState("");

  const [interests, setInterests] = useState<string[]>([]);

  const [career, setCareer] = useState("");

  // ==========================================================
  // RESULTS
  // ==========================================================

  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);

  const [submitted, setSubmitted] = useState(false);

  // ==========================================================
  // LOADING
  // ==========================================================

  const [loading, setLoading] = useState(true);

  const [universitiesLoading, setUniversitiesLoading] =
    useState(!universitiesCache);

  const [universitiesError, setUniversitiesError] = useState(false);

  // ==========================================================
  // RESTORE CONTROL
  // ==========================================================

  const restoredRef = useRef(false);

  // ==========================================================
  // RESTORE SAVED DATA
  // ==========================================================

  useEffect(() => {
    try {
      const savedData = sessionStorage.getItem(INTEREST_GUIDE_STORAGE_KEY);

      if (savedData) {
        const data: Partial<SavedInterestGuideData> = JSON.parse(savedData);

        setEducation(data.education || "");

        setEnglishLevel(data.englishLevel || "");

        setInterests(Array.isArray(data.interests) ? data.interests : []);

        setCareer(data.career || "");

        setRecommendations(
          Array.isArray(data.recommendations) ? data.recommendations : [],
        );

        setSubmitted(data.submitted === true);
      }
    } catch (error) {
      console.error("Failed to restore Interest Guide data:", error);

      sessionStorage.removeItem(INTEREST_GUIDE_STORAGE_KEY);
    } finally {
      restoredRef.current = true;
    }
  }, []);

  // ==========================================================
  // AUTO SAVE
  // ==========================================================

  useEffect(() => {
    if (!restoredRef.current) {
      return;
    }

    const data: SavedInterestGuideData = {
      education,
      englishLevel,
      interests,
      career,
      recommendations,
      submitted,
    };

    sessionStorage.setItem(INTEREST_GUIDE_STORAGE_KEY, JSON.stringify(data));
  }, [education, englishLevel, interests, career, recommendations, submitted]);

  // ==========================================================
  // LOAD OPTIONS
  // ==========================================================

  useEffect(() => {
    let cancelled = false;

    const loadOptions = async () => {
      try {
        setLoading(true);

        const response = await fetch("/api/interest-guide/options");

        if (!response.ok) {
          throw new Error("Failed to load interest guide options");
        }

        const data: Option[] = await response.json();

        if (!cancelled) {
          setOptions(data);
        }
      } catch (error) {
        console.error("Failed to load interest guide options:", error);
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };

    loadOptions();

    return () => {
      cancelled = true;
    };
  }, []);

  // ==========================================================
  // LOAD UNIVERSITIES
  // ==========================================================

  useEffect(() => {
    if (universitiesCache) {
      setUniversities(universitiesCache);
      setUniversitiesLoading(false);
      return;
    }

    let cancelled = false;

    const loadUniversities = async () => {
      try {
        setUniversitiesLoading(true);
        setUniversitiesError(false);

        const response = await fetch("/api/universities?limit=1000");

        if (!response.ok) {
          throw new Error("Failed to load universities");
        }

        const data = await response.json();

        const universityList: University[] = data.universities || data;

        if (!cancelled) {
          universitiesCache = universityList;

          setUniversities(universityList);
        }
      } catch (error) {
        console.error("Failed to load universities:", error);

        if (!cancelled) {
          setUniversitiesError(true);
        }
      } finally {
        if (!cancelled) {
          setUniversitiesLoading(false);
        }
      }
    };

    loadUniversities();

    return () => {
      cancelled = true;
    };
  }, []);

  // ==========================================================
  // CATEGORY OPTIONS
  // ==========================================================

  const educationOptions = useMemo(
    () =>
      options
        .filter((item) => item.category === "education")
        .sort((a, b) => a.displayOrder - b.displayOrder),
    [options],
  );

  const englishOptions = useMemo(
    () =>
      options
        .filter((item) => item.category === "english_levels")
        .sort((a, b) => a.displayOrder - b.displayOrder),
    [options],
  );

  const interestOptions = useMemo(
    () =>
      options
        .filter((item) => item.category === "interests")
        .sort((a, b) => a.displayOrder - b.displayOrder),
    [options],
  );

  const careerOptions = useMemo(
    () =>
      options
        .filter((item) => item.category === "careers")
        .sort((a, b) => a.displayOrder - b.displayOrder),
    [options],
  );

  // ==========================================================
  // CLEAR PREVIOUS RESULTS
  // ==========================================================

  const clearPreviousResults = () => {
    setRecommendations([]);
    setSubmitted(false);
  };

  // ==========================================================
  // TOGGLE INTEREST
  // ==========================================================

  const toggleInterest = (code: string) => {
    setInterests((current) =>
      current.includes(code)
        ? current.filter((item) => item !== code)
        : [...current, code],
    );

    clearPreviousResults();
  };

  // ==========================================================
  // CALCULATE RECOMMENDATIONS
  //
  // SCORE:
  //
  // Interest = 50%
  // Career  = 50%
  //
  // Education = NOT USED
  // English   = NOT USED
  //
  // Example:
  //
  // Programming -> Computer Science
  // Programmer  -> Computer Science
  //
  // Interest = 50
  // Career = 50
  // Total = 100%
  // ==========================================================

  const calculateRecommendations = () => {
    if (universitiesLoading) {
      return;
    }

    if (universitiesError) {
      return;
    }

    if (universities.length === 0) {
      setRecommendations([]);
      setSubmitted(true);
      return;
    }

    // ========================================================
    // SELECTED INTERESTS
    //
    // IMPORTANT:
    //
    // Use option.code only.
    //
    // programming
    // programmer
    // painting
    // law
    //
    // will correctly find KEYWORD_GROUPS.
    // ========================================================

    const selectedInterests = interestOptions
      .filter((option) => interests.includes(option.code))
      .map((option) => ({
        code: option.code,
        name: option.name,
        keywords: getKeywords(option.code),
      }));

    // ========================================================
    // SELECTED CAREER
    // ========================================================

    const selectedCareer = careerOptions.find(
      (option) => option.code === career,
    );

    const careerKeywords = selectedCareer
      ? getKeywords(selectedCareer.code)
      : [];

    // ========================================================
    // DEBUG
    //
    // Check browser console.
    //
    // Example:
    //
    // Selected interest:
    // programming
    //
    // Keywords:
    // programming
    // computer science
    // software engineering
    // information technology
    // ...
    // ========================================================

    console.log("Interest Guide - Selected Interests:", selectedInterests);

    console.log("Interest Guide - Selected Career:", selectedCareer);

    console.log("Interest Guide - Career Keywords:", careerKeywords);

    // ========================================================
    // RESULTS
    // ========================================================

    const results: Recommendation[] = [];

    for (const university of universities) {
      // ======================================================
      // BUILD SEARCHABLE UNIVERSITY TEXT
      // ======================================================

      const universityText = normalizeText(
        [
          university.name,
          university.nameEn,
          university.description || "",
          university.type,
          university.state,
          university.city || "",

          ...(university.majors || []).flatMap((major) => [
            major.name || "",
            major.nameEn || "",
            major.description || "",
          ]),
        ].join(" "),
      );

      // ======================================================
      // INTEREST MATCH
      // ======================================================

      const matchedInterests: string[] = [];

      for (const interest of selectedInterests) {
        const matchedKeyword = keywordMatchesText(
          interest.keywords,
          universityText,
        );

        if (matchedKeyword) {
          matchedInterests.push(interest.name);
        }
      }

      // ======================================================
      // CAREER MATCH
      // ======================================================

      let careerMatched = false;

      if (selectedCareer && careerKeywords.length > 0) {
        const matchedCareer = keywordMatchesText(
          careerKeywords,
          universityText,
        );

        careerMatched = Boolean(matchedCareer);
      }

      // ======================================================
      // INTEREST SCORE
      //
      // Maximum = 50
      //
      // Example:
      //
      // 1 interest selected
      // matched = 1
      //
      // 1 / 1 * 50 = 50
      //
      // 2 interests selected
      // matched = 1
      //
      // 1 / 2 * 50 = 25
      // ======================================================

      let interestScore = 0;

      if (selectedInterests.length > 0) {
        const interestRatio =
          matchedInterests.length / selectedInterests.length;

        interestScore = Math.round(interestRatio * 50);
      }

      // ======================================================
      // CAREER SCORE
      //
      // Maximum = 50
      // ======================================================

      const careerScore = careerMatched ? 50 : 0;

      // ======================================================
      // FINAL SCORE
      // ======================================================

      const score = interestScore + careerScore;

      // ======================================================
      // DO NOT SHOW 0%
      // ======================================================

      if (score <= 0) {
        continue;
      }

      // ======================================================
      // REASONS
      // ======================================================

      const reasons: string[] = [];

      for (const interestName of matchedInterests) {
        reasons.push(`Interest match: ${interestName}`);
      }

      if (careerMatched && selectedCareer) {
        reasons.push(`Career match: ${selectedCareer.name}`);
      }

      if (matchedInterests.length > 0 && careerMatched) {
        reasons.push(
          "Strong match: your interest and career goal both match this university's programs.",
        );
      }

      // ======================================================
      // ADD RESULT
      // ======================================================

      results.push({
        university,
        score,
        reasons,
      });
    }

    // ========================================================
    // SORT
    //
    // Highest score first.
    //
    // Therefore:
    //
    // Programming + Programmer
    //
    // Computer Science University
    //     100%
    //
    // Law University
    //     0% -> removed
    //
    // English University
    //     0% -> removed
    // ========================================================

    results.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }

      return a.university.name.localeCompare(b.university.name);
    });

    // ========================================================
    // TOP 30
    // ========================================================

    const topResults = results.slice(0, 30);

    setRecommendations(topResults);

    setSubmitted(true);

    // ========================================================
    // SAVE SESSION
    // ========================================================

    const data: SavedInterestGuideData = {
      education,
      englishLevel,
      interests,
      career,
      recommendations: topResults,
      submitted: true,
    };

    sessionStorage.setItem(INTEREST_GUIDE_STORAGE_KEY, JSON.stringify(data));
  };

  // ==========================================================
  // VALIDATION
  //
  // Education + English are required for form submission,
  // but NOT used for university score.
  // ==========================================================

  const canSubmit =
    Boolean(education) &&
    Boolean(englishLevel) &&
    interests.length > 0 &&
    Boolean(career);

  // ==========================================================
  // CLEAR ALL
  // ==========================================================

  const clearInterestGuideData = () => {
    setEducation("");
    setEnglishLevel("");
    setInterests([]);
    setCareer("");
    setRecommendations([]);
    setSubmitted(false);

    sessionStorage.removeItem(INTEREST_GUIDE_STORAGE_KEY);
  };

  // ==========================================================
  // LOADING
  // ==========================================================

  if (loading) {
    return (
      <Layout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <div className="text-center">
            <div className="text-lg font-medium">Loading Interest Guide...</div>

            <p className="mt-2 text-sm text-muted-foreground">Please wait...</p>
          </div>
        </div>
      </Layout>
    );
  }

  // ==========================================================
  // UI
  // ==========================================================

  return (
    <Layout>
      <div className="max-w-5xl mx-auto w-full px-4 py-10 space-y-8">
        {/* ====================================================
            HEADER
        ===================================================== */}

        <div className="text-center">
          <h1 className="text-3xl md:text-4xl font-bold">Interest Guide</h1>

          <p className="text-muted-foreground mt-2">
            သင့်ဝါသနာနဲ့ Career Goal အပေါ်မူတည်ပြီး သင့်အတွက် သင့်တော်နိုင်တဲ့
            Universities တွေကို ရှာဖွေပါ။
          </p>
        </div>

        {/* ====================================================
            FORM
        ===================================================== */}

        <Card>
          <CardHeader>
            <CardTitle>Your Information</CardTitle>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* ==================================================
                EDUCATION
            =================================================== */}

            <div>
              <label className="text-sm font-medium">လက်ရှိပညာရေး</label>

              <Select
                value={education}
                onValueChange={(value) => {
                  setEducation(value);
                  clearPreviousResults();
                }}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="လက်ရှိပညာရေးရွေးပါ" />
                </SelectTrigger>

                <SelectContent>
                  {educationOptions.map((option) => (
                    <SelectItem key={option.id} value={option.code}>
                      {option.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* ==================================================
                ENGLISH
            =================================================== */}

            <div>
              <label className="text-sm font-medium">English Level</label>

              <Select
                value={englishLevel}
                onValueChange={(value) => {
                  setEnglishLevel(value);
                  clearPreviousResults();
                }}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="English level ရွေးပါ" />
                </SelectTrigger>

                <SelectContent>
                  {englishOptions.map((option) => (
                    <SelectItem key={option.id} value={option.code}>
                      {option.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* ==================================================
                INTEREST
            =================================================== */}

            <div>
              <label className="text-sm font-medium">ဝါသနာ / Interests</label>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                {interestOptions.map((option) => (
                  <label
                    key={option.id}
                    className="
                        flex items-center gap-3
                        border rounded-lg p-3
                        cursor-pointer
                        hover:bg-muted
                      "
                  >
                    <Checkbox
                      checked={interests.includes(option.code)}
                      onCheckedChange={() => toggleInterest(option.code)}
                    />

                    <span>{option.name}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* ==================================================
                CAREER
            =================================================== */}

            <div>
              <label className="text-sm font-medium">Career Goal</label>

              <Select
                value={career}
                onValueChange={(value) => {
                  setCareer(value);
                  clearPreviousResults();
                }}
              >
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="Career goal ရွေးပါ" />
                </SelectTrigger>

                <SelectContent>
                  {careerOptions.map((option) => (
                    <SelectItem key={option.id} value={option.code}>
                      {option.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* ==================================================
                LOADING
            =================================================== */}

            {universitiesLoading && (
              <div className="rounded-lg border bg-muted/40 px-4 py-3">
                <p className="text-sm text-muted-foreground">
                  Universities are loading...
                </p>

                <p className="text-xs text-muted-foreground mt-1">
                  You can fill in your information while universities are
                  loading.
                </p>
              </div>
            )}

            {/* ==================================================
                ERROR
            =================================================== */}

            {universitiesError && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3">
                <p className="text-sm text-destructive">
                  Failed to load universities. Please refresh the page and try
                  again.
                </p>
              </div>
            )}

            {/* ==================================================
                BUTTONS
            =================================================== */}

            <div className="flex gap-3">
              <Button
                className="flex-1"
                size="lg"
                disabled={
                  !canSubmit || universitiesLoading || universitiesError
                }
                onClick={calculateRecommendations}
              >
                {universitiesLoading
                  ? "Loading Universities..."
                  : "Find Suitable Universities"}
              </Button>

              <Button
                type="button"
                variant="outline"
                size="lg"
                onClick={clearInterestGuideData}
              >
                Clear
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* ====================================================
            RECOMMENDATIONS
        ===================================================== */}

        {submitted && (
          <Card>
            <CardHeader>
              <CardTitle>သင့်အတွက် သင့်တော်နိုင်သော Universities</CardTitle>
            </CardHeader>

            <CardContent>
              {recommendations.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-muted-foreground">
                    သင့် Interest နဲ့ Career Goal နဲ့ ကိုက်ညီတဲ့ University
                    မတွေ့ပါ။
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {recommendations.map((item, index) => (
                    <div
                      key={item.university.id}
                      className="
                          border rounded-xl p-5
                          hover:shadow-sm
                          transition
                        "
                    >
                      {/* ========================================
                            TOP
                        ========================================= */}

                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <Badge>#{index + 1}</Badge>

                            <Badge variant="secondary">
                              Match {item.score}%
                            </Badge>
                          </div>

                          <h3 className="text-xl font-bold mt-3">
                            {item.university.name}
                          </h3>

                          <p className="text-muted-foreground">
                            {item.university.nameEn}
                          </p>
                        </div>
                      </div>

                      {/* ========================================
                            DESCRIPTION
                        ========================================= */}

                      {item.university.description && (
                        <p className="mt-3 text-sm">
                          {item.university.description}
                        </p>
                      )}

                      {/* ========================================
                            MAJORS
                        ========================================= */}

                      {item.university.majors?.length > 0 && (
                        <div className="mt-4">
                          <p className="font-medium">Available Programs:</p>

                          <div className="flex flex-wrap gap-2 mt-2">
                            {item.university.majors
                              .slice(0, 10)
                              .map((major) => (
                                <Badge key={major.id} variant="outline">
                                  {major.nameEn || major.name}
                                </Badge>
                              ))}
                          </div>
                        </div>
                      )}

                      {/* ========================================
                            MATCH REASONS
                        ========================================= */}

                      {item.reasons.length > 0 && (
                        <div className="mt-4">
                          <p className="font-medium">
                            Why this university matches:
                          </p>

                          <ul
                            className="
                                list-disc
                                ml-5
                                text-sm
                                text-muted-foreground
                                mt-1
                                space-y-1
                              "
                          >
                            {item.reasons
                              .slice(0, 4)
                              .map((reason, reasonIndex) => (
                                <li key={`${reason}-${reasonIndex}`}>
                                  {reason}
                                </li>
                              ))}
                          </ul>
                        </div>
                      )}

                      {/* ========================================
                            VIEW UNIVERSITY
                        ========================================= */}

                      <div className="mt-4">
                        <Button asChild variant="outline">
                          <Link href={`/universities/${item.university.id}`}>
                            View University
                          </Link>
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </Layout>
  );
}
