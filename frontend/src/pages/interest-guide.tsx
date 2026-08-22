import { useMemo, useState } from "react";
import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { BrainCircuit, CheckCircle2, ChevronDown, ChevronUp, GitCompare, Route, Target, TrendingUp } from "lucide-react";

type CareerResult = { career: { id: string; title: string; titleMm: string; summary: string; requiredSkills: string[]; workPreferences: string[]; roadmap: string[]; path: string[] }; score: number; reasons: string[]; currentSkills: string[]; skillGaps: string[]; matchedKeywords: string[] };
type Analysis = { recommendations: CareerResult[]; evaluation: { accuracy: number | null; precision: number | null; recall: number | null; f1Score: number | null; userSatisfaction: number | null; acceptanceRate: number | null; note: string } };

const emptyMetrics = ["Accuracy", "Precision", "Recall", "F1-score", "User Satisfaction", "Acceptance Rate"];

export default function InterestGuide() {
  const [skills, setSkills] = useState("");
  const [interests, setInterests] = useState("");
  const [workPreferences, setWorkPreferences] = useState("");
  const [careerGoals, setCareerGoals] = useState("");
  const [experience, setExperience] = useState("");
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [compareIds, setCompareIds] = useState<string[]>([]);
  const [accepted, setAccepted] = useState<string[]>([]);

  const selected = useMemo(() => analysis?.recommendations.filter((item) => compareIds.includes(item.career.id)) || [], [analysis, compareIds]);
  const toggleCompare = (id: string) => setCompareIds((items) => items.includes(id) ? items.filter((item) => item !== id) : items.length < 3 ? [...items, id] : items);

  const analyze = async () => {
    setLoading(true); setError("");
    try {
      const response = await fetch("/api/interest-guide/analyze", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ skills, interests, workPreferences, careerGoals, experience }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Recommendation မအောင်မြင်ပါ။");
      setAnalysis(data); setCompareIds([]); setAccepted([]); setExpanded(data.recommendations?.[0]?.career.id || null);
    } catch (e) { setError(e instanceof Error ? e.message : "တစ်စုံတစ်ရာ မှားယွင်းနေပါသည်။"); }
    finally { setLoading(false); }
  };

  const reset = () => { setAnalysis(null); setError(""); setCompareIds([]); setAccepted([]); };

  return <Layout><main className="mx-auto w-full max-w-6xl space-y-8 px-4 py-10 scrollbar-hide">
    <header className="text-center"><div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary"><BrainCircuit /></div><h1 className="text-3xl font-bold md:text-4xl">Career Interest Guide</h1><p className="mt-2 text-muted-foreground">AI မသုံးဘဲ NLP နှင့် Rule-based Recommendation ကို အသုံးပြုပြီး သင့်အတွက် သင့်တော်သော Career လမ်းကြောင်းကို ရှာဖွေပါ။</p></header>

    {!analysis ? <Card className="mx-auto max-w-4xl border-primary/15 shadow-lg"><CardHeader><CardTitle>သင့်အကြောင်း အချက်အလက်များ ဖြည့်ပါ</CardTitle><p className="text-sm text-muted-foreground">စာကြောင်းတိုတို သို့မဟုတ် စာပိုဒ်ဖြင့် မြန်မာ/အင်္ဂလိပ်လို ရေးနိုင်ပါသည်။ NLP သည် keyword နှင့် meaning group များကို ခွဲခြမ်းစိတ်ဖြာပါမည်။</p></CardHeader><CardContent className="grid gap-5 md:grid-cols-2">
      <Field label="လက်ရှိ Skills" placeholder="ဥပမာ - programming, problem solving, mathematics, Excel" value={skills} setValue={setSkills} />
      <Field label="စိတ်ဝင်စားမှုများ" placeholder="ဥပမာ - technology, data, design, လူများကို ကူညီခြင်း" value={interests} setValue={setInterests} />
      <Field label="Work Preference" placeholder="ဥပမာ - တစ်ဦးတည်းအာရုံစိုက်၊ team နဲ့လုပ်၊ research ကြိုက်" value={workPreferences} setValue={setWorkPreferences} />
      <Field label="Career Goal" placeholder="ဥပမာ - software developer ဖြစ်ချင်တယ်" value={careerGoals} setValue={setCareerGoals} />
      <div className="md:col-span-2"><Field label="အတွေ့အကြုံ / ပညာရေး (ရွေးချယ်နိုင်သည်)" placeholder="ဥပမာ - ကျောင်း project နှစ်ခုလုပ်ဖူးပြီး beginner အဆင့်ပါ" value={experience} setValue={setExperience} /></div>
      {error && <div className="md:col-span-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
      <Button className="h-12 text-base md:col-span-2" onClick={analyze} disabled={loading || [skills, interests, workPreferences, careerGoals, experience].join(" ").trim().length < 5}>{loading ? "NLP ခွဲခြမ်းစိတ်ဖြာနေသည်..." : "Career Recommendation ရှာမည်"}</Button>
    </CardContent></Card> : <>
      <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="text-2xl font-bold">သင့်အတွက် အကောင်းဆုံး Career ၃ ခု</h2><p className="text-sm text-muted-foreground">သင့်အချက်အလက်တွေကို အခြေခံပြီး သင့်တော်မှုအလိုက် စီထားပါတယ်</p></div><Button variant="outline" onClick={reset}>ပြန်စတင်မည်</Button></div>
      <section className="grid gap-5 lg:grid-cols-2">{analysis.recommendations.map((item, index) => { const isOpen = expanded === item.career.id; const isAccepted = accepted.includes(item.career.id); return <Card key={item.career.id} className={`overflow-hidden border-l-4 ${index === 0 ? "border-l-primary shadow-lg" : "border-l-primary/40"}`}><CardContent className="p-5"><div className="flex items-start justify-between gap-4"><div className="flex min-w-0 items-start gap-3"><Badge className="mt-1 shrink-0">#{index + 1}</Badge><div><h3 className="text-xl font-bold">{item.career.titleMm}</h3><p className="text-sm text-muted-foreground">{item.career.title}</p><p className="mt-2 text-sm">{item.career.summary}</p></div></div><div className="shrink-0 text-right"><div className="text-3xl font-black text-primary">{item.score}%</div><div className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Career Match</div></div></div><div className="mt-4 h-2 overflow-hidden rounded-full bg-muted"><div className="h-full rounded-full bg-primary transition-all" style={{ width: `${item.score}%` }} /></div><div className="mt-4 rounded-lg border border-primary/15 bg-primary/5 p-3"><h4 className="mb-2 flex items-center gap-2 text-sm font-bold"><Target className="h-4 w-4 text-primary" />ဘာကြောင့် သင့်တော်တာလဲ?</h4><ul className="space-y-1 text-sm text-muted-foreground">{item.reasons.map((reason, reasonIndex) => <li key={reasonIndex}>• {reason}</li>)}</ul></div><div className="mt-4 flex flex-wrap gap-2"><Button size="sm" variant={compareIds.includes(item.career.id) ? "default" : "outline"} onClick={() => toggleCompare(item.career.id)}><GitCompare className="mr-1 h-4 w-4" />Compare</Button><Button size="sm" variant="ghost" onClick={() => setExpanded(isOpen ? null : item.career.id)}>{isOpen ? <ChevronUp /> : <ChevronDown />}အသေးစိတ်</Button><Button size="sm" variant={isAccepted ? "default" : "outline"} onClick={() => setAccepted((items) => isAccepted ? items.filter((id) => id !== item.career.id) : [...items, item.career.id])}><CheckCircle2 className="mr-1 h-4 w-4" />စိတ်ဝင်စားသည်</Button></div>{isOpen && <CareerDetails item={item} />}</CardContent></Card>})}</section>
      {selected.length >= 2 && <Comparison careers={selected} />}
      <Evaluation metrics={analysis.evaluation} accepted={accepted.length} total={analysis.recommendations.length} />
    </>}
  </main></Layout>;
}

function Field({ label, placeholder, value, setValue }: { label: string; placeholder: string; value: string; setValue: (value: string) => void }) { return <div className="space-y-2"><label className="text-sm font-semibold">{label}</label><Textarea value={value} onChange={(e) => setValue(e.target.value)} placeholder={placeholder} className="min-h-24 resize-y" /></div>; }
function CareerDetails({ item }: { item: CareerResult }) { return <div className="mt-5 space-y-5 border-t pt-5"><div><h4 className="mb-2 font-bold">Skill Gap Analysis</h4><div className="flex flex-wrap gap-2">{item.currentSkills.map((skill) => <Badge key={skill} variant="secondary">လက်ရှိ: {skill}</Badge>)}{item.skillGaps.map((skill) => <Badge key={skill} variant="outline" className="border-amber-500/50 text-amber-700">လိုအပ်: {skill}</Badge>)}</div>{!item.skillGaps.length && <p className="mt-2 text-sm text-green-600">လိုအပ်သော skill အားလုံးနှင့် ကိုက်ညီပါသည်။</p>}</div><div><h4 className="mb-2 flex items-center gap-2 font-bold"><Route className="h-4 w-4 text-primary" />Personalized Learning Roadmap</h4><ol className="space-y-2 text-sm">{item.career.roadmap.map((step, i) => <li key={step} className="flex gap-2"><span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-bold text-primary">{i + 1}</span>{step}</li>)}</ol></div><div><h4 className="mb-2 font-bold">Career Path Visualization</h4><div className="flex flex-wrap items-center gap-2">{item.career.path.map((step, i) => <span key={step} className="flex items-center gap-2"><Badge variant={i === 0 ? "default" : "outline"}>{step}</Badge>{i < item.career.path.length - 1 && <span className="text-muted-foreground">→</span>}</span>)}</div></div><div><h4 className="mb-2 font-bold">Personality / Interest Fit</h4><p className="text-sm text-muted-foreground">သင့်စိတ်ဝင်စားမှုနဲ့ အလုပ်လုပ်ချင်တဲ့ပုံစံကို ဒီအလုပ်နဲ့ ကိုက်ညီအောင် စစ်ထားပါတယ်။</p></div></div>; }
function Comparison({ careers }: { careers: CareerResult[] }) { return <Card className="border-primary/20"><CardHeader><CardTitle className="flex items-center gap-2"><GitCompare className="h-5 w-5 text-primary" />Career Comparison</CardTitle><p className="text-sm text-muted-foreground">Career နှစ်ခု သို့မဟုတ် သုံးခုကို နှိုင်းယှဉ်ကြည့်ပါ။</p></CardHeader><CardContent className="overflow-x-auto"><div className="grid min-w-[720px] gap-3" style={{ gridTemplateColumns: `repeat(${careers.length}, minmax(0, 1fr))` }}>{careers.map((item) => <div key={item.career.id} className="rounded-lg bg-muted/40 p-4"><h3 className="font-bold">{item.career.titleMm}</h3><div className="my-2 text-2xl font-black text-primary">{item.score}%</div><p className="text-sm">Skill gaps: {item.skillGaps.length}</p><p className="text-sm">Roadmap: {item.career.roadmap.length} steps</p><p className="mt-2 text-xs text-muted-foreground">{item.career.workPreferences.join(" • ")}</p></div>)}</div></CardContent></Card>; }
function Evaluation({ metrics, accepted, total }: { metrics: Analysis["evaluation"]; accepted: number; total: number }) { const values: Record<string, number | null> = { Accuracy: metrics.accuracy, Precision: metrics.precision, Recall: metrics.recall, "F1-score": metrics.f1Score, "User Satisfaction": metrics.userSatisfaction, "Acceptance Rate": total ? Math.round((accepted / total) * 100) : metrics.acceptanceRate }; return <Card><CardHeader><CardTitle className="flex items-center gap-2"><TrendingUp className="h-5 w-5 text-primary" />Recommendation Evaluation</CardTitle><p className="text-sm text-muted-foreground">စနစ်၏ quality ကို user feedback နှင့် အတည်ပြုထားသော label များ စုဆောင်းပြီး တိုင်းတာရန် dashboard ဖြစ်ပါသည်။</p></CardHeader><CardContent className="grid grid-cols-2 gap-3 md:grid-cols-3">{emptyMetrics.map((label) => <div key={label} className="rounded-lg border bg-muted/20 p-3"><div className="text-xs text-muted-foreground">{label}</div><div className="mt-1 text-xl font-bold">{values[label] == null ? "မတိုင်းရသေး" : `${values[label]}%`}</div></div>)}</CardContent></Card>; }
