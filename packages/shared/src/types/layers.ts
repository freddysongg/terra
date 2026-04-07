import type { EventCategoryId } from "./events.js";

export type EnhancementLayerId = "fireDensity" | "seismicDensity" | "weatherAlerts";

export type SpaceWeatherLayerId = "spaceWeather";

export type ImageryLayerId = "satelliteImagery";

export type LayerId = EventCategoryId | EnhancementLayerId | SpaceWeatherLayerId | ImageryLayerId;

interface LayerMetadata {
  id: LayerId;
  label: string;
  group: "category" | "enhancement" | "spaceWeather" | "imagery";
}

export type { LayerMetadata };
