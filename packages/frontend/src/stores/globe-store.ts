import { create } from "zustand";

export interface CursorCoordinates {
  lat: number;
  lng: number;
}

export interface FlyToTarget {
  lat: number;
  lng: number;
}

interface GlobeState {
  loadProgress: number;
  isLoaded: boolean;
  isUserInteracting: boolean;
  isPerformanceMode: boolean;
  cursorCoordinates: CursorCoordinates | null;
  flyToTarget: FlyToTarget | null;
  setLoadProgress: (progress: number) => void;
  setLoaded: () => void;
  setUserInteracting: (interacting: boolean) => void;
  togglePerformanceMode: () => void;
  setCursorCoordinates: (coordinates: CursorCoordinates | null) => void;
  setFlyToTarget: (target: FlyToTarget | null) => void;
}

export const useGlobeStore = create<GlobeState>()((set) => ({
  loadProgress: 0,
  isLoaded: false,
  isUserInteracting: false,
  isPerformanceMode: false,
  cursorCoordinates: null,
  flyToTarget: null,
  setLoadProgress: (progress) => set({ loadProgress: progress }),
  setLoaded: () => set({ isLoaded: true, loadProgress: 100 }),
  setUserInteracting: (isUserInteracting) => set({ isUserInteracting }),
  togglePerformanceMode: () => set((state) => ({ isPerformanceMode: !state.isPerformanceMode })),
  setCursorCoordinates: (cursorCoordinates) => set({ cursorCoordinates }),
  setFlyToTarget: (flyToTarget) => set({ flyToTarget }),
}));
