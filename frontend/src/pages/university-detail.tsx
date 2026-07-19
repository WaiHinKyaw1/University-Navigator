import { useState } from "react";
import { useRoute, Link } from "wouter";
import {
  useGetUniversity,
  getGetUniversityQueryKey,
} from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Sheet, SheetContent, SheetTitle } from "@/components/ui/sheet";
import FavoriteButton from "@/components/favorite-button";
import {
  MapPin,
  Globe,
  Building2,
  ChevronLeft,
  ArrowRight,
  GraduationCap,
  Clock,
  Briefcase,
  Sparkles,
  BookOpen,
  TrendingUp,
} from "lucide-react";

export default function UniversityDetail() {
  const [, params] = useRoute("/universities/:id");
  const id = params?.id ? parseInt(params.id) : 0;
  const [selectedMajor, setSelectedMajor] = useState<any | null>(null);
  const [isSheetOpen, setIsSheetOpen] = useState(false);

  const {
    data: uni,
    isLoading,
    isError,
  } = useGetUniversity(id, {
    query: {
      enabled: !!id,
      queryKey: getGetUniversityQueryKey(id),
    },
  });

  if (isLoading) {
    return (
      <Layout>
        <div className="container py-8 max-w-4xl mx-auto">
          <Skeleton className="h-8 w-32 mb-8" />
          <div className="space-y-8">
            <Skeleton className="h-64 w-full rounded-2xl" />
            <div className="space-y-4">
              <Skeleton className="h-10 w-3/4" />
              <Skeleton className="h-6 w-1/2" />
            </div>
            <div className="space-y-2">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-3/4" />
            </div>
          </div>
        </div>
      </Layout>
    );
  }

  if (isError || !uni) {
    return (
      <Layout>
        <div className="container py-20 max-w-4xl mx-auto text-center">
          <Building2 className="mx-auto h-16 w-16 text-muted-foreground/30 mb-4" />
          <h2 className="text-2xl font-bold">University Not Found</h2>
          <p className="text-muted-foreground mt-2">
            The university you're looking for doesn't exist or has been removed.
          </p>
          <Button variant="outline" asChild className="mt-8">
            <Link href="/universities">
              <ChevronLeft className="mr-2 h-4 w-4" /> Back to List
            </Link>
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container py-8 max-w-4xl mx-auto">
        <Button variant="ghost" asChild className="mb-6 -ml-4">
          <Link href="/universities">
            <ChevronLeft className="mr-2 h-4 w-4" /> Back to Universities
          </Link>
        </Button>
        <div className="bg-card rounded-3xl overflow-hidden border shadow-sm mb-10">
          <div className="h-48 sm:h-64 md:h-80 relative bg-muted">
            {uni.imageUrl ? (
              <img
                src={uni.imageUrl}
                alt={uni.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-secondary/10">
                <Building2 className="h-24 w-24 text-secondary/40" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
            <div className="absolute bottom-6 left-6 right-6 text-white">
              <div className="flex flex-wrap gap-2 mb-3">
                <Badge
                  variant="secondary"
                  className="bg-primary text-primary-foreground border-none"
                >
                  {uni.type}
                </Badge>
                {uni.abbreviation && (
                  <Badge
                    variant="outline"
                    className="text-white border-white/30 backdrop-blur-md"
                  >
                    {uni.abbreviation}
                  </Badge>
                )}
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold mb-1">
                {uni.name}
              </h1>
              {uni.nameEn && (
                <h2 className="text-lg sm:text-xl text-white/80">
                  {uni.nameEn}
                </h2>
              )}
            </div>
          </div>

          <div className="p-6 md:p-8">
            <div className="grid md:grid-cols-3 gap-8">
              <div className="md:col-span-2 space-y-8">
                <div>
                  <h3 className="text-lg font-bold mb-3 border-b pb-2">
                    About
                  </h3>
                  <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                    {uni.description ||
                      "No description available for this university."}
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-bold mb-3 border-b pb-2 flex items-center justify-between">
                    <span>Majors Offered</span>
                    <Badge variant="secondary" className="font-normal">
                      {uni.majors?.length || 0} Majors
                    </Badge>
                  </h3>
                  {uni.majors && uni.majors.length > 0 ? (
                    <div className="grid sm:grid-cols-2 gap-4">
                      {uni.majors.map((major) => (
                        <div
                          key={major.id}
                          className="bg-muted/50 p-4 rounded-xl border border-border/50 hover:bg-accent/40 hover:border-primary/30 hover:shadow-md cursor-pointer transition-all duration-300 group flex flex-col justify-between"
                          onClick={() => {
                            setSelectedMajor(major);
                            setIsSheetOpen(true);
                          }}
                        >
                          <div>
                            <p className="font-semibold text-foreground group-hover:text-primary transition-colors flex items-center justify-between">
                              <span>{major.name}</span>
                              <span className="text-[10px] font-normal text-muted-foreground bg-background px-2 py-0.5 rounded-full border opacity-0 group-hover:opacity-100 transition-opacity">
                                View Careers &rarr;
                              </span>
                            </p>
                            <p className="text-xs text-muted-foreground mt-1">
                              {major.nameEn}
                            </p>
                          </div>
                          <div className="flex justify-between items-center mt-3 pt-2 border-t border-border/20">
                            <span className="text-[11px] text-muted-foreground flex items-center gap-1 font-medium">
                              <Clock className="h-3.5 w-3.5 text-primary/75" />
                              {major.duration || "N/A"}
                            </span>
                            <Badge
                              variant="outline"
                              className="text-[10px] uppercase tracking-wider font-semibold py-0 px-2 h-5 bg-background"
                            >
                              {major.category}
                            </Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground italic">
                      Information about majors is not available yet.
                    </p>
                  )}
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-muted p-5 rounded-xl space-y-4">
                  <div>
                    <span className="text-sm font-medium text-muted-foreground block mb-1">
                      Minimum Score Requirement
                    </span>
                    <div className="text-3xl font-bold text-primary">
                      {uni.minScore}
                    </div>
                  </div>
                  <Button className="w-full" asChild>
                    <Link href="/score">
                      Check Eligibility <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                  </Button>
                </div>

                <div className="space-y-4">
                  <h3 className="font-bold border-b pb-2">Quick Facts</h3>
                  <div className="space-y-3">
                    <div className="flex gap-3">
                      <div className="bg-primary/10 p-2 rounded shrink-0">
                        <MapPin className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground block">
                          Location
                        </span>
                        <span className="text-sm font-medium">
                          {uni.city ? `${uni.city}, ` : ""}
                          {uni.state}
                        </span>
                      </div>
                    </div>

                    {uni.website && (
                      <div className="flex gap-3">
                        <div className="bg-primary/10 p-2 rounded shrink-0">
                          <Globe className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <span className="text-xs text-muted-foreground block">
                            Website
                          </span>
                          <a
                            href={uni.website}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sm font-medium text-primary hover:underline break-all"
                          >
                            {uni.website.replace(/^https?:\/\//, "")}
                          </a>
                        </div>
                      </div>
                    )}

                    <div className="flex gap-3">
                      <div className="bg-primary/10 p-2 rounded shrink-0">
                        <GraduationCap className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground block">
                          Type
                        </span>
                        <span className="text-sm font-medium capitalize">
                          {uni.type}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                <div>
                  <FavoriteButton universityId={uni.id} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <Sheet open={isSheetOpen} onOpenChange={setIsSheetOpen}>
        <SheetContent className="w-full sm:max-w-xl overflow-y-auto p-6 md:p-8 rounded-l-3xl border-l shadow-2xl">
          {selectedMajor &&
            (() => {
              let parsedCareers = [];
              try {
                parsedCareers = JSON.parse(selectedMajor.careerPaths || "[]");
              } catch (e) {
                console.error("Failed to parse career paths JSON", e);
              }

              return (
                <div className="space-y-8">
                  <div>
                    <Badge
                      variant="secondary"
                      className="mb-2 bg-primary/10 text-primary hover:bg-primary/15 uppercase tracking-wider font-semibold text-[10px]"
                    >
                      {selectedMajor.category}
                    </Badge>
                    <SheetTitle className="text-2xl md:text-3xl font-extrabold tracking-tight">
                      {selectedMajor.name}
                    </SheetTitle>
                    <p className="text-sm text-muted-foreground mt-1.5 font-medium">
                      {selectedMajor.nameEn}
                    </p>
                  </div>

                  {selectedMajor.description && (
                    <div className="bg-muted/40 p-4 rounded-2xl border border-border/40">
                      <h4 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider mb-1 flex items-center gap-1.5">
                        <BookOpen className="h-3.5 w-3.5" />
                        About Major
                      </h4>
                      <p className="text-sm text-foreground/90 leading-relaxed">
                        {selectedMajor.description}
                      </p>
                    </div>
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <div className="bg-primary/5 p-4 rounded-2xl border border-primary/10 flex flex-col justify-center">
                      <span className="text-[11px] font-semibold text-primary/80 uppercase tracking-wider mb-1 flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" /> Study Duration
                      </span>
                      <span className="text-lg font-bold text-foreground">
                        {selectedMajor.duration || "Information not available"}
                      </span>
                    </div>
                    <div className="bg-secondary/10 p-4 rounded-2xl border border-secondary/20 flex flex-col justify-center">
                      <span className="text-[11px] font-semibold text-secondary-foreground/80 uppercase tracking-wider mb-1 flex items-center gap-1">
                        <Briefcase className="h-3.5 w-3.5" /> Career Paths
                      </span>
                      <span className="text-lg font-bold text-foreground">
                        {parsedCareers.length} Options
                      </span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h3 className="text-base font-bold text-foreground border-b pb-2 flex items-center gap-2">
                      <Sparkles className="h-4 w-4 text-amber-500 animate-pulse" />
                      ရရှိနိုင်မည့် အလုပ်အကိုင် အခွင့်အလမ်းများ (Career Paths)
                    </h3>

                    {parsedCareers.length === 0 ? (
                      <p className="text-sm text-muted-foreground italic text-center py-6 bg-muted/20 rounded-2xl border border-dashed">
                        အလုပ်အကိုင် အခွင့်အလမ်း အသေးစိတ်ကို မကြာမီ
                        ဖြည့်စွက်ပေးပါမည်။
                      </p>
                    ) : (
                      <div className="space-y-6">
                        {parsedCareers.map((cp: any, idx: number) => (
                          <div
                            key={idx}
                            className="bg-background border rounded-2xl p-5 hover:shadow-md transition-shadow duration-300 relative overflow-hidden group"
                          >
                            <div className="absolute top-0 left-0 w-1.5 h-full bg-primary opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                            <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
                              <h4 className="font-bold text-base text-foreground group-hover:text-primary transition-colors pl-0 group-hover:pl-2 duration-300">
                                {cp.title}
                              </h4>
                              {cp.outlook && (
                                <Badge className="text-[10px] font-semibold py-0.5 px-2 bg-emerald-500/10 text-emerald-600 border-none hover:bg-emerald-500/15">
                                  <TrendingUp className="h-3 w-3 mr-1 inline" />
                                  {cp.outlook}
                                </Badge>
                              )}
                            </div>

                            {cp.description && (
                              <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                                {cp.description}
                              </p>
                            )}

                            {cp.skills && cp.skills.length > 0 && (
                              <div className="space-y-1.5">
                                <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider block">
                                  လိုအပ်သော Skills များ
                                </span>
                                <div className="flex flex-wrap gap-1.5">
                                  {cp.skills.map(
                                    (skill: string, sIdx: number) => (
                                      <Badge
                                        key={sIdx}
                                        variant="outline"
                                        className="text-[10px] py-0 px-2 h-5 bg-muted/40 font-medium text-foreground/80 hover:bg-muted/70"
                                      >
                                        {skill}
                                      </Badge>
                                    ),
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })()}
        </SheetContent>
      </Sheet>
    </Layout>
  );
}
