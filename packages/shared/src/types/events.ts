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

export interface NwsAlertGeometry {
  type: "Polygon";
  coordinates: number[][][];
}

export interface NwsAlert {
  id: string;
  event: string;
  severity: "Extreme" | "Severe" | "Moderate" | "Minor" | "Unknown";
  urgency: "Immediate" | "Expected" | "Future" | "Past" | "Unknown";
  headline: string;
  description: string;
  geometry: NwsAlertGeometry | null;
  onset: string;
  expiration: string;
  senderName: string;
}
