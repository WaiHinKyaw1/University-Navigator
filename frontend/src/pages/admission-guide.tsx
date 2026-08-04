import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import {
  FileText,
  Download,
  Calendar,
  HardDrive,
  ExternalLink,
  BookOpen,
  AlertCircle,
  CheckCircle2,
  Clock,
} from "lucide-react";
import { motion } from "framer-motion";
import { useEffect, useState } from "react";

interface GuideInfo {
  id: number;
  title: string;
  fileName: string;
  fileSize: number;
  academicYear?: string | null;
  createdAt: string;
  uploadedByName?: string | null;
  downloadUrl: string;
  isActive: boolean;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function AdmissionGuide() {
  const [guides, setGuides] = useState<GuideInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);

  useEffect(() => {
    setIsLoading(true);
    fetch("/api/admission-guides")
      .then((r) => {
        if (!r.ok) throw new Error("Failed to fetch");
        return r.json();
      })
      .then((data) => {
        setGuides(data?.guides ?? []);
        setIsLoading(false);
      })
      .catch(() => {
        setIsError(true);
        setIsLoading(false);
      });
  }, []);

  return (
    <Layout>
      <div className="min-h-[70vh] flex flex-col">
        {/* Hero Banner */}
        <section className="w-full py-16 md:py-20 bg-primary text-primary-foreground relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] mix-blend-overlay" />
          <div className="container relative z-10 text-center px-4 md:px-6 max-w-3xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="flex flex-col items-center gap-4"
            >
              <div className="w-16 h-16 bg-primary-foreground/10 rounded-2xl flex items-center justify-center">
                <BookOpen className="h-8 w-8 text-primary-foreground" />
              </div>
              <h1 className="text-4xl md:text-5xl font-bold tracking-tight">
                ဝင်ခွင့် လမ်းညွှန် PDF များ
              </h1>
              <p className="text-lg md:text-xl opacity-90 max-w-xl">
                ပညာရေးဝန်ကြီးဌာနထုတ် တက္ကသိုလ်ဝင်ခွင့် လမ်းညွှန်များကို ဒေါင်းလုတ်ရယူပါ
              </p>
            </motion.div>
          </div>
        </section>

        {/* Content */}
        <section className="flex-1 w-full py-12 md:py-20 bg-background">
          <div className="container px-4 md:px-6 max-w-3xl mx-auto space-y-6">
            {isLoading ? (
              <LoadingSkeleton />
            ) : isError ? (
              <ErrorCard />
            ) : guides.length === 0 ? (
              <NoGuideCard />
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.4 }}
                className="space-y-4"
              >
                <p className="text-sm text-muted-foreground">
                  PDF လမ်းညွှန် {guides.length} ခု ရှိပါသည်
                </p>
                {guides.map((guide, i) => (
                  <motion.div
                    key={guide.id}
                    initial={{ opacity: 0, y: 16 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.4, delay: i * 0.07 }}
                  >
                    <GuideCard guide={guide} />
                  </motion.div>
                ))}
              </motion.div>
            )}
          </div>
        </section>
      </div>
    </Layout>
  );
}

/* ------------------------------------------------------------------ */
/*  Sub-components                                                       */
/* ------------------------------------------------------------------ */

function LoadingSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-2xl border bg-card p-8 shadow-sm animate-pulse space-y-4">
          <div className="h-6 w-1/2 bg-muted rounded" />
          <div className="h-4 w-1/3 bg-muted rounded" />
          <div className="h-4 w-1/4 bg-muted rounded" />
          <div className="mt-6 h-10 w-36 bg-muted rounded" />
        </div>
      ))}
    </div>
  );
}

function NoGuideCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="rounded-2xl border bg-card p-10 shadow-sm flex flex-col items-center gap-4 text-center"
    >
      <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
        <AlertCircle className="h-7 w-7 text-muted-foreground" />
      </div>
      <h2 className="text-xl font-semibold">PDF လမ်းညွှန် မရှိသေး</h2>
      <p className="text-muted-foreground max-w-sm">
        ဝင်ခွင့် လမ်းညွှန် PDF များ မတင်ရသေးပါ။ နောက်မှ ပြန်စစ်ကြည့်ပါ။
      </p>
    </motion.div>
  );
}

function ErrorCard() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="rounded-2xl border border-destructive/30 bg-card p-10 shadow-sm flex flex-col items-center gap-4 text-center"
    >
      <div className="w-14 h-14 rounded-full bg-destructive/10 flex items-center justify-center">
        <AlertCircle className="h-7 w-7 text-destructive" />
      </div>
      <h2 className="text-xl font-semibold">ဆက်သွယ်မှု မအောင်မြင်ပါ</h2>
      <p className="text-muted-foreground max-w-sm">
        Data ရယူ၍ မရပါ။ ကွန်ယက်ချိတ်ဆက်မှု စစ်ကြည့်ပြီး ပြန်လည် ကြိုးစားပါ။
      </p>
    </motion.div>
  );
}

function GuideCard({ guide }: { guide: GuideInfo }) {
  return (
    <div className="rounded-2xl border bg-card shadow-sm overflow-hidden">
      {/* Active badge strip */}
      {guide.isActive && (
        <div className="bg-primary h-1 w-full" />
      )}

      {/* Card header strip */}
      <div className="bg-primary/5 border-b px-6 py-4 flex items-center gap-3">
        <div className="w-10 h-10 bg-primary/10 text-primary rounded-xl flex items-center justify-center shrink-0">
          <FileText className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <p className="font-semibold text-base leading-tight truncate">
              {guide.title}
            </p>
            {guide.isActive && (
              <span className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-full shrink-0">
                <CheckCircle2 className="h-3 w-3" /> Active
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            {guide.fileName}
          </p>
        </div>
      </div>

      {/* Meta info */}
      <div className="px-6 py-4 grid sm:grid-cols-3 gap-4">
        <MetaItem
          icon={<HardDrive className="h-4 w-4" />}
          label="ဖိုင်အရွယ်"
          value={formatFileSize(guide.fileSize)}
        />
        <MetaItem
          icon={<Calendar className="h-4 w-4" />}
          label="ပညာသင်နှစ်"
          value={guide.academicYear ?? "—"}
        />
        <MetaItem
          icon={<Clock className="h-4 w-4" />}
          label="တင်သွင်းသည့်နေ့"
          value={new Date(guide.createdAt).toLocaleDateString("en-GB", {
            year: "numeric",
            month: "short",
            day: "numeric",
          })}
        />
      </div>

      {/* Action buttons */}
      <div className="px-6 pb-5 flex flex-col sm:flex-row gap-2">
        <Button size="sm" asChild className="gap-2">
          <a href={guide.downloadUrl} download>
            <Download className="h-4 w-4" />
            PDF ဒေါင်းလုတ်
          </a>
        </Button>
        <Button size="sm" variant="outline" asChild className="gap-2">
          <a href={guide.downloadUrl} target="_blank" rel="noreferrer">
            <ExternalLink className="h-4 w-4" />
            Tab အသစ်ဖွင့်ကြည့်
          </a>
        </Button>
      </div>

      {/* Footer note */}
      <div className="border-t bg-muted/30 px-6 py-2">
        <p className="text-xs text-muted-foreground">
          တင်သွင်းသူ:{" "}
          <span className="font-medium">{guide.uploadedByName ?? "Admin"}</span>
        </p>
      </div>
    </div>
  );
}

function MetaItem({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <div className="mt-0.5 text-muted-foreground shrink-0">{icon}</div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="text-sm font-medium">{value}</p>
      </div>
    </div>
  );
}
