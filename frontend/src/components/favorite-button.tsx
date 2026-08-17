import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { useFavorites } from "@/hooks/use-favorites";

interface Props {
  universityId: number;
  compact?: boolean;
}

export default function FavoriteButton({ universityId, compact = false }: Props) {
  const { user } = useAuth();
  const {
    favoriteIds,
    isLoading: favoritesLoading,
    addFavorite,
    removeFavorite,
  } = useFavorites();

  const saved = favoriteIds.has(universityId);
  const mutationPending = addFavorite.isPending || removeFavorite.isPending;

  const toggleFavorite = () => {
    if (!user) {
      toast.error("အကြိုက်ဆုံးစာရင်းသိမ်းရန် Login ဝင်ပါ");
      return;
    }

    const mutation = saved ? removeFavorite : addFavorite;
    mutation.mutate(universityId, {
      onSuccess: () => {
        toast.success(saved ? "Favorites မှ ဖယ်ရှားပြီးပါပြီ" : "Favorites ထဲသို့ သိမ်းပြီးပါပြီ");
      },
      onError: (error) => {
        toast.error(error instanceof Error ? error.message : "Favorites ပြောင်းလဲ၍ မရပါ");
      },
    });
  };

  if (compact) {
    return (
      <Button
        type="button"
        variant={saved ? "default" : "secondary"}
        size="icon"
        onClick={toggleFavorite}
        disabled={favoritesLoading || mutationPending}
        aria-label={saved ? "Remove from favorites" : "Save to favorites"}
        aria-pressed={saved}
        title={saved ? "Favorites မှ ဖယ်ရှားရန်" : "Favorites ထဲသို့ သိမ်းရန်"}
        className={`h-9 w-9 rounded-full shadow-sm ${saved ? "bg-rose-500 text-white hover:bg-rose-600" : "bg-white/90 text-gray-500 hover:bg-white hover:text-rose-500"}`}
      >
        <Heart className={`h-4 w-4 ${saved ? "fill-current" : ""}`} />
      </Button>
    );
  }

  return (
    <Button
      type="button"
      variant={saved ? "default" : "outline"}
      onClick={toggleFavorite}
      disabled={favoritesLoading || mutationPending}
      aria-pressed={saved}
      className={saved ? "bg-rose-500 hover:bg-rose-600" : undefined}
    >
      <Heart className={`mr-2 h-4 w-4 ${saved ? "fill-current" : ""}`} />
      {saved ? "Saved" : "Save University"}
    </Button>
  );
}
