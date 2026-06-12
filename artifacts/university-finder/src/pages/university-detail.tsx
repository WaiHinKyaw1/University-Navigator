import { useRoute, Link } from "wouter";
import { useGetUniversity } from "@workspace/api-client-react";
import { Layout } from "@/components/layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { MapPin, Globe, Building2, ChevronLeft, ArrowRight, GraduationCap } from "lucide-react";

export default function UniversityDetail() {
  const [, params] = useRoute("/universities/:id");
  const id = params?.id ? parseInt(params.id) : 0;

  const { data: uni, isLoading, isError } = useGetUniversity(id, {
    query: {
      queryKey: ['university', id],
      enabled: !!id
    }
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
          <p className="text-muted-foreground mt-2">The university you're looking for doesn't exist or has been removed.</p>
          <Button variant="outline" asChild className="mt-8">
            <Link href="/universities"><ChevronLeft className="mr-2 h-4 w-4" /> Back to List</Link>
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container py-8 max-w-4xl mx-auto">
        <Button variant="ghost" asChild className="mb-6 -ml-4">
          <Link href="/universities"><ChevronLeft className="mr-2 h-4 w-4" /> Back to Universities</Link>
        </Button>

        <div className="bg-card rounded-3xl overflow-hidden border shadow-sm mb-10">
          <div className="h-48 sm:h-64 md:h-80 relative bg-muted">
            {uni.imageUrl ? (
              <img src={uni.imageUrl} alt={uni.name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-secondary/10">
                <Building2 className="h-24 w-24 text-secondary/40" />
              </div>
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent"></div>
            <div className="absolute bottom-6 left-6 right-6 text-white">
              <div className="flex flex-wrap gap-2 mb-3">
                <Badge variant="secondary" className="bg-primary text-primary-foreground border-none">
                  {uni.type}
                </Badge>
                {uni.abbreviation && (
                  <Badge variant="outline" className="text-white border-white/30 backdrop-blur-md">
                    {uni.abbreviation}
                  </Badge>
                )}
              </div>
              <h1 className="text-3xl sm:text-4xl font-bold mb-1">{uni.name}</h1>
              {uni.nameEn && <h2 className="text-lg sm:text-xl text-white/80">{uni.nameEn}</h2>}
            </div>
          </div>

          <div className="p-6 md:p-8">
            <div className="grid md:grid-cols-3 gap-8">
              <div className="md:col-span-2 space-y-8">
                <div>
                  <h3 className="text-lg font-bold mb-3 border-b pb-2">About</h3>
                  <p className="text-muted-foreground leading-relaxed whitespace-pre-wrap">
                    {uni.description || "No description available for this university."}
                  </p>
                </div>

                <div>
                  <h3 className="text-lg font-bold mb-3 border-b pb-2 flex items-center justify-between">
                    <span>Majors Offered</span>
                    <Badge variant="secondary" className="font-normal">{uni.majors?.length || 0} Majors</Badge>
                  </h3>
                  {uni.majors && uni.majors.length > 0 ? (
                    <div className="grid sm:grid-cols-2 gap-3">
                      {uni.majors.map(major => (
                        <div key={major.id} className="bg-muted/50 p-3 rounded-lg border border-border/50">
                          <p className="font-medium">{major.name}</p>
                          <div className="flex justify-between items-center mt-1">
                            <span className="text-xs text-muted-foreground">{major.nameEn}</span>
                            <Badge variant="outline" className="text-[10px] py-0 h-4">{major.category}</Badge>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-muted-foreground italic">Information about majors is not available yet.</p>
                  )}
                </div>
              </div>

              <div className="space-y-6">
                <div className="bg-muted p-5 rounded-xl space-y-4">
                  <div>
                    <span className="text-sm font-medium text-muted-foreground block mb-1">Minimum Score Requirement</span>
                    <div className="text-3xl font-bold text-primary">{uni.minScore}</div>
                  </div>
                  <Button className="w-full" asChild>
                    <Link href="/score">Check Eligibility <ArrowRight className="ml-2 h-4 w-4" /></Link>
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
                        <span className="text-xs text-muted-foreground block">Location</span>
                        <span className="text-sm font-medium">{uni.city ? `${uni.city}, ` : ''}{uni.state}</span>
                      </div>
                    </div>
                    
                    {uni.website && (
                      <div className="flex gap-3">
                        <div className="bg-primary/10 p-2 rounded shrink-0">
                          <Globe className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <span className="text-xs text-muted-foreground block">Website</span>
                          <a href={uni.website} target="_blank" rel="noreferrer" className="text-sm font-medium text-primary hover:underline break-all">
                            {uni.website.replace(/^https?:\/\//, '')}
                          </a>
                        </div>
                      </div>
                    )}
                    
                    <div className="flex gap-3">
                      <div className="bg-primary/10 p-2 rounded shrink-0">
                        <GraduationCap className="h-4 w-4 text-primary" />
                      </div>
                      <div>
                        <span className="text-xs text-muted-foreground block">Type</span>
                        <span className="text-sm font-medium capitalize">{uni.type}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
