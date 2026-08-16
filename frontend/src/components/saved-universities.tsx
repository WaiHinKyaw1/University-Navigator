import { Skeleton } from "@/components/ui/skeleton";
import { useFavorites } from "@/hooks/use-favorites";
import { Building2, Heart, MapPin, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Link } from "wouter";
import { toast } from "sonner";

export default function SavedUniversities() {
  const { favorites, isLoading, isError, removeFavorite } = useFavorites();

  const handleRemove = (universityId: number) => {
    removeFavorite.mutate(universityId, {
      onSuccess: () => toast.success("Favorites မှ ဖယ်ရှားပြီးပါပြီ"),
      onError: () => toast.error("Favorites မှ ဖယ်ရှား၍ မရပါ"),
    });
  };

  return (
    <div>
      <div className="mb-3 flex items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">နောက်မှ ပြန်ကြည့်ရန် သိမ်းထားသော တက္ကသိုလ်များ</p>
      </div>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((item) => (
            <div key={item} className="flex items-center gap-3 rounded-xl border border-border p-3">
              <Skeleton className="h-12 w-14 rounded-lg" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-4 w-2/3" />
                <Skeleton className="h-3 w-1/3" />
              </div>
            </div>
          ))}
        </div>
      ) : isError ? (
        <p className="rounded-xl bg-destructive/5 p-4 text-sm text-destructive">Favorites ရယူ၍ မရပါ။ ခဏအကြာတွင် ပြန်လည်ကြိုးစားပါ။</p>
      ) : favorites.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border p-8 text-center">
          <Building2 className="mx-auto mb-3 h-9 w-9 text-muted-foreground/40" />
          <p className="font-medium text-foreground">သိမ်းထားတာ မရှိသေးပါ</p>
          <p className="mt-1 text-sm text-muted-foreground">Universities စာမျက်နှာမှ ကြိုက်နှစ်သက်သော တက်ကသိုလ်ကို သိမ်းနိုင်ပါတယ်။</p>
        </div>
      ) : (
        <div className="space-y-3">
          {favorites.slice(0, 4).map((favorite) => {
            const university = favorite.university;
            return (
              <div key={favorite.favoriteId} className="flex items-center gap-3 rounded-xl border border-border p-3 transition-colors hover:bg-muted/40">
                <div className="flex h-12 w-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-muted">
                  {university.imageUrl ? (
                    <img src={university.imageUrl} alt={university.name} className="h-full w-full object-cover" />
                  ) : (
                    <Building2 className="h-5 w-5 text-muted-foreground/50" />
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <Link href={`/universities/${university.id}`} className="line-clamp-1 text-sm font-semibold text-foreground hover:text-primary">
                    {university.name}
                  </Link>
                  <p className="mt-1 flex items-center gap-1 truncate text-xs text-muted-foreground">
                    <MapPin className="h-3 w-3 shrink-0" />
                    {university.city || university.state} · {university.minScore} မှတ်
                  </p>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => handleRemove(university.id)}
                  disabled={removeFavorite.isPending}
                  className="shrink-0 text-muted-foreground hover:text-rose-500"
                  aria-label="Remove from favorites"
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
