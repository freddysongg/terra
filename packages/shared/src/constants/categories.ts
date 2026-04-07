import type { EventCategoryId } from "../types/events.js";

interface CategoryMeta {
  label: string;
  color: string;
}

export const CATEGORY_META: Record<EventCategoryId, CategoryMeta> = {
  drought: { label: "Drought", color: "#d4a574" },
  dustHaze: { label: "Dust & Haze", color: "#c4a882" },
  earthquakes: { label: "Earthquakes", color: "#ffd700" },
  floods: { label: "Floods", color: "#4a90d9" },
  landslides: { label: "Landslides", color: "#8b6914" },
  manmade: { label: "Manmade", color: "#ff6b6b" },
  seaLakeIce: { label: "Sea & Lake Ice", color: "#a8d8ea" },
  severeStorms: { label: "Severe Storms", color: "#6b8dd6" },
  snow: { label: "Snow", color: "#e8e8f0" },
  tempExtremes: { label: "Temperature Extremes", color: "#ff4500" },
  volcanoes: { label: "Volcanoes", color: "#dc143c" },
  waterColor: { label: "Water Color", color: "#20b2aa" },
  wildfires: { label: "Wildfires", color: "#ff8c00" },
};
