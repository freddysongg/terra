export interface FireHotspot {
  latitude: number;
  longitude: number;
  brightness: number;
  confidence: "low" | "nominal" | "high";
  acquisitionTimestamp: string;
}
