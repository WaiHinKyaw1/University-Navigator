import { useState, useEffect, useMemo } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { Link } from "wouter";
import { Loader2, Sparkles, User, BrainCircuit } from "lucide-react";

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
  
  // NLP State
  const [nlpText, setNlpText] = useState("");
  const [isNlpMode, setIsNlpMode] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

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

  const interestKeywords: Record<string, string[]> = {
    programming: ["programming", "computer science", "software", "IT", "web development", "coding"],
    technology: ["technology", "AI", "cyber security", "data science"],
    business: ["business", "management", "finance", "marketing", "economics"],
    art: ["art", "design", "creative", "multimedia"],
    music: ["music", "sound", "audio"],
    science: ["science", "biology", "chemistry", "physics", "math"],
  };

  const careerKeywords: Record<string, string[]> = {
    programmer: ["programmer", "software engineer", "developer", "coding"],
    doctor: ["doctor", "medicine", "medical", "health"],
    engineer: ["engineer", "civil", "mechanical", "electrical"],
    teacher: ["teacher", "education", "teaching"],
  };

  const subjectKeywords: Record<string, string[]> = {
    mathematics: ["math", "statistics", "data"],
    physics: ["physics", "engineering"],
    english: ["english", "language", "literature"],
  };

  const getKeywords = (
    code: string,
    name: string,
    mapping: Record<string, string[]>,
  ): string[] => {
    const mappedKeywords = mapping[code];
    if (mappedKeywords && mappedKeywords.length > 0) return mappedKeywords;
    return [name.toLowerCase(), code.toLowerCase().replace(/_/g, " ")];
  };

  // ============================================================
  // CALCULATE RECOMMENDATIONS (RULE-BASED)
  // ============================================================

  const calculateRecommendations = () => {
    const selectedInterestOptions = interestOptions.filter((option) =>
      interests.includes(option.code),
    );
    const selectedSubjectOption = subjectOptions.find((o) => o.code === subject);
    const selectedCareerOption = careerOptions.find((o) => o.code === career);

    const results: Recommendation[] = universities.map((university) => {
      let score = 0;
      const reasons: string[] = [];
      const universityText = `${university.name} ${university.nameEn} ${university.description || ""} ${university.type} ${university.state} ${university.city} ${(university.majors || []).map(m => `${m.name} ${m.nameEn}`).join(" ")}`.toLowerCase();

      // Interest Match
      for (const opt of selectedInterestOptions) {
        const keywords = getKeywords(opt.code, opt.name, interestKeywords);
        if (keywords.find(k => universityText.includes(k.toLowerCase()))) {
          score += 25;
          reasons.push(`Interest match: ${opt.name}`);
          break;
        }
      }

      // Career Match
      if (selectedCareerOption) {
        const keywords = getKeywords(selectedCareerOption.code, selectedCareerOption.name, careerKeywords);
        if (keywords.find(k => universityText.includes(k.toLowerCase()))) {
          score += 35;
          reasons.push(`Career match: ${selectedCareerOption.name}`);
        }
      }

      // Subject Match
      if (selectedSubjectOption) {
        const keywords = getKeywords(selectedSubjectOption.code, selectedSubjectOption.name, subjectKeywords);
        if (keywords.find(k => universityText.includes(k.toLowerCase()))) {
          score += 10;
          reasons.push(`Subject match: ${selectedSubjectOption.name}`);
        }
      }

      if (university.minScore <= 400) { score += 5; reasons.push("Entry score may be suitable"); }
      if (education) { score += 5; reasons.push("Suitable for your education level"); }
      if (englishLevel) { score += 5; reasons.push("English level considered"); }

      return { university, score: Math.min(score, 100), reasons };
    });

    results.sort((a, b) => b.score - a.score || a.university.name.localeCompare(b.university.name));
    setRecommendations(results.slice(0, 10));
    setSubmitted(true);
  };

  // ============================================================
  // ANALYZE NLP (AI-BASED)
  // ============================================================

  const analyzeWithNLP = async () => {
    if (!nlpText || nlpText.trim().length < 5) return;
    
    setIsAnalyzing(true);
    try {
      const response = await fetch("/api/interest-guide/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: nlpText }),
      });

      if (!response.ok) throw new Error("Analysis failed");

      const data = await response.json();
      setRecommendations(data);
      setSubmitted(true);
    } catch (error) {
      console.error("NLP Analysis error:", error);
      alert("AI Analysis failed. Please try again or use the form mode.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  // ============================================================
  // UI
  // ============================================================

  if (loading) {
    return (
      <Layout>
        <div className="min-h-[60vh] flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <span className="ml-2">Loading...</span>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-5xl mx-auto w-full px-4 py-10 space-y-8">
        <div className="text-center">
          <h1 className="text-3xl md:text-4xl font-bold">Interest Guide</h1>
          <p className="text-muted-foreground mt-2">
            သင့်ရဲ့ စိတ်ဝင်စားမှုနဲ့ ကျွမ်းကျင်မှုတွေကို အခြေခံပြီး သင့်တော်မယ့် တက္ကသိုလ်တွေကို ရှာဖွေပါ။
          </p>
        </div>

        <div className="flex justify-center gap-4">
          <Button 
            variant={isNlpMode ? "outline" : "default"}
            onClick={() => { setIsNlpMode(false); setSubmitted(false); }}
            className="w-40"
          >
            <User className="w-4 hide mr-2" />
            Form Mode
          </Button>
          <Button 
            variant={isNlpMode ? "default" : "outline"}
            onClick={() => { setIsNlpMode(true); setSubmitted(false); }}
            className="w-40"
          >
            <BrainCircuit className="w-4 h-4 mr-2" />
            AI NLP Mode
          </Button>
        </div>

        {!submitted ? (
          <Card className="border-2 border-primary/10 shadow-lg">
            <CardHeader className="bg-primary/5">
              <CardTitle className="flex items-center gap-2">
                {isNlpMode ? <Sparkles className="w-5 h-5 text-primary" /> : <User className="w-5 h-5 text-primary" />}
                {isNlpMode ? "AI NLP Analysis" : "Your Information"}
              </CardTitle>
            </CardHeader>
            <CardContent className="p-6">
              {isNlpMode ? (
                <div className="space-y-4">
                  <p className="text-sm font-medium text-muted-foreground">
                    သင့်ရဲ့ Skills, Interests, Work Preferences နဲ့ Career Goals တွေကို စာသားနဲ့ အလွတ်ရေးပေးပါ။ AI က သင့်အတွက် အကောင်းဆုံး တက္ကသိုလ်တွေကို ရှာပေးပါလိမ့်မယ်။
                  </p>
                  <Textarea 
                    placeholder="ဥပမာ- ကျွန်တော်က programming နဲ့ problem solving ကို ဝါသနာပါတယ်။ Mathematics မှာလည်း စိတ်ဝင်စားပြီး programming skill ကောင်းပါတယ်။ အနာဂတ်မှာ software developer တစ်ယောက် ဖြစ်ချင်ပါတယ်..."
                    className="min-h-[200px] text-base leading-relaxed"
                    value={nlpText}
                    onChange={(e) => setNlpText(e.target.value)}
                  />
                  <Button 
                    className="w-full h-12 text-lg" 
                    onClick={analyzeWithNLP}
                    disabled={isAnalyzing || nlpText.trim().length < 5}
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        Analyzing with AI...
                      </>
                    ) : (
                      <>
                        <Sparkles className="mr-2 h-5 w-5" />
                        AI နဲ့ ရှာဖွေမည်
                      </>
                    )}
                  </Button>
                </div>
              ) : (
                <div className="space-y-6">
                  <div>
                    <label className="text-sm font-medium">လက်ရှိပညာရေး</label>
                    <Select value={education} onValueChange={setEducation}>
                      <SelectTrigger className="mt-2"><SelectValue placeholder="လက်ရှိပညာရေးရွေးပါ" /></SelectTrigger>
                      <SelectContent>
                        {educationOptions.map((o) => <SelectItem key={o.id} value={o.code}>{o.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium">English Level</label>
                    <Select value={englishLevel} onValueChange={setEnglishLevel}>
                      <SelectTrigger className="mt-2"><SelectValue placeholder="English level ရွေးပါ" /></SelectTrigger>
                      <SelectContent>
                        {englishOptions.map((o) => <SelectItem key={o.id} value={o.code}>{o.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium">ဝါသနာ / Interests</label>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                      {interestOptions.map((o) => (
                        <label key={o.id} className="flex items-center gap-3 border rounded-lg p-3 cursor-pointer hover:bg-muted">
                          <Checkbox checked={interests.includes(o.code)} onCheckedChange={() => toggleInterest(o.code)} />
                          <span>{o.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium">အကြိုက်ဆုံးဘာသာရပ်</label>
                    <Select value={subject} onValueChange={setSubject}>
                      <SelectTrigger className="mt-2"><SelectValue placeholder="ဘာသာရပ်ရွေးပါ" /></SelectTrigger>
                      <SelectContent>
                        {subjectOptions.map((o) => <SelectItem key={o.id} value={o.code}>{o.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <label className="text-sm font-medium">ဖြစ်ချင်သောအလုပ်အကိုင်</label>
                    <Select value={career} onValueChange={setCareer}>
                      <SelectTrigger className="mt-2"><SelectValue placeholder="အလုပ်အကိုင်ရွေးပါ" /></SelectTrigger>
                      <SelectContent>
                        {careerOptions.map((o) => <SelectItem key={o.id} value={o.code}>{o.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>

                  <Button 
                    className="w-full h-12 text-lg" 
                    onClick={calculateRecommendations}
                    disabled={!education || !englishLevel || interests.length === 0 || !subject || !career}
                  >
                    သင့်တော်သော တက္ကသိုလ်များ ရှာဖွေမည်
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            <div className="flex justify-between items-center">
              <h2 className="text-2xl font-bold">Recommended Universities</h2>
              <Button variant="outline" onClick={() => setSubmitted(false)}>Back to Form</Button>
            </div>

            <div className="grid grid-cols-1 gap-6">
              {recommendations.length === 0 ? (
                <Card><CardContent className="p-10 text-center text-muted-foreground">No matches found. Try different options.</CardContent></Card>
              ) : (
                recommendations.map((item, index) => (
                  <Card key={item.university.id} className="overflow-hidden hover:shadow-xl transition-shadow border-l-4 border-l-primary">
                    <CardContent className="p-0">
                      <div className="flex flex-col md:flex-row">
                        {item.university.imageUrl && (
                          <div className="w-full md:w-48 h-48 md:h-auto overflow-hidden">
                            <img src={item.university.imageUrl} alt={item.university.name} className="w-full h-full object-cover" />
                          </div>
                        )}
                        <div className="p-6 flex-1">
                          <div className="flex justify-between items-start mb-2">
                            <Badge className="bg-primary text-primary-foreground font-bold px-3 py-1">#{index + 1}</Badge>
                            <div className="text-right">
                              <div className="text-2xl font-bold text-primary">{item.score}%</div>
                              <div className="text-xs text-muted-foreground uppercase font-semibold tracking-wider">Matching Score</div>
                            </div>
                          </div>

                          <h3 className="text-xl font-bold">{item.university.name}</h3>
                          <p className="text-muted-foreground text-sm mb-4">{item.university.nameEn}</p>

                          {item.reasons.length > 0 && (
                            <div className="bg-primary/5 rounded-lg p-4 mb-4">
                              <p className="text-sm font-bold mb-2 flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-primary" />
                                Why this may suit you:
                              </p>
                              <ul className="space-y-2">
                                {item.reasons.map((reason, rIdx) => (
                                  <li key={rIdx} className="text-sm flex items-start gap-2">
                                    <span className="text-primary mt-1">•</span>
                                    <span>{reason}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}

                          <div className="flex flex-wrap gap-2 mb-6">
                            {item.university.majors?.slice(0, 5).map(m => (
                              <Badge key={m.id} variant="outline" className="bg-background">{m.name}</Badge>
                            ))}
                          </div>

                          <Button asChild className="w-full md:w-auto">
                            <Link href={`/universities/${item.university.id}`}>View University Details</Link>
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
