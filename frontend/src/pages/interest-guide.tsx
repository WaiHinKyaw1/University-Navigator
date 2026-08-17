import { useEffect, useMemo, useState } from "react";
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

export default function InterestGuide() {
  const [options, setOptions] = useState<Option[]>([]);
  const [universities, setUniversities] = useState<University[]>([]);

  const [education, setEducation] = useState("");
  const [englishLevel, setEnglishLevel] = useState("");
  const [interests, setInterests] = useState<string[]>([]);
  const [subject, setSubject] = useState("");
  const [career, setCareer] = useState("");

  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);

  const [loading, setLoading] = useState(true);
  const [submitted, setSubmitted] = useState(false);

  // ============================================================
  // LOAD OPTIONS + UNIVERSITIES
  // ============================================================

  useEffect(() => {
    const loadData = async () => {
      try {
        const [optionsResponse, universitiesResponse] = await Promise.all([
          fetch("/api/interest-guide/options"),
          fetch("/api/universities?limit=1000"),
        ]);

        if (!optionsResponse.ok) {
          throw new Error("Failed to load options");
        }

        if (!universitiesResponse.ok) {
          throw new Error("Failed to load universities");
        }

        const optionsData = await optionsResponse.json();
        const universitiesData = await universitiesResponse.json();

        setOptions(optionsData);

        setUniversities(universitiesData.universities || universitiesData);
      } catch (error) {
        console.error("Failed to load Interest Guide data:", error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // ============================================================
  // OPTION GROUPS
  // ============================================================

  const educationOptions = useMemo(
    () => options.filter((item) => item.category === "education"),
    [options],
  );

  const englishOptions = useMemo(
    () => options.filter((item) => item.category === "english_levels"),
    [options],
  );

  const interestOptions = useMemo(
    () => options.filter((item) => item.category === "interests"),
    [options],
  );

  const subjectOptions = useMemo(
    () => options.filter((item) => item.category === "subjects"),
    [options],
  );

  const careerOptions = useMemo(
    () => options.filter((item) => item.category === "careers"),
    [options],
  );

  // ============================================================
  // TOGGLE INTEREST
  // ============================================================

  const toggleInterest = (code: string) => {
    setInterests((current) =>
      current.includes(code)
        ? current.filter((item) => item !== code)
        : [...current, code],
    );
  };

  // ============================================================
  // KEYWORD MAPPING
  // ============================================================

  /**
   * Interest related keywords
   *
   * Example:
   * Programming
   *   -> programming
   *   -> computer science
   *   -> software
   *   -> IT
   *   -> software engineering
   */
  const interestKeywords: Record<string, string[]> = {
    programming: [
      "programming",
      "computer science",
      "software",
      "information technology",
      "information systems",
      "computer engineering",
      "software engineering",
      "web development",
      "app development",
      "application development",
      "developer",
      "coding",
    ],

    technology: [
      "technology",
      "computer science",
      "information technology",
      "information systems",
      "software",
      "computer engineering",
      "data science",
      "artificial intelligence",
      "cyber security",
      "cybersecurity",
    ],

    business: [
      "business",
      "business administration",
      "management",
      "commerce",
      "accounting",
      "finance",
      "marketing",
      "economics",
      "entrepreneurship",
    ],

    art: [
      "art",
      "design",
      "graphic design",
      "fine arts",
      "visual arts",
      "creative",
      "multimedia",
    ],

    music: ["music", "musical", "performing arts", "sound", "audio"],

    science: [
      "science",
      "biology",
      "chemistry",
      "physics",
      "mathematics",
      "environmental science",
      "laboratory",
    ],
  };

  /**
   * Career related keywords
   *
   * Career is given the highest weight.
   */
  const careerKeywords: Record<string, string[]> = {
    programmer: [
      "programmer",
      "programming",
      "computer science",
      "software",
      "software engineering",
      "information technology",
      "information systems",
      "computer engineering",
      "developer",
      "web development",
      "application development",
      "coding",
    ],

    software_developer: [
      "software developer",
      "software development",
      "software engineering",
      "computer science",
      "programming",
      "information technology",
      "developer",
    ],

    web_developer: [
      "web developer",
      "web development",
      "computer science",
      "software engineering",
      "information technology",
      "programming",
    ],

    data_scientist: [
      "data science",
      "data scientist",
      "computer science",
      "statistics",
      "mathematics",
      "artificial intelligence",
      "machine learning",
    ],

    engineer: [
      "engineering",
      "computer engineering",
      "electrical engineering",
      "mechanical engineering",
      "civil engineering",
      "software engineering",
    ],

    accountant: [
      "accounting",
      "accountancy",
      "finance",
      "business",
      "business administration",
      "commerce",
    ],

    business_manager: [
      "business",
      "business administration",
      "management",
      "commerce",
      "marketing",
      "finance",
      "economics",
    ],

    teacher: [
      "education",
      "teaching",
      "teacher",
      "english",
      "mathematics",
      "science",
      "education studies",
    ],

    doctor: [
      "medicine",
      "medical",
      "health science",
      "health sciences",
      "medicine and surgery",
    ],

    nurse: ["nursing", "health science", "health sciences", "medical"],

    designer: [
      "design",
      "graphic design",
      "visual design",
      "fine arts",
      "multimedia",
      "creative arts",
    ],
  };

  /**
   * Favorite subject related keywords.
   *
   * Subject has lower weight than Career + Interest.
   */
  const subjectKeywords: Record<string, string[]> = {
    english: [
      "english",
      "english language",
      "english literature",
      "linguistics",
      "language studies",
    ],

    mathematics: [
      "mathematics",
      "mathematical",
      "statistics",
      "data science",
      "computer science",
      "engineering",
      "economics",
    ],

    physics: [
      "physics",
      "engineering",
      "computer engineering",
      "electrical engineering",
      "mechanical engineering",
    ],

    chemistry: [
      "chemistry",
      "chemical engineering",
      "pharmacy",
      "biochemistry",
      "science",
    ],

    biology: [
      "biology",
      "biological science",
      "medicine",
      "medical",
      "nursing",
      "pharmacy",
      "health science",
      "life science",
    ],

    computer_science: [
      "computer science",
      "programming",
      "software",
      "information technology",
      "information systems",
      "computer engineering",
      "software engineering",
    ],

    economics: [
      "economics",
      "business",
      "finance",
      "accounting",
      "commerce",
      "management",
    ],
  };

  // ============================================================
  // GET KEYWORDS
  // ============================================================

  const getKeywords = (
    code: string,
    name: string,
    mapping: Record<string, string[]>,
  ): string[] => {
    const mappedKeywords = mapping[code];

    if (mappedKeywords && mappedKeywords.length > 0) {
      return mappedKeywords;
    }

    return [name.toLowerCase(), code.toLowerCase().replace(/_/g, " ")];
  };

  // ============================================================
  // CALCULATE RECOMMENDATIONS
  // ============================================================

  const calculateRecommendations = () => {
    const selectedInterestOptions = interestOptions.filter((option) =>
      interests.includes(option.code),
    );

    const selectedSubjectOption = subjectOptions.find(
      (option) => option.code === subject,
    );

    const selectedCareerOption = careerOptions.find(
      (option) => option.code === career,
    );

    const results: Recommendation[] = universities.map((university) => {
      let score = 0;

      const reasons: string[] = [];

      // ========================================================
      // UNIVERSITY SEARCH TEXT
      // ========================================================

      const universityText = `
        ${university.name}
        ${university.nameEn}
        ${university.description || ""}
        ${university.type || ""}
        ${university.state || ""}
        ${university.city || ""}

        ${(university.majors || [])
          .map(
            (major) => `
              ${major.name}
              ${major.nameEn}
              ${major.description || ""}
            `,
          )
          .join(" ")}
      `.toLowerCase();

      // ========================================================
      // INTEREST MATCH
      // ========================================================

      for (const interestOption of selectedInterestOptions) {
        const keywords = getKeywords(
          interestOption.code,
          interestOption.name,
          interestKeywords,
        );

        const matchedKeyword = keywords.find((keyword) =>
          universityText.includes(keyword.toLowerCase()),
        );

        if (matchedKeyword) {
          score += 25;

          reasons.push(`Interest match: ${interestOption.name}`);

          break;
        }
      }

      // ========================================================
      // CAREER MATCH
      // ========================================================

      if (selectedCareerOption) {
        const keywords = getKeywords(
          selectedCareerOption.code,
          selectedCareerOption.name,
          careerKeywords,
        );

        const matchedKeyword = keywords.find((keyword) =>
          universityText.includes(keyword.toLowerCase()),
        );

        if (matchedKeyword) {
          score += 35;

          reasons.push(`Career match: ${selectedCareerOption.name}`);
        }
      }

      // ========================================================
      // SUBJECT MATCH
      // ========================================================

      if (selectedSubjectOption) {
        const keywords = getKeywords(
          selectedSubjectOption.code,
          selectedSubjectOption.name,
          subjectKeywords,
        );

        const matchedKeyword = keywords.find((keyword) =>
          universityText.includes(keyword.toLowerCase()),
        );

        if (matchedKeyword) {
          score += 10;

          reasons.push(`Subject match: ${selectedSubjectOption.name}`);
        }
      }

      // ========================================================
      // MINIMUM SCORE
      // ========================================================

      if (university.minScore <= 400) {
        score += 5;

        reasons.push("Entry score may be suitable");
      }

      // ========================================================
      // EDUCATION
      // ========================================================

      if (education) {
        score += 5;

        reasons.push("Suitable for your education level");
      }

      // ========================================================
      // ENGLISH LEVEL
      // ========================================================

      if (englishLevel) {
        score += 5;

        reasons.push("English level considered");
      }

      // ========================================================
      // RETURN RESULT
      // ========================================================

      return {
        university,
        score: Math.min(score, 100),
        reasons,
      };
    });

    // ==========================================================
    // SORT HIGH SCORE FIRST
    // ==========================================================

    results.sort((a, b) => {
      if (b.score !== a.score) {
        return b.score - a.score;
      }

      return a.university.name.localeCompare(b.university.name);
    });

    // ==========================================================
    // TOP 10
    // ==========================================================

    setRecommendations(results.slice(0, 10));

    setSubmitted(true);
  };

  // ============================================================
  // SUBMIT VALIDATION
  // ============================================================

  const canSubmit =
    education && englishLevel && interests.length > 0 && subject && career;

  // ============================================================
  // LOADING
  // ============================================================

  if (loading) {
    return (
      <Layout>
        <div className="min-h-[60vh] flex items-center justify-center">
          Loading...
        </div>
      </Layout>
    );
  }

  // ============================================================
  // UI
  // ============================================================

  return (
    <Layout>
      <div className="max-w-5xl mx-auto w-full px-4 py-10 space-y-8">
        {/* =====================================================
            HEADER
        ====================================================== */}

        <div className="text-center">
          <h1 className="text-3xl md:text-4xl font-bold">Interest Guide</h1>

          <p className="text-muted-foreground mt-2">
            ဖြေဆိုပြီး သင့်အတွက် သင့်တော်နိုင်သော Universities တွေကို ရှာဖွေပါ။
          </p>
        </div>

        {/* =====================================================
            FORM
        ====================================================== */}

        <Card>
          <CardHeader>
            <CardTitle>Your Information</CardTitle>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* =================================================
                EDUCATION
            ================================================== */}

            <div>
              <label className="text-sm font-medium">လက်ရှိပညာရေး</label>

              <Select value={education} onValueChange={setEducation}>
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

            {/* =================================================
                ENGLISH LEVEL
            ================================================== */}

            <div>
              <label className="text-sm font-medium">English Level</label>

              <Select value={englishLevel} onValueChange={setEnglishLevel}>
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

            {/* =================================================
                INTERESTS
            ================================================== */}

            <div>
              <label className="text-sm font-medium">ဝါသနာ / Interests</label>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                {interestOptions.map((option) => (
                  <label
                    key={option.id}
                    className="flex items-center gap-3 border rounded-lg p-3 cursor-pointer hover:bg-muted"
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

            {/* =================================================
                SUBJECT
            ================================================== */}

            <div>
              <label className="text-sm font-medium">အကြိုက်ဆုံးဘာသာရပ်</label>

              <Select value={subject} onValueChange={setSubject}>
                <SelectTrigger className="mt-2">
                  <SelectValue placeholder="ဘာသာရပ်ရွေးပါ" />
                </SelectTrigger>

                <SelectContent>
                  {subjectOptions.map((option) => (
                    <SelectItem key={option.id} value={option.code}>
                      {option.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* =================================================
                CAREER
            ================================================== */}

            <div>
              <label className="text-sm font-medium">Career Goal</label>

              <Select value={career} onValueChange={setCareer}>
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

            {/* =================================================
                SUBMIT
            ================================================== */}

            <Button
              className="w-full"
              size="lg"
              disabled={!canSubmit}
              onClick={calculateRecommendations}
            >
              Find Suitable Universities
            </Button>
          </CardContent>
        </Card>

        {/* =====================================================
            RESULTS
        ====================================================== */}

        {submitted && (
          <Card>
            <CardHeader>
              <CardTitle>သင့်အတွက် သင့်တော်နိုင်သော Universities</CardTitle>
            </CardHeader>

            <CardContent>
              {recommendations.length === 0 ? (
                <p className="text-muted-foreground">No universities found.</p>
              ) : (
                <div className="space-y-4">
                  {recommendations.map((item, index) => (
                    <div
                      key={item.university.id}
                      className="border rounded-xl p-5"
                    >
                      {/* =======================================
                          UNIVERSITY HEADER
                      ======================================== */}

                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <div className="flex items-center gap-2">
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

                      {/* =======================================
                          DESCRIPTION
                      ======================================== */}

                      {item.university.description && (
                        <p className="mt-3 text-sm">
                          {item.university.description}
                        </p>
                      )}

                      {/* =======================================
                          WHY THIS UNIVERSITY
                      ======================================== */}

                      {item.reasons.length > 0 && (
                        <div className="mt-4">
                          <p className="font-medium">Why this may suit you:</p>

                          <ul className="list-disc ml-5 text-sm text-muted-foreground mt-1">
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

                      {/* =======================================
                          MAJORS
                      ======================================== */}

                      {item.university.majors &&
                        item.university.majors.length > 0 && (
                          <div className="mt-4">
                            <p className="font-medium">Available Majors:</p>

                            <div className="flex flex-wrap gap-2 mt-2">
                              {item.university.majors
                                .slice(0, 6)
                                .map((major) => (
                                  <Badge key={major.id} variant="outline">
                                    {major.name}
                                  </Badge>
                                ))}
                            </div>
                          </div>
                        )}

                      {/* =======================================
                          VIEW UNIVERSITY
                      ======================================== */}

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
