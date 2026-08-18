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

// ============================================================
// SAVED INTEREST GUIDE DATA
// ============================================================

type SavedInterestGuideData = {
  education: string;
  englishLevel: string;
  interests: string[];
  subject: string;
  career: string;
  recommendations: Recommendation[];
  submitted: boolean;
};

const INTEREST_GUIDE_STORAGE_KEY = "interest-guide-form";

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
  // IMPORTANT
  // Prevent auto-save from overwriting saved data
  // before restore is completed.
  // ============================================================

  const restoredRef = useRef(false);

  // ============================================================
  // RESTORE PREVIOUSLY SELECTED DATA + RESULTS
  // ============================================================

  useEffect(() => {
    try {
      const savedData = sessionStorage.getItem(INTEREST_GUIDE_STORAGE_KEY);

      if (savedData) {
        const data: Partial<SavedInterestGuideData> = JSON.parse(savedData);

        // Restore education
        setEducation(data.education || "");

        // Restore English level
        setEnglishLevel(data.englishLevel || "");

        // Restore interests
        setInterests(Array.isArray(data.interests) ? data.interests : []);

        // Restore subject
        setSubject(data.subject || "");

        // Restore career
        setCareer(data.career || "");

        // Restore recommendation results
        setRecommendations(
          Array.isArray(data.recommendations) ? data.recommendations : [],
        );

        // Restore submitted state
        setSubmitted(data.submitted === true);
      }
    } catch (error) {
      console.error("Failed to restore Interest Guide data:", error);

      sessionStorage.removeItem(INTEREST_GUIDE_STORAGE_KEY);
    } finally {
      restoredRef.current = true;
    }
  }, []);

  // ============================================================
  // AUTO SAVE FORM + RESULTS
  // ============================================================

  useEffect(() => {
    // Do not save before restore is completed.
    if (!restoredRef.current) {
      return;
    }

    const data: SavedInterestGuideData = {
      education,
      englishLevel,
      interests,
      subject,
      career,
      recommendations,
      submitted,
    };

    sessionStorage.setItem(INTEREST_GUIDE_STORAGE_KEY, JSON.stringify(data));
  }, [
    education,
    englishLevel,
    interests,
    subject,
    career,
    recommendations,
    submitted,
  ]);

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
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // ============================================================
  // CATEGORY OPTIONS
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
    clearPreviousResults();
  };

  const clearPreviousResults = () => {
    setRecommendations([]);
    setSubmitted(false);
  };

  // ============================================================
  // CALCULATE RECOMMENDATIONS
  // ============================================================

  const calculateRecommendations = () => {
    const results: Recommendation[] = universities.map((university) => {
      let score = 0;

      const reasons: string[] = [];

      const universityText = `
          ${university.name}
          ${university.nameEn}
          ${university.description || ""}
          ${university.majors
            .map((major) => `${major.name} ${major.nameEn}`)
            .join(" ")}
        `.toLowerCase();

      const selectedInterestNames = interestOptions
        .filter((option) => interests.includes(option.code))
        .map((option) => option.name.toLowerCase());

      const selectedSubjectName =
        subjectOptions
          .find((option) => option.code === subject)
          ?.name.toLowerCase() || "";

      const selectedCareerName =
        careerOptions
          .find((option) => option.code === career)
          ?.name.toLowerCase() || "";

      // ======================================================
      // INTEREST MATCH
      // ======================================================

      for (const interest of selectedInterestNames) {
        const words = interest
          .split(/[\s/,&-]+/)
          .filter((word) => word.length >= 4);

        if (words.some((word) => universityText.includes(word))) {
          score += 12;

          reasons.push(`Interest match: ${interest}`);

          break;
        }
      }

      // ======================================================
      // SUBJECT MATCH
      // ======================================================

      if (selectedSubjectName && universityText.includes(selectedSubjectName)) {
        score += 18;

        reasons.push(`Subject match: ${selectedSubjectName}`);
      }

      // ======================================================
      // CAREER MATCH
      // ======================================================

      if (selectedCareerName && universityText.includes(selectedCareerName)) {
        score += 25;

        reasons.push(`Career match: ${selectedCareerName}`);
      }

      // ======================================================
      // MIN SCORE
      // ======================================================

      if (university.minScore <= 400) {
        score += 5;
      }

      // ======================================================
      // EDUCATION
      // ======================================================

      if (education) {
        score += 5;

        reasons.push("Suitable for your education level");
      }

      // ======================================================
      // ENGLISH LEVEL
      // ======================================================

      if (englishLevel) {
        score += 5;

        reasons.push("English level considered");
      }

      return {
        university,
        score: Math.min(score, 100),
        reasons,
      };
    });

    // Sort highest score first
    results.sort((a, b) => b.score - a.score);

    // Keep top 10
    const topResults = results.slice(0, 10);

    // Set result
    setRecommendations(topResults);

    // Show result section
    setSubmitted(true);

    // ========================================================
    // IMPORTANT
    // Save result immediately
    // ========================================================

    const data: SavedInterestGuideData = {
      education,
      englishLevel,
      interests,
      subject,
      career,
      recommendations: topResults,
      submitted: true,
    };

    sessionStorage.setItem(INTEREST_GUIDE_STORAGE_KEY, JSON.stringify(data));
  };

  // ============================================================
  // SUBMIT VALIDATION
  // ============================================================

  const canSubmit =
    education && englishLevel && interests.length > 0 && subject && career;

  // ============================================================
  // CLEAR ALL DATA
  // ============================================================

  const clearInterestGuideData = () => {
    // Clear form
    setEducation("");

    setEnglishLevel("");

    setInterests([]);

    setSubject("");

    setCareer("");

    // Clear recommendations
    setRecommendations([]);

    // Hide results
    setSubmitted(false);

    // Remove storage
    sessionStorage.removeItem(INTEREST_GUIDE_STORAGE_KEY);
  };

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
        {/* ======================================================
            HEADER
        ======================================================= */}

        <div className="text-center">
          <h1 className="text-3xl md:text-4xl font-bold">Interest Guide</h1>

          <p className="text-muted-foreground mt-2">
            ဖြေဆိုပြီး သင့်အတွက် သင့်တော်နိုင်သော Universities တွေကို ရှာဖွေပါ။
          </p>
        </div>

        {/* ======================================================
            FORM
        ======================================================= */}

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
                ENGLISH LEVEL
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
                INTERESTS
            =================================================== */}

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

            {/* ==================================================
                SUBJECT
            =================================================== */}

            <div>
              <label className="text-sm font-medium">အကြိုက်ဆုံးဘာသာရပ်</label>

              <Select
                value={subject}
                onValueChange={(value) => {
                  setSubject(value);
                  clearPreviousResults();
                }}
              >
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
                BUTTONS
            =================================================== */}

            <div className="flex gap-3">
              <Button
                className="flex-1"
                size="lg"
                disabled={!canSubmit}
                onClick={calculateRecommendations}
              >
                Find Suitable Universities
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

        {/* ======================================================
            RECOMMENDATIONS
        ======================================================= */}

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

                      {item.university.description && (
                        <p className="mt-3 text-sm">
                          {item.university.description}
                        </p>
                      )}

                      {item.reasons.length > 0 && (
                        <div className="mt-4">
                          <p className="font-medium">Why this may suit you:</p>

                          <ul className="list-disc ml-5 text-sm text-muted-foreground mt-1">
                            {item.reasons.slice(0, 3).map((reason) => (
                              <li key={reason}>{reason}</li>
                            ))}
                          </ul>
                        </div>
                      )}

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
