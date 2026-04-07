import type { EventCategoryId } from "../types/events.js";

interface CategoryMeta {
  label: string;
  color: string;
  icon: string;
}

export const CATEGORY_META: Record<EventCategoryId, CategoryMeta> = {
  drought: { label: "Drought", color: "#c4956a", icon: "sun-dim" },
  dustHaze: { label: "Dust & Haze", color: "#a89882", icon: "cloud" },
  earthquakes: { label: "Earthquakes", color: "#f5a623", icon: "activity" },
  floods: { label: "Floods", color: "#00bcd4", icon: "droplets" },
  landslides: { label: "Landslides", color: "#8b6914", icon: "mountain" },
  manmade: { label: "Manmade", color: "#9c7cb5", icon: "alert-triangle" },
  seaLakeIce: { label: "Sea & Lake Ice", color: "#b3e5fc", icon: "snowflake" },
  severeStorms: { label: "Severe Storms", color: "#4e9eff", icon: "zap" },
  snow: { label: "Snow", color: "#e0f0ff", icon: "cloud-snow" },
  tempExtremes: { label: "Temperature Extremes", color: "#ff4081", icon: "thermometer" },
  volcanoes: { label: "Volcanoes", color: "#e8403f", icon: "flame" },
  waterColor: { label: "Water Color", color: "#26a69a", icon: "waves" },
  wildfires: { label: "Wildfires", color: "#ff6b35", icon: "flame-kindling" },
};
