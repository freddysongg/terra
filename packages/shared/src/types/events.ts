export type EventCategoryId =
  | "drought"
  | "dustHaze"
  | "earthquakes"
  | "floods"
  | "landslides"
  | "manmade"
  | "seaLakeIce"
  | "severeStorms"
  | "snow"
  | "tempExtremes"
  | "volcanoes"
  | "waterColor"
  | "wildfires";

export type EventStatus = "open" | "closed";

interface EventGeometry {
  type: "Point" | "Polygon";
  coordinates: [longitude: number, latitude: number];
  timestamp: string;
}

interface EventMagnitude {
  id: string;
  value: number;
  unit: string;
}

export interface NaturalEvent {
  id: string;
  title: string;
  category: EventCategoryId;
  status: EventStatus;
  geometries: readonly EventGeometry[];
  magnitude: EventMagnitude | null;
  sourceUrl: string;
  sourceAgency: string;
  closedDate: string | null;
}

export interface EventCategory {
  id: EventCategoryId;
  title: string;
}

export interface NwsAlert {
  id: string;
  headline: string;
  severity: "Extreme" | "Severe" | "Moderate" | "Minor" | "Unknown";
  event: string;
  areaDesc: string;
  onset: string;
  expires: string;
  senderName: string;
}
