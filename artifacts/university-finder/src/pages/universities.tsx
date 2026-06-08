import { useState } from "react";
import { Layout } from "@/components/layout";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useListUniversities } from "@workspace/api-client-react";
import { Search, MapPin, Building2, BookOpen } from "lucide-react";
import { Link } from "wouter";

export default function Universities() {
  const [search, setSearch] = useState("");
  
  const { data: response, isLoading } = useListUniversities({
    search: search || undefined
  });

  return (
    <Layout>
      <div className="container py-8 px-4 md:px-6 max-w-6xl mx-auto">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Universities</h1>
            <p className="text-muted-foreground mt-1">Explore higher education institutions across Myanmar</p>
          </div>
          <div className="w-full md:w-72 relative">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              type="search" 
              placeholder="Search universities..." 
              className="pl-9 bg-card"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <Card key={i} className="overflow-hidden border-border/50">
                <div className="h-48 bg-muted animate-pulse" />
                <CardHeader className="space-y-2">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                </CardHeader>
                <CardContent className="space-y-4">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-4 w-5/6" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : !response?.universities?.length ? (
          <div className="text-center py-20 bg-card rounded-xl border border-dashed">
            <Building2 className="mx-auto h-12 w-12 text-muted-foreground/50 mb-4" />
            <h3 className="text-lg font-medium text-foreground">No universities found</h3>
            <p className="text-muted-foreground mt-1">Try adjusting your search terms</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {response.universities.map((uni) => (
              <Card key={uni.id} className="flex flex-col overflow-hidden hover-elevate transition-shadow border-border/50">
                <div className="h-48 bg-muted relative">
                  {uni.imageUrl ? (
                    <img src={uni.imageUrl} alt={uni.name} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-secondary/10">
                      <Building2 className="h-16 w-16 text-secondary/40" />
                    </div>
                  )}
                  <div className="absolute top-3 right-3 flex gap-2">
                    <Badge variant="secondary" className="bg-background/80 backdrop-blur-md hover:bg-background/90 text-foreground font-medium border-none shadow-sm">
                      {uni.type}
                    </Badge>
                  </div>
                </div>
                <CardHeader className="pb-4">
                  <div className="space-y-1">
                    <CardTitle className="text-xl leading-tight line-clamp-2">{uni.name}</CardTitle>
                    {uni.nameEn && <CardDescription className="line-clamp-1">{uni.nameEn}</CardDescription>}
                  </div>
                </CardHeader>
                <CardContent className="flex-1 space-y-4">
                  <div className="flex items-start gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4 shrink-0 mt-0.5" />
                    <span>{uni.city ? `${uni.city}, ` : ''}{uni.state}</span>
                  </div>
                  
                  <div className="flex items-start gap-2 text-sm text-muted-foreground">
                    <BookOpen className="h-4 w-4 shrink-0 mt-0.5" />
                    <span className="line-clamp-2">
                      {uni.majors?.length ? uni.majors.map(m => m.name).join(", ") : "Various majors"}
                    </span>
                  </div>
                  
                  <div className="pt-4 border-t border-border/50 flex items-center justify-between">
                    <span className="text-sm font-medium text-foreground">Min Score:</span>
                    <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20 font-bold text-sm px-2 py-0.5">
                      {uni.minScore}
                    </Badge>
                  </div>
                </CardContent>
                <CardFooter className="pt-0 pb-6 px-6">
                  <Button asChild className="w-full" variant="outline">
                    <Link href={`/universities/${uni.id}`}>View Details</Link>
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}