import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import type { University } from "@workspace/api-client-react";

export const MAX_COMPARE_UNIVERSITIES = 4;
const STORAGE_KEY = "university-navigator.compare";

type CompareContextValue = {
  universities: University[];
  isSelected: (universityId: number) => boolean;
  canAdd: boolean;
  addUniversity: (university: University) => void;
  removeUniversity: (universityId: number) => void;
  clearUniversities: () => void;
};

const CompareContext = createContext<CompareContextValue | null>(null);

function readStoredUniversities(): University[] {
  if (typeof window === "undefined") return [];

  try {
    const stored = window.localStorage.getItem(STORAGE_KEY);
    if (!stored) return [];

    const parsed = JSON.parse(stored) as unknown;
    if (!Array.isArray(parsed)) return [];

    return parsed
      .filter(
        (university): university is University =>
          typeof university === "object" &&
          university !== null &&
          typeof (university as University).id === "number" &&
          typeof (university as University).name === "string",
      )
      .slice(0, MAX_COMPARE_UNIVERSITIES);
  } catch {
    return [];
  }
}

export function CompareProvider({ children }: { children: React.ReactNode }) {
  const [universities, setUniversities] = useState<University[]>(
    readStoredUniversities,
  );

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(universities));
  }, [universities]);

  const isSelected = useCallback(
    (universityId: number) =>
      universities.some((university) => university.id === universityId),
    [universities],
  );

  const addUniversity = useCallback((university: University) => {
    setUniversities((current) => {
      if (current.some((item) => item.id === university.id)) return current;
      if (current.length >= MAX_COMPARE_UNIVERSITIES) return current;
      return [...current, university];
    });
  }, []);

  const removeUniversity = useCallback((universityId: number) => {
    setUniversities((current) =>
      current.filter((university) => university.id !== universityId),
    );
  }, []);

  const clearUniversities = useCallback(() => {
    setUniversities([]);
  }, []);

  const value = useMemo(
    () => ({
      universities,
      isSelected,
      canAdd: universities.length < MAX_COMPARE_UNIVERSITIES,
      addUniversity,
      removeUniversity,
      clearUniversities,
    }),
    [
      universities,
      isSelected,
      addUniversity,
      removeUniversity,
      clearUniversities,
    ],
  );

  return (
    <CompareContext.Provider value={value}>
      {children}
    </CompareContext.Provider>
  );
}

export function useCompare() {
  const context = useContext(CompareContext);
  if (!context) {
    throw new Error("useCompare must be used inside CompareProvider");
  }
  return context;
}
