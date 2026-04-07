export interface Region {
  name: string;
  lat: number;
  lng: number;
}

export const REGIONS: readonly Region[] = [
  { name: "Africa", lat: 2.0, lng: 21.0 },
  { name: "Antarctica", lat: -82.0, lng: 0.0 },
  { name: "Arctic", lat: 82.0, lng: 0.0 },
  { name: "Asia", lat: 45.0, lng: 90.0 },
  { name: "Atlantic", lat: 25.0, lng: -35.0 },
  { name: "Australia", lat: -25.0, lng: 134.0 },
  { name: "Caribbean", lat: 18.0, lng: -72.0 },
  { name: "Central America", lat: 14.0, lng: -87.0 },
  { name: "Europe", lat: 50.0, lng: 15.0 },
  { name: "Indian Ocean", lat: -15.0, lng: 75.0 },
  { name: "Middle East", lat: 28.0, lng: 46.0 },
  { name: "North America", lat: 45.0, lng: -100.0 },
  { name: "Pacific", lat: 0.0, lng: -160.0 },
  { name: "South America", lat: -15.0, lng: -58.0 },
  { name: "Southeast Asia", lat: 5.0, lng: 110.0 },
] as const;
