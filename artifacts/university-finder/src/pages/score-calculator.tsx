import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useCalculateScore } from "@workspace/api-client-react";
import { CheckCircle2, XCircle, Calculator, Info } from "lucide-react";
import { Link } from "wouter";

const subjects = [
  { id: "myanmar", label: "Myanmar", max: 100 },
  { id: "english", label: "English", max: 100 },
  { id: "mathematics", label: "Mathematics", max: 100 },
  { id: "chemistry", label: "Chemistry", max: 100 },
  { id: "physics", label: "Physics", max: 100 },
  { id: "biology", label: "Biology", max: 100 },
  { id: "history", label: "History", max: 100 },
  { id: "geography", label: "Geography", max: 100 },
  { id: "economics", label: "Economics", max: 100 },
];

const scoreSchema = z.object({
  myanmar: z.coerce.number().min(0).max(100).optional().nullable(),
  english: z.coerce.number().min(0).max(100).optional().nullable(),
  mathematics: z.coerce.number().min(0).max(100).optional().nullable(),
  chemistry: z.coerce.number().min(0).max(100).optional().nullable(),
  physics: z.coerce.number().min(0).max(100).optional().nullable(),
  biology: z.coerce.number().min(0).max(100).optional().nullable(),
  history: z.coerce.number().min(0).max(100).optional().nullable(),
  geography: z.coerce.number().min(0).max(100).optional().nullable(),
  economics: z.coerce.number().min(0).max(100).optional().nullable(),
}).refine(data => {
  // Ensure at least some subjects are entered to have a total > 0
  const total = Object.values(data).reduce((acc, val) => acc + (val || 0), 0);
  return total > 0;
}, "Please enter scores for at least some subjects");

type ScoreFormValues = z.infer<typeof scoreSchema>;

export default function ScoreCalculator() {
  const form = useForm<ScoreFormValues>({
    resolver: zodResolver(scoreSchema),
    defaultValues: {
      myanmar: null,
      english: null,
      mathematics: null,
      chemistry: null,
      physics: null,
      biology: null,
      history: null,
      geography: null,
      economics: null,
    }
  });

  const calculateMutation = useCalculateScore();

  const onSubmit = (data: ScoreFormValues) => {
    const totalScore = Object.values(data).reduce((acc, val) => acc + (val || 0), 0) as number;
    calculateMutation.mutate({
      data: {
        totalScore,
        subjects: data as any,
      }
    });
  };

  const results = calculateMutation.data;
  const currentTotal = Object.values(form.watch()).reduce((acc, val) => acc + (Number(val) || 0), 0) as number;

  return (
    <Layout>
      <div className="container py-8 px-4 md:px-6 max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Score Calculator</h1>
          <p className="text-muted-foreground mt-1">Enter your Grade 12 exam scores to see which universities you can apply to.</p>
        </div>

        <div className="grid lg:grid-cols-[1fr_1.5fr] gap-8">
          {/* Input Section */}
          <div>
            <Card className="sticky top-24 border-primary/20 shadow-sm">
              <CardHeader className="bg-primary/5 pb-4 border-b">
                <CardTitle className="text-xl flex items-center gap-2 text-primary">
                  <Calculator className="h-5 w-5" /> Your Scores
                </CardTitle>
                <CardDescription>Enter marks out of 100 for each subject you took.</CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <form id="score-form" onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    {subjects.map((subject) => (
                      <div key={subject.id} className="space-y-1.5">
                        <Label htmlFor={subject.id} className="text-xs text-muted-foreground">{subject.label}</Label>
                        <Input
                          id={subject.id}
                          type="number"
                          placeholder="0-100"
                          {...form.register(subject.id as keyof ScoreFormValues)}
                          className="h-9"
                        />
                      </div>
                    ))}
                  </div>

                  {form.formState.errors.root && (
                    <div className="text-sm text-destructive mt-2 p-2 bg-destructive/10 rounded-md">
                      {form.formState.errors.root.message}
                    </div>
                  )}

                  <div className="pt-4 mt-4 border-t flex justify-between items-center">
                    <span className="font-semibold text-lg text-foreground">Total:</span>
                    <span className="text-2xl font-bold text-primary">{currentTotal}</span>
                  </div>
                </form>
              </CardContent>
              <CardFooter className="pt-0 px-6 pb-6 border-t mt-4">
                <Button 
                  type="submit" 
                  form="score-form" 
                  className="w-full mt-4" 
                  size="lg"
                  disabled={calculateMutation.isPending}
                >
                  {calculateMutation.isPending ? "Calculating..." : "Find My Matches"}
                </Button>
              </CardFooter>
            </Card>
          </div>

          {/* Results Section */}
          <div>
            {!results && !calculateMutation.isPending && (
              <div className="h-full flex flex-col items-center justify-center p-12 text-center border rounded-xl bg-card border-dashed">
                <Info className="h-12 w-12 text-muted-foreground/50 mb-4" />
                <h3 className="text-xl font-medium text-foreground mb-2">No results yet</h3>
                <p className="text-muted-foreground max-w-md">Enter your scores on the left and click calculate to see a personalized list of universities you are eligible to attend.</p>
              </div>
            )}

            {calculateMutation.isPending && (
              <div className="space-y-4">
                {[1, 2, 3, 4].map(i => (
                  <Card key={i} className="animate-pulse">
                    <CardHeader className="py-4">
                      <div className="h-6 bg-muted rounded w-1/3 mb-2"></div>
                      <div className="h-4 bg-muted rounded w-1/4"></div>
                    </CardHeader>
                    <CardContent className="py-0 pb-4">
                      <div className="h-4 bg-muted rounded w-full mb-2"></div>
                      <div className="h-4 bg-muted rounded w-5/6"></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {results && (
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-foreground">Your Matches</h2>
                  <Badge variant="secondary" className="px-3 py-1 text-sm bg-secondary/20 text-secondary-foreground border-none">
                    {results.filter(r => r.eligible).length} Eligible Universities
                  </Badge>
                </div>

                <div className="space-y-4">
                  {results.map((match, idx) => (
                    <Card 
                      key={idx} 
                      className={`overflow-hidden transition-all ${
                        match.eligible 
                          ? 'border-primary/30 shadow-sm hover:border-primary/50' 
                          : 'opacity-75 border-border grayscale-[0.2]'
                      }`}
                    >
                      <div className={`h-1.5 w-full ${match.eligible ? 'bg-primary' : 'bg-muted'}`} />
                      <div className="p-5 sm:p-6 flex flex-col sm:flex-row gap-6 items-start sm:items-center">
                        <div className="flex-1 space-y-2">
                          <div className="flex items-center gap-2">
                            <h3 className="text-xl font-bold text-foreground leading-tight">
                              {match.university.name}
                            </h3>
                            {match.university.type && (
                              <Badge variant="outline" className="text-[10px] uppercase tracking-wider">
                                {match.university.type}
                              </Badge>
                            )}
                          </div>
                          
                          {match.university.nameEn && (
                            <p className="text-sm text-muted-foreground">{match.university.nameEn}</p>
                          )}

                          <div className="flex flex-wrap gap-2 pt-2">
                            <Badge variant="secondary" className="bg-muted text-muted-foreground font-normal">
                              Required: {match.university.minScore}
                            </Badge>
                            {match.university.state && (
                              <Badge variant="secondary" className="bg-muted text-muted-foreground font-normal">
                                {match.university.state}
                              </Badge>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-row sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-4 sm:gap-3 shrink-0">
                          {match.eligible ? (
                            <div className="flex items-center gap-2 text-primary font-medium bg-primary/10 px-3 py-1.5 rounded-full">
                              <CheckCircle2 className="h-5 w-5" />
                              <span>Eligible</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 text-destructive font-medium bg-destructive/10 px-3 py-1.5 rounded-full">
                              <XCircle className="h-5 w-5" />
                              <span>Not Eligible</span>
                            </div>
                          )}
                          
                          <div className="text-sm">
                            {match.eligible ? (
                              <span className="text-muted-foreground">Match: <span className="font-semibold text-foreground">{Math.round(match.matchScore)}%</span></span>
                            ) : (
                              <span className="text-destructive/80">Gap: {match.gap} marks</span>
                            )}
                          </div>

                          <Button size="sm" variant={match.eligible ? "default" : "outline"} asChild className="w-full sm:w-auto">
                            <Link href={`/universities/${match.university.id}`}>View Details</Link>
                          </Button>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </Layout>
  );
}