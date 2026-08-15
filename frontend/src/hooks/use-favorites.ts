import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "./use-auth";

export type FavoriteUniversity = {
  id: number;
  name: string;
  nameEn: string;
  abbreviation: string | null;
  type: string;
  state: string;
  city: string | null;
  minScore: number;
  description: string | null;
  website: string | null;
  imageUrl: string | null;
  createdAt: string;
};

export type Favorite = {
  favoriteId: number;
  savedAt: string;
  university: FavoriteUniversity;
};

export const FAVORITES_QUERY_KEY = ["favorites"] as const;

async function requestFavorites<T>(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<T> {
  const token = localStorage.getItem("token");
  const response = await fetch(input, {
    ...init,
    headers: {
      ...(init?.headers ?? {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
    },
  });

  const body = await response.json().catch(() => null);
  if (!response.ok) {
    throw new Error(body?.error || "Favorites request failed");
  }

  return body as T;
}

export function useFavorites() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const query = useQuery<Favorite[]>({
    queryKey: FAVORITES_QUERY_KEY,
    queryFn: () => requestFavorites<Favorite[]>("/api/favorites"),
    enabled: Boolean(user),
    staleTime: 30_000,
    retry: 1,
  });

  const addMutation = useMutation({
    mutationFn: (universityId: number) =>
      requestFavorites<{ message: string }>(`/api/favorites/${universityId}`, {
        method: "POST",
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: FAVORITES_QUERY_KEY });
    },
  });

  const removeMutation = useMutation({
    mutationFn: (universityId: number) =>
      requestFavorites<{ message: string }>(`/api/favorites/${universityId}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: FAVORITES_QUERY_KEY });
    },
  });

  const favoriteIds = new Set(
    (query.data ?? []).map((favorite) => favorite.university.id),
  );

  return {
    favorites: query.data ?? [],
    favoriteIds,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    isError: query.isError,
    error: query.error,
    addFavorite: addMutation,
    removeFavorite: removeMutation,
  };
}
