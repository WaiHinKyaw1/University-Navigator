import { Building2, ExternalLink, GitCompareArrows, MapPin, X } from "lucide-react";
import { Link } from "wouter";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Layout } from "@/components/layout";
import {
  MAX_COMPARE_UNIVERSITIES,
  useCompare,
} from "@/hooks/use-compare";

const TYPE_LABEL: Record<string, string> = {
  government: "အစိုးရ",
  private: "ပုဂ္ဂလိက",
  technical: "နည်းပညာ",
  medical: "ဆေးပညာ",
  education: "ပညာရေး",
  business: "စီးပွားရေး",
  law: "ဥပဒေ",
  distance: "အဝေးသင်",
};

function ComparisonRow({
  label,
  values,
}: {
  label: string;
  values: React.ReactNode[];
}) {
  return (
    <div className="grid border-t border-border/70" style={{ gridTemplateColumns: `minmax(150px, 0.8fr) repeat(${values.length}, minmax(190px, 1fr))` }}>
      <div className="bg-muted/30 px-4 py-4 text-sm font-semibold text-muted-foreground">
        {label}
      </div>
      {values.map((value, index) => (
        <div key={`${label}-${index}`} className="px-4 py-4 text-sm text-foreground">
          {value}
        </div>
      ))}
    </div>
  );
}

export default function Compare() {
  const { universities, removeUniversity, clearUniversities } = useCompare();

  return (
    <Layout>
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-7xl space-y-5 px-4 py-6 sm:space-y-6 sm:py-8 md:px-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2 text-primary">
                <GitCompareArrows className="h-5 w-5" />
                <span className="text-sm font-semibold">တက္ကသိုလ်နှိုင်းယှဉ်ခြင်း</span>
              </div>
              <h1 className="text-2xl font-bold text-foreground md:text-3xl">
                University Compare
              </h1>
              <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
                တက္ကသိုလ် {MAX_COMPARE_UNIVERSITIES} ခုအထိ အချက်အလက်တွေကို တစ်နေရာတည်းမှာ ဘေးချင်းယှဉ်ကြည့်ပါ။
              </p>
            </div>
            {universities.length > 0 && (
              <Button variant="outline" className="w-full sm:w-auto" onClick={clearUniversities}>
                အားလုံးဖယ်မယ်
              </Button>
            )}
          </div>

          {universities.length < 2 ? (
            <Card className="border-dashed border-primary/30 bg-card">
              <CardContent className="flex flex-col items-center justify-center px-6 py-16 text-center">
                <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                  <GitCompareArrows className="h-8 w-8" />
                </div>
                <h2 className="text-lg font-bold text-foreground">
                  နှိုင်းယှဉ်ရန် တက္ကသိုလ် အနည်းဆုံး ၂ ခုရွေးပါ
                </h2>
                <p className="mt-2 max-w-md text-sm leading-6 text-muted-foreground">
                  Universities စာမျက်နှာက တက္ကသိုလ်ကတ်တွေမှာရှိတဲ့ “Compare” ခလုတ်ကို နှိပ်ပြီး တက္ကသိုလ် ၂ ခုမှ ၄ ခုအထိ ရွေးနိုင်ပါတယ်။
                </p>
                <Button asChild className="mt-6">
                  <Link href="/universities">တက္ကသိုလ်များကို ကြည့်မယ်</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <Card className="overflow-hidden border-border/70 shadow-sm">
              <CardContent className="overflow-x-auto p-0 [scrollbar-width:thin]">
                <div className="min-w-[910px] pb-2 touch-pan-x">
                  <div
                    className="grid bg-card"
                    style={{ gridTemplateColumns: `minmax(150px, 0.8fr) repeat(${universities.length}, minmax(190px, 1fr))` }}
                  >
                    <div className="flex items-center gap-2 px-4 py-5 text-sm font-bold text-muted-foreground">
                      <GitCompareArrows className="h-4 w-4 text-primary" />
                      နှိုင်းယှဉ်ချက်
                    </div>
                    {universities.map((university) => (
                      <div key={university.id} className="relative border-l border-border/70 px-4 py-4">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="touch-target absolute right-2 top-2 h-9 w-9 text-muted-foreground hover:text-destructive"
                          onClick={() => removeUniversity(university.id)}
                          aria-label={`${university.name} ကို နှိုင်းယှဉ်မှုမှ ဖယ်မယ်`}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                        <div className="mb-3 flex h-20 items-center justify-center overflow-hidden rounded-xl bg-muted/40 sm:h-24">
                          {university.imageUrl ? (
                            <img
                              src={university.imageUrl}
                              alt={university.name}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <Building2 className="h-8 w-8 text-muted-foreground/40" />
                          )}
                        </div>
                        <h2 className="line-clamp-2 pr-6 text-sm font-bold leading-5 text-foreground">
                          {university.name}
                        </h2>
                        <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">
                          {university.nameEn}
                        </p>
                        <Button asChild variant="link" size="sm" className="mt-1 h-auto px-0 text-xs">
                          <Link href={`/universities/${university.id}`}>
                            အသေးစိတ်ကြည့်ရန် <ExternalLink className="ml-1 h-3 w-3" />
                          </Link>
                        </Button>
                      </div>
                    ))}
                  </div>

                  <ComparisonRow
                    label="အမျိုးအစား"
                    values={universities.map((university) => (
                      <Badge key={university.id} variant="secondary">
                        {TYPE_LABEL[university.type] ?? university.type}
                      </Badge>
                    ))}
                  />
                  <ComparisonRow
                    label="တည်နေရာ"
                    values={universities.map((university) => (
                      <span key={university.id} className="flex items-center gap-1.5">
                        <MapPin className="h-4 w-4 shrink-0 text-primary" />
                        {university.city ? `${university.city}, ${university.state}` : university.state}
                      </span>
                    ))}
                  />
                  <ComparisonRow
                    label="လိုအပ်ရမှတ်"
                    values={universities.map((university) => (
                      <span key={university.id} className="font-bold text-primary">
                        {university.minScore} မှတ်
                      </span>
                    ))}
                  />
                  <ComparisonRow
                    label="သင်ကြားပေးသော ဘာသာရပ်များ"
                    values={universities.map((university) => (
                      <span key={university.id} className="leading-6">
                        {university.majors?.length
                          ? university.majors.map((major) => major.name).join("၊ ")
                          : "အချက်အလက် မရှိသေးပါ"}
                      </span>
                    ))}
                  />
                  <ComparisonRow
                    label="အကြောင်းအရာ"
                    values={universities.map((university) => (
                      <span key={university.id} className="leading-6 text-muted-foreground">
                        {university.description || "အချက်အလက် မရှိသေးပါ"}
                      </span>
                    ))}
                  />
                  <ComparisonRow
                    label="Website"
                    values={universities.map((university) =>
                      university.website ? (
                        <a
                          key={university.id}
                          href={university.website}
                          target="_blank"
                          rel="noreferrer"
                          className="break-all text-primary underline-offset-4 hover:underline"
                        >
                          Website ဖွင့်မယ်
                        </a>
                      ) : (
                        <span key={university.id} className="text-muted-foreground">
                          မရှိသေးပါ
                        </span>
                      ),
                    )}
                  />
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </Layout>
  );
}
