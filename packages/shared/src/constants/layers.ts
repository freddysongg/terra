import type { LayerMetadata, LayerId } from "../types/layers.js";

export const LAYER_REGISTRY: Record<LayerId, LayerMetadata> = {
  drought: { id: "drought", label: "Drought", group: "category" },
  dustHaze: { id: "dustHaze", label: "Dust & Haze", group: "category" },
  earthquakes: { id: "earthquakes", label: "Earthquakes", group: "category" },
  floods: { id: "floods", label: "Floods", group: "category" },
  landslides: { id: "landslides", label: "Landslides", group: "category" },
  manmade: { id: "manmade", label: "Manmade", group: "category" },
  seaLakeIce: { id: "seaLakeIce", label: "Sea & Lake Ice", group: "category" },
  severeStorms: { id: "severeStorms", label: "Severe Storms", group: "category" },
  snow: { id: "snow", label: "Snow", group: "category" },
  tempExtremes: { id: "tempExtremes", label: "Temperature Extremes", group: "category" },
  volcanoes: { id: "volcanoes", label: "Volcanoes", group: "category" },
  waterColor: { id: "waterColor", label: "Water Color", group: "category" },
  wildfires: { id: "wildfires", label: "Wildfires", group: "category" },
  fireDensity: { id: "fireDensity", label: "Fire Density (FIRMS)", group: "enhancement" },
  seismicDensity: { id: "seismicDensity", label: "Seismic Density (USGS)", group: "enhancement" },
  weatherAlerts: { id: "weatherAlerts", label: "Weather Alerts (NWS)", group: "enhancement" },
  spaceWeather: { id: "spaceWeather", label: "Space Weather", group: "spaceWeather" },
  satelliteImagery: { id: "satelliteImagery", label: "Satellite Imagery", group: "imagery" },
};
