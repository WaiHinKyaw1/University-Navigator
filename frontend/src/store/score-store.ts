import { create } from "zustand";

export type Stream = "science" | "arts";
export type ScienceSixth = "biology" | "economics";
export type InputMode = "subjects" | "slider";

const initialState = {
  inputMode: "subjects" as InputMode,
  stream: "science" as Stream,
  scienceSixth: "biology" as ScienceSixth,
  scores: {} as Record<string, string>,
  sliderTotal: 240,
  hasSearched: false,
  results: [] as any[],
};

type ScoreState = {
  inputMode: InputMode;
  stream: Stream;
  scienceSixth: ScienceSixth;
  scores: Record<string, string>;
  sliderTotal: number;
  hasSearched: boolean;
  results: any[];

  setInputMode: (v: InputMode) => void;
  setStream: (v: Stream) => void;
  setScienceSixth: (v: ScienceSixth) => void;
  setScores: (v: Record<string, string>) => void;
  setSliderTotal: (v: number) => void;
  setHasSearched: (v: boolean) => void;
  setResults: (v: any[]) => void;

  // Reset store to initial values
  reset: () => void;
};

export const useScoreStore = create<ScoreState>((set) => ({
  ...initialState,

  setInputMode: (v) => set({ inputMode: v }),
  setStream: (v) => set({ stream: v }),
  setScienceSixth: (v) => set({ scienceSixth: v }),
  setScores: (v) => set({ scores: v }),
  setSliderTotal: (v) => set({ sliderTotal: v }),
  setHasSearched: (v) => set({ hasSearched: v }),
  setResults: (v) => set({ results: v }),

  reset: () => set(initialState),
}));
