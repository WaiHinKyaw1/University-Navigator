import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Link } from "wouter";
import { HeartOff } from "lucide-react";

export default function SavedUniversities() {
  const [universities, setUniversities] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSaved();
  }, []);

  const loadSaved = async () => {
    try {
      const token = localStorage.getItem("token");

      const res = await fetch("/api/favorites", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json();

      setUniversities(data);
    } catch {
      toast.error("Failed loading saved universities");
    } finally {
      setLoading(false);
    }
  };

  const removeFavorite = async (id: number) => {
    try {
      const token = localStorage.getItem("token");

      await fetch(`/api/favorites/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      setUniversities((prev) => prev.filter((item) => item.id !== id));

      toast.success("Removed from saved");
    } catch {
      toast.error("Remove failed");
    }
  };

  if (loading) return <p>Loading...</p>;

  return (
    <div className="mt-6 border rounded-xl p-6 bg-card">
      <h2 className="text-xl font-bold mb-4">Saved Universities</h2>

      {universities.length === 0 ? (
        <p className="text-muted-foreground">No saved universities</p>
      ) : (
        <div className="space-y-3">
          {universities.map((uni) => (
            <div
              key={uni.id}
              className="
flex justify-between items-center
border rounded-lg p-4
"
            >
              <div>
                <Link
                  href={`/universities/${uni.id}`}
                  className="font-semibold hover:text-primary"
                >
                  {uni.name}
                </Link>
              </div>

              <Button
                variant="destructive"
                size="sm"
                onClick={() => removeFavorite(uni.id)}
              >
                <HeartOff className="h-4 w-4 mr-2" />
                Unsave
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
