import { Layout } from "@/components/layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuth } from "@/hooks/use-auth";
import { useFavorites } from "@/hooks/use-favorites";
import { Building2, Heart, MapPin, Trash2 } from "lucide-react";
import { Link } from "wouter";
import { toast } from "sonner";

const TYPE_LABEL: Record<string, string> = {
  medical: "ဆေးပညာ",
  technical: "နည်းပညာ",
  government: "ဝိဇ္ဇာ/သိပ္ပံ",
  education: "ပညာရေး",
  business: "စီးပွားရေး",
  law: "ဥပဒေ",
  distance: "အဝေးသင်",
};

function FavoritesSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {[1, 2, 3, 4].map((item) => (
        <Card key={item} className="overflow-hidden rounded-2xl">
          <div className="flex gap-4 p-4">
            <Skeleton className="h-24 w-28 shrink-0 rounded-xl" />
            <div className="flex-1 space-y-3">
              <Skeleton className="h-4 w-3/4" />
              <Skeleton className="h-3 w-1/2" />
              <Skeleton className="h-3 w-2/3" />
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}

export default function Favorites() {
  const { user, isLoading: authLoading } = useAuth();
  const { favorites, isLoading, isError, removeFavorite } = useFavorites();

  const handleRemove = (universityId: number) => {
    removeFavorite.mutate(universityId, {
      onSuccess: () => toast.success("Favorites မှ ဖယ်ရှားပြီးပါပြီ"),
      onError: () => toast.error("Favorites မှ ဖယ်ရှား၍ မရပါ"),
    });
  };

  return (
    <Layout>
      <div className="min-h-screen bg-background">
        <div className="mx-auto max-w-5xl space-y-6 px-4 py-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <div className="mb-2 flex items-center gap-2 text-primary">
                <Heart className="h-5 w-5 fill-current" />
                <span className="text-sm font-semibold">သိမ်းထားသောစာရင်း</span>
              </div>
              <h1 className="text-xl font-bold text-foreground sm:text-2xl">အကြိုက်ဆုံး တက္ကသိုလ်များ</h1>
              <p className="mt-1 text-sm text-muted-foreground">
                စိတ်ဝင်စားတဲ့ တက္ကသိုလ်တွေကို တစ်နေရာတည်းမှာ ပြန်လည်ကြည့်ရှုပါ။
              </p>
            </div>
            {!authLoading && user && (
              <span className="text-sm text-muted-foreground">{favorites.length} ခု သိမ်းထားသည်</span>
            )}
          </div>

          {authLoading || (user && isLoading) ? (
            <FavoritesSkeleton />
          ) : !user ? (
            <Card className="rounded-2xl border-dashed">
              <CardContent className="flex flex-col items-center py-16 text-center">
                <Heart className="mb-4 h-12 w-12 text-muted-foreground/40" />
                <h2 className="text-lg font-semibold text-foreground">Login ဝင်ပြီး Favorites သိမ်းပါ</h2>
                <p className="mt-2 max-w-md text-sm text-gray-500">
                  တက္ကသိုလ်စာရင်းထဲမှာ နှလုံးပုံ button ကိုနှိပ်ပြီး နောက်မှ ပြန်ကြည့်နိုင်ပါတယ်။
                </p>
                <Button asChild className="mt-5">
                  <Link href="/login">Login ဝင်မယ်</Link>
                </Button>
              </CardContent>
            </Card>
          ) : isError ? (
            <Card className="rounded-2xl border-destructive/30">
              <CardContent className="py-16 text-center">
                <p className="font-semibold text-foreground">Favorites ရယူ၍ မရပါ</p>
                <p className="mt-2 text-sm text-gray-500">ခဏအကြာတွင် ပြန်လည်ကြိုးစားပါ။</p>
              </CardContent>
            </Card>
          ) : favorites.length === 0 ? (
            <Card className="rounded-2xl border-dashed">
              <CardContent className="flex flex-col items-center py-16 text-center">
                <Building2 className="mb-4 h-12 w-12 text-muted-foreground/40" />
                <h2 className="text-lg font-semibold text-foreground">Favorites မရှိသေးပါ</h2>
                <p className="mt-2 max-w-md text-sm text-gray-500">
                  Universities စာမျက်နှာသို့သွားပြီး စိတ်ဝင်စားတဲ့ တက္ကသိုလ်တွေကို သိမ်းထားပါ။
                </p>
                <Button asChild variant="outline" className="mt-5">
                  <Link href="/universities">တက္ကသိုလ်များ ကြည့်မယ်</Link>
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {favorites.map((favorite) => {
                const university = favorite.university;
                return (
                  <Card key={favorite.favoriteId} className="group overflow-hidden rounded-2xl border-border/70 shadow-sm transition-shadow hover:shadow-md">
                    <CardContent className="flex gap-3 p-3 sm:gap-4 sm:p-4">
                      <div className="h-20 w-24 shrink-0 overflow-hidden rounded-xl bg-muted sm:h-24 sm:w-28">
                        {university.imageUrl ? (
                          <img
                            src={university.imageUrl}
                            alt={university.name}
                            className="h-full w-full object-cover transition-transform group-hover:scale-105"
                          />
                        ) : (
                          <div className="flex h-full items-center justify-center">
                            <Building2 className="h-8 w-8 text-muted-foreground/40" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0">
                            <h2 className="line-clamp-2 text-sm font-bold text-foreground">{university.name}</h2>
                            <p className="mt-0.5 truncate text-xs text-muted-foreground">{university.nameEn}</p>
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemove(university.id)}
                            disabled={removeFavorite.isPending}
                            className="h-8 w-8 shrink-0 text-muted-foreground hover:text-rose-500"
                            aria-label="Remove from favorites"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                          <span className="rounded-full bg-primary/10 px-2 py-1 text-primary">
                            {TYPE_LABEL[university.type] ?? university.type}
                          </span>
                          <span className="flex items-center gap-1">
                            <MapPin className="h-3 w-3" />
                            {university.city || university.state}
                          </span>
                          <span className="rounded-full bg-emerald-50 px-2 py-1 font-semibold text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300">
                            {university.minScore} မှတ်
                          </span>
                        </div>
                        <Button asChild variant="link" className="mt-1 h-auto px-0 text-primary">
                          <Link href={`/universities/${university.id}`}>အသေးစိတ် ကြည့်ရန် →</Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </Layout>
  );
}
