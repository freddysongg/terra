import type { EventCategoryId } from "./events.js";

export type EnhancementLayerId = "fireDensity" | "seismicDensity";

export type SpaceWeatherLayerId = "spaceWeather";

export type LayerId = EventCategoryId | EnhancementLayerId | SpaceWeatherLayerId;

interface LayerMetadata {
  id: LayerId;
  label: string;
  group: "category" | "enhancement" | "spaceWeather";
}

export type { LayerMetadata };
