import { useMemo, useState } from "react";
import { Layout } from "@/components/layout";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useListNews, type NewsArticle } from "@workspace/api-client-react";
import { CalendarDays, Newspaper, Search } from "lucide-react";

function formatDate(value: string) {
  return new Date(value).toLocaleDateString([], {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function excerpt(content: string, maxLength = 180) {
  const normalized = content.replace(/\s+/g, " ").trim();
  return normalized.length > maxLength ? `${normalized.slice(0, maxLength - 1)}...` : normalized;
}

export default function News() {
  const [search, setSearch] = useState("");
  const [selectedArticle, setSelectedArticle] = useState<NewsArticle | null>(null);
  const { data, isLoading, error } = useListNews({ page: 1, limit: 50 });

  const articles = data?.articles ?? [];
  const visibleArticles = useMemo(() => {
    const keyword = search.trim().toLowerCase();
    if (!keyword) return articles;

    return articles.filter((article) =>
      [article.title, article.content, article.category, article.authorName]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(keyword)),
    );
  }, [articles, search]);

  const activeArticle = selectedArticle ?? visibleArticles[0] ?? null;

  return (
    <Layout>
      <div className="container mx-auto flex w-full max-w-6xl flex-1 flex-col gap-6 px-4 py-6 md:px-6">
        <div className="flex flex-col gap-4 border-b pb-6 md:flex-row md:items-end md:justify-between">
          <div>
            <div className="flex items-center gap-2 text-sm font-medium text-primary">
              <Newspaper className="h-4 w-4" />
              Admission News
            </div>
            <h1 className="mt-2 text-3xl font-bold tracking-tight">Latest announcements</h1>
            <p className="mt-2 max-w-2xl text-muted-foreground">
              တက္ကသိုလ်ဝင်ခွင့်၊ ကြေညာချက်များနှင့် scholarship သတင်းများကို ဒီနေရာမှာ ကြည့်နိုင်ပါတယ်။
            </p>
          </div>
          <div className="relative w-full md:w-80">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search news..."
              className="bg-muted/40 pl-9"
            />
          </div>
        </div>

        <div className="grid flex-1 gap-6 lg:grid-cols-[380px_1fr]">
          <div className="space-y-3">
            {isLoading && (
              <Card className="p-6 text-center text-sm text-muted-foreground">Loading news...</Card>
            )}
            {error && (
              <Card className="p-6 text-sm text-destructive">{(error as Error).message}</Card>
            )}
            {!isLoading && visibleArticles.length === 0 && (
              <Card className="p-8 text-center text-sm text-muted-foreground">No published news found.</Card>
            )}

            {visibleArticles.map((article) => (
              <button
                key={article.id}
                type="button"
                onClick={() => setSelectedArticle(article)}
                className={`w-full rounded-md border bg-card p-4 text-left transition-colors hover:bg-muted/50 ${
                  activeArticle?.id === article.id ? "border-primary bg-primary/5" : "border-border"
                }`}
              >
                <div className="flex items-center justify-between gap-3">
                  <Badge variant="outline">{article.category}</Badge>
                  <span className="flex items-center gap-1 text-xs text-muted-foreground">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {formatDate(article.createdAt)}
                  </span>
                </div>
                <h2 className="mt-3 line-clamp-2 font-semibold leading-6">{article.title}</h2>
                <p className="mt-2 line-clamp-2 text-sm leading-6 text-muted-foreground">
                  {excerpt(article.content, 130)}
                </p>
              </button>
            ))}
          </div>

          <Card className="min-h-[520px] overflow-hidden">
            {activeArticle ? (
              <article>
                {activeArticle.imageUrl && (
                  <img
                    src={activeArticle.imageUrl}
                    alt={activeArticle.title}
                    className="h-64 w-full object-cover"
                  />
                )}
                <div className="p-5 md:p-7">
                  <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                    <Badge>{activeArticle.category}</Badge>
                    <span>{formatDate(activeArticle.createdAt)}</span>
                    <span>By {activeArticle.authorName || "Admin"}</span>
                  </div>
                  <h2 className="mt-4 text-2xl font-bold leading-9 md:text-3xl">{activeArticle.title}</h2>
                  <div className="mt-5 whitespace-pre-wrap text-sm leading-7 text-muted-foreground md:text-base">
                    {activeArticle.content}
                  </div>
                </div>
              </article>
            ) : (
              <div className="flex h-full min-h-[520px] flex-col items-center justify-center p-8 text-center text-muted-foreground">
                <Newspaper className="mb-4 h-14 w-14 text-muted-foreground/30" />
                <p className="text-lg font-medium text-foreground">No news selected</p>
                <p className="text-sm">Published announcements will appear here.</p>
              </div>
            )}
          </Card>
        </div>

        {data && data.total > visibleArticles.length && (
          <div className="flex justify-center">
            <Button variant="outline" disabled>
              Showing latest {visibleArticles.length} of {data.total}
            </Button>
          </div>
        )}
      </div>
    </Layout>
  );
}
