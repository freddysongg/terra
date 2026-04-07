import { create } from "zustand";

interface GlobeState {
  loadProgress: number;
  isLoaded: boolean;
  isUserInteracting: boolean;
  isPerformanceMode: boolean;
  setLoadProgress: (progress: number) => void;
  setLoaded: () => void;
  setUserInteracting: (interacting: boolean) => void;
  togglePerformanceMode: () => void;
}

export const useGlobeStore = create<GlobeState>()((set) => ({
  loadProgress: 0,
  isLoaded: false,
  isUserInteracting: false,
  isPerformanceMode: false,
  setLoadProgress: (progress) => set({ loadProgress: progress }),
  setLoaded: () => set({ isLoaded: true, loadProgress: 100 }),
  setUserInteracting: (isUserInteracting) => set({ isUserInteracting }),
  togglePerformanceMode: () => set((state) => ({ isPerformanceMode: !state.isPerformanceMode })),
}));
