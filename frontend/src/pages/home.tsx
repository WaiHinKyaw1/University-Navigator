import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import {
  ArrowRight,
  Calculator,
  Sparkles,
  BookOpen,
  Search,
  Newspaper,
} from "lucide-react";
import { motion } from "framer-motion";
import { useListNews } from "@workspace/api-client-react";
import { useAuth } from "@/hooks/use-auth";
import { User } from "lucide-react";

export default function Home() {
  const { data: newsData } = useListNews({ page: 1, limit: 5 });
  const latestNews = newsData?.articles ?? [];
  const { user } = useAuth();

  return (
    <Layout>
      <div className="flex flex-col items-center">
        {/* Hero Section */}
        <section className="w-full py-20 md:py-32 bg-primary text-primary-foreground relative overflow-hidden">
          <div className="absolute inset-0 opacity-10 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] mix-blend-overlay"></div>
          <div className="container relative z-10 text-center px-4 md:px-6 max-w-4xl mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
            >
              {user && (
                <h2 className="text-xl font-semibold text-4xl md:text-4xl font-bold tracking-tight mb-6">
                  Welcome, {user.name}
                </h2>
              )}
              <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-6">
                Your pathway to{" "}
                <span className="text-secondary">Myanmar's universities</span>{" "}
                begins here.
              </h1>
              <p className="text-lg md:text-xl opacity-90 mb-10 max-w-2xl mx-auto">
                Navigate your post-Grade 12 journey with confidence. Calculate
                your eligibility, explore universities, and find the perfect
                major with our AI guide.
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Button
                  size="lg"
                  variant="secondary"
                  className="w-full sm:w-auto h-12 px-8 text-secondary-foreground"
                  asChild
                >
                  <Link href="/score">
                    Calculate Score <Calculator className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button
                  size="lg"
                  variant="outline"
                  className="w-full sm:w-auto h-12 px-8 bg-transparent border-primary-foreground/30 hover:bg-primary-foreground/10 text-primary-foreground"
                  asChild
                >
                  <Link href="/universities">
                    Explore Universities <Search className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
              </div>
            </motion.div>
          </div>
        </section>

        {latestNews.length > 0 && (
          <section className="w-full border-b bg-muted/40">
            <div className="container mx-auto flex flex-col gap-3 px-4 py-3 md:flex-row md:items-center md:px-6">
              <Link
                href="/news"
                className="flex shrink-0 items-center gap-2 text-sm font-semibold text-primary hover:underline"
              >
                <Newspaper className="h-4 w-4" />
                Latest News
              </Link>
              <div className="min-w-0 flex-1 overflow-hidden">
                <div className="flex w-max animate-[newsTicker_28s_linear_infinite] items-center gap-8 hover:[animation-play-state:paused]">
                  {[...latestNews, ...latestNews].map((article, index) => (
                    <Link
                      key={`${article.id}-${index}`}
                      href="/news"
                      className="flex max-w-[360px] items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
                    >
                      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                      <span className="truncate">{article.title}</span>
                    </Link>
                  ))}
                </div>
              </div>
              <Button variant="ghost" size="sm" asChild className="shrink-0">
                <Link href="/news">
                  View All <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
            </div>
          </section>
        )}

        {/* Features Section */}
        <section className="w-full py-10 md:py-24 bg-background flex flex-col items-center">
          <div className="container px-4 md:px-6">
            <div className="text-center mb-16">
              <h2 className="text-3xl font-bold text-foreground mb-4">
                Everything you need to decide
              </h2>
              <p className="text-muted-foreground max-w-2xl mx-auto">
                We bring together all the information scattered across different
                sources into one calm, organized place.
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 max-w-5xl mx-auto">
              <div className="bg-card p-8 rounded-2xl border shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center mb-6">
                  <Calculator className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold mb-3">Score Matching</h3>
                <p className="text-muted-foreground mb-6">
                  Enter your Grade 12 scores to instantly see which universities
                  and majors you are eligible for, ranked by fit.
                </p>
                <Link
                  href="/score"
                  className="text-primary font-medium flex items-center hover:underline"
                >
                  Try Calculator <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </div>

              <div className="bg-card p-8 rounded-2xl border shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-secondary/20 text-secondary-foreground rounded-xl flex items-center justify-center mb-6">
                  <Sparkles className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold mb-3">AI Interest Guide</h3>
                <p className="text-muted-foreground mb-6">
                  Not sure what to study? Chat with our AI about your hobbies
                  and strengths to get personalized major recommendations.
                </p>
                <Link
                  href="/chatbot"
                  className="text-primary font-medium flex items-center hover:underline"
                >
                  Chat with AI <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </div>

              <div className="bg-card p-8 rounded-2xl border shadow-sm hover:shadow-md transition-shadow">
                <div className="w-12 h-12 bg-primary/10 text-primary rounded-xl flex items-center justify-center mb-6">
                  <BookOpen className="h-6 w-6" />
                </div>
                <h3 className="text-xl font-bold mb-3">Complete Directory</h3>
                <p className="text-muted-foreground mb-6">
                  Browse an up-to-date, filterable list of government,
                  technological, and medical universities across Myanmar.
                </p>
                <Link
                  href="/universities"
                  className="text-primary font-medium flex items-center hover:underline"
                >
                  Browse List <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </Layout>
  );
}
