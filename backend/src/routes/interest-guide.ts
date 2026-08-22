import { Router, type IRouter } from "express";
import { db, interestGuideOptionsTable } from "@workspace/db";
import { eq, asc } from "drizzle-orm";
import { requireAdmin } from "../middlewares/auth";
import { GoogleGenerativeAI } from "@google/generative-ai";

const router: IRouter = Router();

type Career = {
  id: string;
  title: string;
  titleMm: string;
  summary: string;
  keywords: string[];
  requiredSkills: string[];
  workPreferences: string[];
  roadmap: string[];
  path: string[];
};

const CAREERS: Career[] = [
  { id: "football-player", title: "Professional Football Player", titleMm: "ပရော်ဖက်ရှင်နယ် ဘောလုံးသမား", summary: "ဘောလုံးလေ့ကျင့်မှု၊ ပြိုင်ပွဲနှင့် အားကစားစွမ်းရည် တိုးတက်အောင်လုပ်ခြင်း", keywords: ["football", "footballer", "soccer", "sport", "sports", "player", "athlete", "ဘောလုံး", "အားကစား", "အားကစားသမား", "ဘောလုံးသမား", "ပြိုင်ပွဲ"], requiredSkills: ["Ball Control", "Fitness", "Teamwork", "Discipline", "Game Awareness"], workPreferences: ["Teamwork", "Active work", "Competition"], roadmap: ["နေ့စဉ် ball control နှင့် fitness လေ့ကျင့်ပါ", "အသင်းတစ်သင်းတွင် training နှင့် match များ ဝင်ပါ", "Coach ထံမှ feedback ရယူပြီး ကိုယ်ပိုင်အားသာချက်ကို တိုးတက်ပါ", "ပြိုင်ပွဲနှင့် trial များမှတစ်ဆင့် အတွေ့အကြုံစုပါ"], path: ["Youth Player", "Club Player", "Professional Player", "Team Captain"] },
  { id: "software-developer", title: "Software Developer", titleMm: "ဆော့ဖ်ဝဲ Developer", summary: "ဆော့ဖ်ဝဲ၊ website နှင့် application များ တည်ဆောက်ခြင်း", keywords: ["programming", "coding", "software", "computer", "technology", "app", "web", "logic", "နည်းပညာ", "ကွန်ပျူတာ", "ပရိုဂရမ်", "ဆော့ဖ်ဝဲ"], requiredSkills: ["Programming", "Problem Solving", "Git", "Database", "Testing"], workPreferences: ["တစ်ဦးတည်းအာရုံစိုက်လုပ်ကိုင်ခြင်း", "Project-based", "နည်းပညာအသုံးချခြင်း"], roadmap: ["Programming fundamentals နှင့် Git ကို လေ့လာပါ", "HTML/CSS/JavaScript သို့မဟုတ် Python project သုံးခု ပြုလုပ်ပါ", "Database, API နှင့် testing ကို လေ့လာပါ", "Portfolio နှင့် internship အတွက် ပြင်ဆင်ပါ"], path: ["Junior Developer", "Mid-level Developer", "Senior Developer", "Tech Lead"] },
  { id: "data-analyst", title: "Data Analyst", titleMm: "ဒေတာခွဲခြမ်းစိတ်ဖြာသူ", summary: "ဒေတာများမှ အဓိပ္ပာယ်ရှိသော insight နှင့် ဆုံးဖြတ်ချက်များ ထုတ်ယူခြင်း", keywords: ["data", "analysis", "statistics", "math", "excel", "research", "သင်္ချာ", "ဒေတာ", "ခွဲခြမ်း", "စာရင်း"], requiredSkills: ["Excel/Sheets", "SQL", "Statistics", "Data Visualization", "Communication"], workPreferences: ["Research", "Numbers", "တိတ်ဆိတ်စွာ ခွဲခြမ်းခြင်း"], roadmap: ["Excel/Sheets နှင့် basic statistics ကို လေ့လာပါ", "SQL ဖြင့် dataset များကို query လုပ်ပါ", "Dashboard နှင့် data visualization ပြုလုပ်ပါ", "Real-world data project ဖြင့် portfolio တည်ဆောက်ပါ"], path: ["Junior Data Analyst", "Data Analyst", "Senior Data Analyst", "Analytics Lead"] },
  { id: "ui-ux-designer", title: "UI/UX Designer", titleMm: "UI/UX ဒီဇိုင်နာ", summary: "အသုံးပြုသူအတွက် လွယ်ကူပြီး လှပသော digital product အတွေ့အကြုံ ဒီဇိုင်းဆွဲခြင်း", keywords: ["design", "creative", "drawing", "art", "user", "figma", "visual", "ဒီဇိုင်း", "ပန်းချီ", "ဖန်တီးမှု"], requiredSkills: ["User Research", "Wireframing", "Figma", "Visual Design", "Prototyping"], workPreferences: ["Creative", "User-focused", "Team collaboration"], roadmap: ["Design principles နှင့် Figma ကို လေ့လာပါ", "User interview နှင့် wireframe လေ့ကျင့်ပါ", "Prototype နှင့် usability test ပြုလုပ်ပါ", "Case study သုံးခုပါ portfolio တည်ဆောက်ပါ"], path: ["Junior Designer", "Product Designer", "Senior UX Designer", "Design Lead"] },
  { id: "cybersecurity-analyst", title: "Cybersecurity Analyst", titleMm: "Cybersecurity Analyst", summary: "စနစ်နှင့် network များကို လုံခြုံအောင် စောင့်ကြည့်ကာကွယ်ခြင်း", keywords: ["security", "cyber", "network", "risk", "defense", "technology", "computer", "နည်းပညာ", "ကွန်ပျူတာ", "လုံခြုံ", "ဆိုက်ဘာ", "ကွန်ရက်"], requiredSkills: ["Networking", "Linux", "Security Fundamentals", "Risk Analysis", "Incident Response"], workPreferences: ["Investigation", "Problem Solving", "စည်းမျဉ်းစနစ်တကျ"], roadmap: ["Networking နှင့် Linux အခြေခံ လေ့လာပါ", "Security principles နှင့် common attacks ကို လေ့လာပါ", "Lab environment ဖြင့် incident response လေ့ကျင့်ပါ", "Security portfolio နှင့် certification roadmap ပြုလုပ်ပါ"], path: ["SOC Analyst", "Security Analyst", "Senior Security Analyst", "Security Lead"] },
  { id: "teacher", title: "Teacher / Education Specialist", titleMm: "ဆရာ/ဆရာမနှင့် ပညာရေးအထူးပြု", summary: "သင်ယူသူများကို နားလည်လွယ်အောင် သင်ကြားလမ်းညွှန်ခြင်း", keywords: ["teacher", "teaching", "education", "help", "communication", "ဆရာ", "သင်ကြား", "ပညာရေး", "ကူညီ"], requiredSkills: ["Communication", "Subject Knowledge", "Lesson Planning", "Empathy", "Presentation"], workPreferences: ["လူများနှင့် အလုပ်လုပ်ခြင်း", "Mentoring", "Community impact"], roadmap: ["သင်ကြားရေးနှင့် communication အခြေခံ လေ့လာပါ", "Lesson plan နှင့် presentation လေ့ကျင့်ပါ", "Volunteer tutoring ပြုလုပ်ပါ", "Teaching portfolio နှင့် classroom experience တည်ဆောက်ပါ"], path: ["Teaching Assistant", "Teacher", "Senior Teacher", "Head of Department"] },
  { id: "business-analyst", title: "Business Analyst", titleMm: "စီးပွားရေးခွဲခြမ်းစိတ်ဖြာသူ", summary: "လုပ်ငန်းလိုအပ်ချက်များကို နားလည်ပြီး solution များ ချိတ်ဆက်ပေးခြင်း", keywords: ["business", "management", "finance", "marketing", "communication", "စီးပွား", "စီမံ", "ဘဏ္ဍာ", "ဈေးကွက်"], requiredSkills: ["Business Analysis", "Communication", "Excel", "Requirements", "Presentation"], workPreferences: ["လူများနှင့် ဆက်သွယ်ခြင်း", "Planning", "Problem Solving"], roadmap: ["Business fundamentals နှင့် Excel ကို လေ့လာပါ", "Requirement gathering နှင့် process mapping လေ့ကျင့်ပါ", "Presentation နှင့် stakeholder communication တိုးတက်ပါ", "Case study ဖြင့် portfolio ပြုလုပ်ပါ"], path: ["Business Analyst Intern", "Business Analyst", "Senior Business Analyst", "Product/Strategy Lead"] },
];

function normalize(value: unknown): string { return String(value || "").toLowerCase().replace(/[၊,.;:!?()[\]{}]/g, " ").replace(/\s+/g, " ").trim(); }
function hasTerm(text: string, term: string): boolean { return text.includes(normalize(term)); }
function simpleLabel(keyword: string): string {
  const value = normalize(keyword);
  if (["programming", "coding", "software", "computer", "technology", "app", "web", "နည်းပညာ", "ကွန်ပျူတာ", "ပရိုဂရမ်", "ဆော့ဖ်ဝဲ"].some((item) => value.includes(item))) return "နည်းပညာနဲ့ Programming";
  if (["data", "analysis", "statistics", "math", "သင်္ချာ", "ဒေတာ", "ခွဲခြမ်း"].some((item) => value.includes(item))) return "ဒေတာနဲ့ သင်္ချာ";
  if (["design", "creative", "drawing", "art", "ဒီဇိုင်း", "ပန်းချီ", "ဖန်တီးမှု"].some((item) => value.includes(item))) return "ဒီဇိုင်းနဲ့ ဖန်တီးမှု";
  if (["security", "cyber", "network", "လုံခြုံ", "ဆိုက်ဘာ", "ကွန်ရက်"].some((item) => value.includes(item))) return "အွန်လိုင်းလုံခြုံရေး";
  if (["teacher", "teaching", "education", "ဆရာ", "သင်ကြား", "ပညာရေး"].some((item) => value.includes(item))) return "သင်ကြားရေးနဲ့ လူတွေကို ကူညီခြင်း";
  if (["business", "management", "finance", "marketing", "စီးပွား", "စီမံ", "ဘဏ္ဍာ", "ဈေးကွက်"].some((item) => value.includes(item))) return "စီးပွားရေးနဲ့ စီမံခန့်ခွဲမှု";
  return keyword;
}
function analyzeCareer(career: Career, profile: { skills: string; interests: string; workPreferences: string; careerGoals: string; experience: string }) {
  const fields = { skills: normalize(profile.skills), interests: normalize(profile.interests), workPreferences: normalize(profile.workPreferences), careerGoals: normalize(profile.careerGoals), experience: normalize(profile.experience) };
  const allText = Object.values(fields).join(" ");
  const matched = career.keywords.filter((keyword) => hasTerm(allText, keyword));
  const skillMatches = career.requiredSkills.filter((skill) => hasTerm(fields.skills, skill) || hasTerm(fields.skills, skill.split("/")[0]));
  const goalMatches = career.keywords.filter((keyword) => hasTerm(fields.careerGoals, keyword));
  const interestMatches = career.keywords.filter((keyword) => hasTerm(fields.interests, keyword));
  const preferenceMatches = career.workPreferences.filter((preference) => hasTerm(fields.workPreferences, preference) || fields.workPreferences.includes(normalize(preference).split(" ")[0]));
  const weighted = skillMatches.length * 12 + interestMatches.length * 10 + goalMatches.length * 22 + preferenceMatches.length * 8;
  const score = Math.min(96, Math.max(28, Math.round(32 + weighted)));
  const labels = [...new Set([...goalMatches, ...interestMatches].slice(0, 3).map(simpleLabel))];
  const reasons: string[] = [];
  if (goalMatches.length) reasons.push(`သင်ဖြစ်ချင်တဲ့အလုပ်နဲ့ တိုက်ရိုက်ကိုက်ညီပါတယ်။`);
  if (skillMatches.length) reasons.push(`သင့်မှာရှိတဲ့ ${skillMatches.slice(0, 2).join(" နဲ့ ")} ကို ဒီအလုပ်မှာ အသုံးချနိုင်ပါတယ်။`);
  else if (labels.length) reasons.push(`သင်စိတ်ဝင်စားတဲ့ ${labels[0]} နဲ့ ဒီအလုပ်က နီးစပ်ပါတယ်။`);
  if (preferenceMatches.length) reasons.push(`သင်ကြိုက်တဲ့ အလုပ်လုပ်ပုံနဲ့လည်း ကိုက်ညီပါတယ်။`);
  if (!reasons.length) reasons.push(`${career.titleMm} ကို စိတ်ဝင်စားရင် ${career.requiredSkills[0]} ကနေ စတင်လေ့လာနိုင်ပါတယ်။`);
  const currentSkills = skillMatches;
  const skillGaps = career.requiredSkills.filter((skill) => !currentSkills.includes(skill));
  return { career: { id: career.id, title: career.title, titleMm: career.titleMm, summary: career.summary, requiredSkills: career.requiredSkills, workPreferences: career.workPreferences, roadmap: career.roadmap, path: career.path }, score, reasons: reasons.slice(0, 3), currentSkills, skillGaps, matchedKeywords: matched };
}

async function refineWithAI(profile: { skills: string; interests: string; workPreferences: string; careerGoals: string; experience: string }, candidates: ReturnType<typeof analyzeCareer>[]) {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || !candidates.length) return candidates;
  try {
    const model = new GoogleGenerativeAI(apiKey).getGenerativeModel({ model: process.env.GEMINI_MODEL?.trim() || "gemini-2.0-flash", generationConfig: { responseMimeType: "application/json", temperature: 0.2 } });
    const allowed = candidates.map((item) => ({ id: item.career.id, title: item.career.titleMm, localScore: item.score, matched: item.matchedKeywords }));
    const prompt = `သင်သည် Myanmar career advisor ဖြစ်သည်။ Local NLP က ရွေးထားသော အောက်ပါ Career များထဲမှသာ အကောင်းဆုံး ၃ ခုအထိ ရွေးပါ။ Career အသစ် မဖန်တီးရ။ User profile ကို နားလည်ပြီး တစ်ခုချင်းစီအတွက် မတူညီသော မြန်မာလို reason တစ်ကြောင်း သို့မဟုတ် နှစ်ကြောင်းရေးပါ။ Score သည် localScore ကို အခြေခံပြီး 0-100 အတွင်းသာ ဖြစ်ရမည်။ ထပ်နေသော reason မရေးရ။\nProfile: ${JSON.stringify(profile)}\nAllowed careers: ${JSON.stringify(allowed)}\nJSON array သာ ပြန်ပါ: [{"id":"allowed id","score":number,"reason":"ရိုးရှင်းသော မြန်မာစာ"}]`;
    const result = await model.generateContent(prompt);
    const raw = result.response.text().match(/\[[\s\S]*\]/)?.[0];
    if (!raw) return candidates;
    const aiItems = JSON.parse(raw) as Array<{ id?: string; score?: number; reason?: string }>;
    const byId = new Map(candidates.map((item) => [item.career.id, item]));
    const used = new Set<string>();
    const refined = aiItems.map((item) => { const base = item.id ? byId.get(item.id) : undefined; if (!base || used.has(base.career.id)) return null; used.add(base.career.id); const requestedScore = Number(item.score); const safeScore = Number.isFinite(requestedScore) ? Math.max(base.score - 8, Math.min(base.score + 8, requestedScore)) : base.score; return { ...base, score: Math.max(0, Math.min(100, Math.round(safeScore))), reasons: item.reason?.trim() ? [item.reason.trim()] : base.reasons }; }).filter((item): item is NonNullable<typeof item> => Boolean(item));
    return refined.length ? refined.slice(0, 3) : candidates;
  } catch (error) { console.error("Career AI refinement unavailable; using local NLP results:", error); return candidates; }
}

router.get("/interest-guide/options", async (_req, res) => {
  try { res.json(await db.select().from(interestGuideOptionsTable).where(eq(interestGuideOptionsTable.isActive, true)).orderBy(asc(interestGuideOptionsTable.category), asc(interestGuideOptionsTable.displayOrder))); }
  catch { res.status(500).json({ error: "Failed to load interest guide options" }); }
});

router.post("/interest-guide/analyze", async (req, res) => {
  try {
    const { text, skills = "", interests = "", workPreferences = "", careerGoals = "", experience = "" } = req.body || {};
    const combined = [text, skills, interests, workPreferences, careerGoals, experience].filter(Boolean).join(" ");
    if (normalize(combined).length < 5) { res.status(400).json({ error: "ကျေးဇူးပြု၍ သင့် skill၊ interest နှင့် career goal ကို အသေးစိတ်ရေးပါ။" }); return; }
    const freeText = String(text || "");
    const profile = { skills: String(skills || freeText), interests: String(interests || freeText), workPreferences: String(workPreferences || freeText), careerGoals: String(careerGoals || freeText), experience: String(experience) };
    const ranked = CAREERS.map((career) => analyzeCareer(career, profile)).sort((a, b) => b.score - a.score || a.career.title.localeCompare(b.career.title));
    let recommendations = ranked.filter((item) => item.matchedKeywords.length > 0).slice(0, 3);
    if (recommendations.length) recommendations = await refineWithAI(profile, recommendations);
    if (!recommendations.length) {
      const requestedGoal = profile.careerGoals.trim() || profile.interests.trim();
      recommendations = ranked.slice(0, 3).map((item) => ({ ...item, score: 20, reasons: [`သင်ရေးထားတဲ့ “${requestedGoal || "Career goal"}” ကို ဒီစနစ်မှာ တိတိကျကျ မတွေ့သေးပါ။`, `အနီးစပ်ဆုံးလမ်းကြောင်းကို ရွေးပြီး ${item.career.requiredSkills[0]} ကနေ စတင်လေ့လာနိုင်ပါတယ်။`] }));
    }
    res.json({ mode: "hybrid-nlp-ai", input: profile, recommendations, evaluation: { accuracy: null, precision: null, recall: null, f1Score: null, userSatisfaction: null, acceptanceRate: null, note: "အသုံးပြုသူ feedback စုဆောင်းပြီးမှ တိုင်းတာမည့် metric ဖြစ်ပါသည်။" } });
  } catch (error) { console.error("Career NLP analysis error:", error); res.status(500).json({ error: "Career recommendation မအောင်မြင်ပါ။ ထပ်မံကြိုးစားပါ။" }); }
});

router.post("/interest-guide/evaluate", async (req, res) => {
  const { recommended = [], accepted = [], relevant = [] } = req.body || {};
  const total = Math.max(1, recommended.length); const tp = relevant.length; const acceptedCount = accepted.length;
  const precision = tp / total; const recall = tp / Math.max(1, relevant.length || total); const f1 = precision + recall ? (2 * precision * recall) / (precision + recall) : 0;
  res.json({ accuracy: Math.round((acceptedCount / total) * 100), precision: Math.round(precision * 100), recall: Math.round(recall * 100), f1Score: Math.round(f1 * 100), userSatisfaction: null, acceptanceRate: Math.round((acceptedCount / total) * 100) });
});

router.get("/admin/interest-guide/options", requireAdmin, async (_req, res) => { try { res.json(await db.select().from(interestGuideOptionsTable).orderBy(asc(interestGuideOptionsTable.category), asc(interestGuideOptionsTable.displayOrder), asc(interestGuideOptionsTable.id))); } catch { res.status(500).json({ error: "Failed to load interest guide options" }); } });
router.post("/admin/interest-guide/options", requireAdmin, async (req, res) => { try { const { category, code, name, description, displayOrder, isActive } = req.body; if (!category || !code || !name) { res.status(400).json({ error: "Category, code and name are required" }); return; } const [created] = await db.insert(interestGuideOptionsTable).values({ category: String(category).trim(), code: String(code).trim(), name: String(name).trim(), description: description ? String(description).trim() : null, displayOrder: displayOrder == null ? 0 : Number(displayOrder), isActive: isActive == null ? true : Boolean(isActive) }).returning(); res.status(201).json(created); } catch { res.status(500).json({ error: "Failed to create interest guide option" }); } });
router.put("/admin/interest-guide/options/:id", requireAdmin, async (req, res) => { try { const id = Number(req.params.id); const { category, code, name, description, displayOrder, isActive } = req.body; if (!Number.isInteger(id) || !category || !code || !name) { res.status(400).json({ error: "Invalid option data" }); return; } const [updated] = await db.update(interestGuideOptionsTable).set({ category: String(category).trim(), code: String(code).trim(), name: String(name).trim(), description: description ? String(description).trim() : null, displayOrder: displayOrder == null ? 0 : Number(displayOrder), isActive: isActive == null ? true : Boolean(isActive) }).where(eq(interestGuideOptionsTable.id, id)).returning(); if (!updated) { res.status(404).json({ error: "Interest guide option not found" }); return; } res.json(updated); } catch { res.status(500).json({ error: "Failed to update interest guide option" }); } });
router.delete("/admin/interest-guide/options/:id", requireAdmin, async (req, res) => { try { const id = Number(req.params.id); const [deleted] = await db.delete(interestGuideOptionsTable).where(eq(interestGuideOptionsTable.id, id)).returning(); if (!deleted) { res.status(404).json({ error: "Interest guide option not found" }); return; } res.json({ message: "Interest guide option deleted" }); } catch { res.status(500).json({ error: "Failed to delete interest guide option" }); } });

export default router;
