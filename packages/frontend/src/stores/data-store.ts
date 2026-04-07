import { create } from "zustand";
import type { FireHotspot, Earthquake, SpaceWeatherSummary, NwsAlert } from "@terra/shared";

interface ImageryCoordinates {
  lat: number;
  lng: number;
}

interface DataState {
  fireHotspots: readonly FireHotspot[];
  earthquakes: readonly Earthquake[];
  spaceWeather: SpaceWeatherSummary | null;
  weatherAlerts: readonly NwsAlert[];
  isLoadingFires: boolean;
  isLoadingEarthquakes: boolean;
  isLoadingSpaceWeather: boolean;
  isLoadingWeatherAlerts: boolean;
  activeImageryUrl: string | null;
  imageryEventCoordinates: ImageryCoordinates | null;
  setFireHotspots: (hotspots: readonly FireHotspot[]) => void;
  setEarthquakes: (quakes: readonly Earthquake[]) => void;
  setSpaceWeather: (summary: SpaceWeatherSummary) => void;
  setWeatherAlerts: (alerts: readonly NwsAlert[]) => void;
  setLoadingFires: (loading: boolean) => void;
  setLoadingEarthquakes: (loading: boolean) => void;
  setLoadingSpaceWeather: (loading: boolean) => void;
  setLoadingWeatherAlerts: (loading: boolean) => void;
  setActiveImageryUrl: (url: string | null) => void;
  setImageryEventCoordinates: (coords: ImageryCoordinates | null) => void;
  clearImagery: () => void;
}

export const useDataStore = create<DataState>()((set) => ({
  fireHotspots: [],
  earthquakes: [],
  spaceWeather: null,
  weatherAlerts: [],
  isLoadingFires: false,
  isLoadingEarthquakes: false,
  isLoadingSpaceWeather: false,
  isLoadingWeatherAlerts: false,
  activeImageryUrl: null,
  imageryEventCoordinates: null,
  setFireHotspots: (fireHotspots) => set({ fireHotspots }),
  setEarthquakes: (earthquakes) => set({ earthquakes }),
  setSpaceWeather: (spaceWeather) => set({ spaceWeather }),
  setWeatherAlerts: (weatherAlerts) => set({ weatherAlerts }),
  setLoadingFires: (isLoadingFires) => set({ isLoadingFires }),
  setLoadingEarthquakes: (isLoadingEarthquakes) => set({ isLoadingEarthquakes }),
  setLoadingSpaceWeather: (isLoadingSpaceWeather) => set({ isLoadingSpaceWeather }),
  setLoadingWeatherAlerts: (isLoadingWeatherAlerts) => set({ isLoadingWeatherAlerts }),
  setActiveImageryUrl: (activeImageryUrl) => set({ activeImageryUrl }),
  setImageryEventCoordinates: (imageryEventCoordinates) => set({ imageryEventCoordinates }),
  clearImagery: () => set({ activeImageryUrl: null, imageryEventCoordinates: null }),
}));
