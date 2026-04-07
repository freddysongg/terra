import { describe, it, expect, beforeEach } from "vitest";
import { useDataStore } from "../data-store.js";
import type { FireHotspot, Earthquake, SpaceWeatherSummary, NwsAlert } from "@terra/shared";

const MOCK_HOTSPOT: FireHotspot = {
  latitude: 44.0,
  longitude: -121.5,
  brightness: 350,
  confidence: "high",
  acquisitionTimestamp: "2026-04-01T00:00:00Z",
};

const MOCK_EARTHQUAKE: Earthquake = {
  id: "us7000abc",
  title: "M 5.2 - Central California",
  magnitude: 5.2,
  latitude: 36.5,
  longitude: -120.1,
  depth: 10.5,
  timestamp: "2026-04-01T12:00:00Z",
  detailUrl: "https://earthquake.usgs.gov/earthquakes/eventpage/us7000abc",
};

const MOCK_SPACE_WEATHER: SpaceWeatherSummary = {
  solarFlares: [
    {
      id: "2026-04-01-001",
      classType: "M1.2",
      beginTime: "2026-04-01T08:00:00Z",
      peakTime: "2026-04-01T08:30:00Z",
      endTime: "2026-04-01T09:00:00Z",
      sourceLocation: "N20W30",
    },
  ],
  geomagneticStorms: [],
};

const MOCK_ALERT: NwsAlert = {
  id: "urn:oid:2.49.0.1.840.0.abc",
  headline: "Tornado Warning",
  severity: "Extreme",
  event: "Tornado Warning",
  areaDesc: "Central Oklahoma",
  onset: "2026-04-01T18:00:00Z",
  expires: "2026-04-01T19:00:00Z",
  senderName: "NWS Norman OK",
};

describe("data-store", () => {
  beforeEach(() => {
    useDataStore.setState(useDataStore.getInitialState());
  });

  it("starts with empty data and no loading flags", () => {
    const state = useDataStore.getState();
    expect(state.fireHotspots).toEqual([]);
    expect(state.earthquakes).toEqual([]);
    expect(state.spaceWeather).toBeNull();
    expect(state.weatherAlerts).toEqual([]);
    expect(state.isLoadingFires).toBe(false);
    expect(state.isLoadingEarthquakes).toBe(false);
    expect(state.isLoadingSpaceWeather).toBe(false);
    expect(state.isLoadingWeatherAlerts).toBe(false);
  });

  it("sets fire hotspots", () => {
    useDataStore.getState().setFireHotspots([MOCK_HOTSPOT]);
    expect(useDataStore.getState().fireHotspots).toHaveLength(1);
    expect(useDataStore.getState().fireHotspots[0]!.brightness).toBe(350);
  });

  it("sets earthquakes", () => {
    useDataStore.getState().setEarthquakes([MOCK_EARTHQUAKE]);
    expect(useDataStore.getState().earthquakes).toHaveLength(1);
    expect(useDataStore.getState().earthquakes[0]!.magnitude).toBe(5.2);
  });

  it("sets space weather summary", () => {
    useDataStore.getState().setSpaceWeather(MOCK_SPACE_WEATHER);
    const sw = useDataStore.getState().spaceWeather;
    expect(sw).not.toBeNull();
    expect(sw!.solarFlares).toHaveLength(1);
  });

  it("sets weather alerts", () => {
    useDataStore.getState().setWeatherAlerts([MOCK_ALERT]);
    expect(useDataStore.getState().weatherAlerts).toHaveLength(1);
    expect(useDataStore.getState().weatherAlerts[0]!.severity).toBe("Extreme");
  });

  it("tracks loading states independently", () => {
    useDataStore.getState().setLoadingFires(true);
    useDataStore.getState().setLoadingEarthquakes(true);
    expect(useDataStore.getState().isLoadingFires).toBe(true);
    expect(useDataStore.getState().isLoadingEarthquakes).toBe(true);
    expect(useDataStore.getState().isLoadingSpaceWeather).toBe(false);

    useDataStore.getState().setLoadingFires(false);
    expect(useDataStore.getState().isLoadingFires).toBe(false);
    expect(useDataStore.getState().isLoadingEarthquakes).toBe(true);
  });
});
