import type { EventCategoryId } from "../types/events.js";

interface CategoryMeta {
  label: string;
  color: string;
}

export const CATEGORY_META: Record<EventCategoryId, CategoryMeta> = {
  drought: { label: "Drought", color: "#c4956a" },
  dustHaze: { label: "Dust & Haze", color: "#a89882" },
  earthquakes: { label: "Earthquakes", color: "#f5a623" },
  floods: { label: "Floods", color: "#00bcd4" },
  landslides: { label: "Landslides", color: "#8b6914" },
  manmade: { label: "Manmade", color: "#9c7cb5" },
  seaLakeIce: { label: "Sea & Lake Ice", color: "#b3e5fc" },
  severeStorms: { label: "Severe Storms", color: "#4e9eff" },
  snow: { label: "Snow", color: "#e0f0ff" },
  tempExtremes: { label: "Temperature Extremes", color: "#ff4081" },
  volcanoes: { label: "Volcanoes", color: "#e8403f" },
  waterColor: { label: "Water Color", color: "#26a69a" },
  wildfires: { label: "Wildfires", color: "#ff6b35" },
};
