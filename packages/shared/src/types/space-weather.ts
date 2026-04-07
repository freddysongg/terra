export interface SolarFlare {
  id: string;
  classType: string;
  beginTime: string;
  peakTime: string | null;
  endTime: string | null;
  sourceLocation: string | null;
}

export interface GeomagneticStorm {
  id: string;
  startTime: string;
  kpIndex: number;
}

export interface CoronalMassEjection {
  id: string;
  startTime: string;
  sourceLocation: string | null;
  note: string;
  estimatedEarthArrival: string | null;
}

export interface SpaceWeatherSummary {
  solarFlares: readonly SolarFlare[];
  geomagneticStorms: readonly GeomagneticStorm[];
  coronalMassEjections: readonly CoronalMassEjection[];
}
