import * as THREE from "three";
import { useEventStore } from "../stores/event-store.js";
import { useLayerStore } from "../stores/layer-store.js";
import { CATEGORY_META } from "@terra/shared";
import type { NaturalEvent, EventCategoryId } from "@terra/shared";

const TRACK_RADIUS = 1.012;
const DASH_SIZE = 0.02;
const GAP_SIZE = 0.01;
const TRACK_OPACITY = 0.8;
const DASH_ANIMATION_SPEED = 0.03;
const MIN_GEOMETRY_COUNT = 2;

interface TrackEntry {
  line: THREE.Line;
  geometry: THREE.BufferGeometry;
  material: THREE.LineDashedMaterial;
  category: EventCategoryId;
}

function latLngToVector3(latitude: number, longitude: number): THREE.Vector3 {
  const latRad = (latitude * Math.PI) / 180;
  const lngRad = (longitude * Math.PI) / 180;
  return new THREE.Vector3(
    -Math.cos(latRad) * Math.cos(lngRad) * TRACK_RADIUS,
    Math.sin(latRad) * TRACK_RADIUS,
    Math.cos(latRad) * Math.sin(lngRad) * TRACK_RADIUS,
  );
}

function isMultiGeometryEvent(event: NaturalEvent): boolean {
  return event.geometries.length >= MIN_GEOMETRY_COUNT;
}

function extractPointPositions(event: NaturalEvent): THREE.Vector3[] {
  const positions: THREE.Vector3[] = [];

  for (const geom of event.geometries) {
    if (geom.type !== "Point") continue;

    const longitude = geom.coordinates[0];
    const latitude = geom.coordinates[1];
    if (longitude === undefined || latitude === undefined) continue;

    positions.push(latLngToVector3(latitude, longitude));
  }

  return positions;
}

export class StormTrackRenderer {
  private tracks: Map<string, TrackEntry> = new Map();
  private globe: THREE.Mesh;
  private unsubscribeEvents: () => void;
  private unsubscribeLayers: () => void;

  constructor(_scene: THREE.Scene, globe: THREE.Mesh) {
    this.globe = globe;

    this.syncTracks(useEventStore.getState().events);
    this.applyLayerVisibility(useLayerStore.getState().activeLayers);

    let prevEvents = useEventStore.getState().events;
    this.unsubscribeEvents = useEventStore.subscribe((state) => {
      if (state.events !== prevEvents) {
        prevEvents = state.events;
        this.syncTracks(state.events);
      }
    });

    let prevActiveLayers = useLayerStore.getState().activeLayers;
    this.unsubscribeLayers = useLayerStore.subscribe((state) => {
      if (state.activeLayers !== prevActiveLayers) {
        prevActiveLayers = state.activeLayers;
        this.applyLayerVisibility(state.activeLayers);
      }
    });
  }

  private syncTracks(events: readonly NaturalEvent[]): void {
    const multiGeometryEvents = events.filter(isMultiGeometryEvent);
    const currentIds = new Set(multiGeometryEvents.map((e) => e.id));

    for (const [eventId, entry] of this.tracks) {
      if (!currentIds.has(eventId)) {
        this.disposeTrack(entry);
        this.tracks.delete(eventId);
      }
    }

    for (const event of multiGeometryEvents) {
      if (this.tracks.has(event.id)) continue;

      const positions = extractPointPositions(event);
      if (positions.length < MIN_GEOMETRY_COUNT) continue;

      const meta = CATEGORY_META[event.category];
      const color = meta?.color ?? "#ffffff";

      const geometry = new THREE.BufferGeometry().setFromPoints(positions);
      const material = new THREE.LineDashedMaterial({
        color,
        dashSize: DASH_SIZE,
        gapSize: GAP_SIZE,
        transparent: true,
        opacity: TRACK_OPACITY,
        depthWrite: false,
      });

      const line = new THREE.Line(geometry, material);
      line.computeLineDistances();

      this.globe.add(line);

      this.tracks.set(event.id, {
        line,
        geometry,
        material,
        category: event.category,
      });
    }

    this.applyLayerVisibility(useLayerStore.getState().activeLayers);
  }

  private applyLayerVisibility(activeLayers: Set<string>): void {
    for (const [, entry] of this.tracks) {
      entry.line.visible = activeLayers.has(entry.category);
    }
  }

  private disposeTrack(entry: TrackEntry): void {
    this.globe.remove(entry.line);
    entry.geometry.dispose();
    entry.material.dispose();
  }

  update(): void {
    for (const [, entry] of this.tracks) {
      if (!entry.line.visible) continue;
      entry.material.dashOffset -= DASH_ANIMATION_SPEED;
    }
  }

  dispose(): void {
    this.unsubscribeEvents();
    this.unsubscribeLayers();

    for (const [, entry] of this.tracks) {
      this.disposeTrack(entry);
    }
    this.tracks.clear();
  }
}
