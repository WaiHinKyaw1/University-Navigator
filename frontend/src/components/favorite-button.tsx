import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Heart } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";

interface Props {
  universityId: number;
}

export default function FavoriteButton({ universityId }: Props) {
  const { user } = useAuth();

  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(false);

  // Check already saved
  useEffect(() => {
    if (!user) return;

    const checkFavorite = async () => {
      try {
        const token = localStorage.getItem("token");

        const res = await fetch("/api/favorites", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        const data = await res.json();

        const exists = data.some((item: any) => item.id === universityId);

        setSaved(exists);
      } catch (error) {
        console.log(error);
      }
    };

    checkFavorite();
  }, [universityId, user]);

  const toggleFavorite = async () => {
    if (!user) {
      toast.error("Please login first");
      return;
    }

    try {
      setLoading(true);

      const token = localStorage.getItem("token");

      const response = await fetch(
        saved
          ? `/api/favorites/${universityId}`
          : `/api/favorites/${universityId}`,
        {
          method: saved ? "DELETE" : "POST",

          headers: {
            Authorization: `Bearer ${token}`,
          },
        },
      );

      if (!response.ok) {
        throw new Error();
      }

      setSaved(!saved);

      toast.success(saved ? "Removed from favourites" : "Saved to favourites");
    } catch (error) {
      toast.error("Failed to update favourite");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      variant={saved ? "default" : "outline"}
      onClick={toggleFavorite}
      disabled={loading}
      className="mb-4"
    >
      <Heart className={`mr-2 h-4 w-4 ${saved ? "fill-current" : ""}`} />

      {saved ? "Saved" : "Save University"}
    </Button>
  );
}
