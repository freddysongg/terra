import * as THREE from "three";
import { useDataStore } from "../stores/data-store.js";
import { useLayerStore } from "../stores/layer-store.js";
import type { NwsAlert } from "@terra/shared";

const POLYGON_RADIUS = 1.005;

const OPACITY_STANDARD = 0.35;
const OPACITY_OTHER = 0.25;

type AlertTier = "Warning" | "Watch" | "Advisory" | "Other";

const ALERT_COLORS: Record<AlertTier, string> = {
  Warning: "#ef4444",
  Watch: "#f97316",
  Advisory: "#fbbf24",
  Other: "#9ca3af",
};

const ALERT_OPACITIES: Record<AlertTier, number> = {
  Warning: OPACITY_STANDARD,
  Watch: OPACITY_STANDARD,
  Advisory: OPACITY_STANDARD,
  Other: OPACITY_OTHER,
};

interface PolygonEntry {
  mesh: THREE.Mesh;
  line: THREE.LineLoop;
  meshGeometry: THREE.BufferGeometry;
  lineGeometry: THREE.BufferGeometry;
  meshMaterial: THREE.MeshBasicMaterial;
  lineMaterial: THREE.LineBasicMaterial;
}

function resolveAlertTier(eventName: string): AlertTier {
  if (eventName.includes("Warning")) return "Warning";
  if (eventName.includes("Watch")) return "Watch";
  if (eventName.includes("Advisory")) return "Advisory";
  return "Other";
}

function latLngToPosition(lat: number, lng: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);
  const theta = (lng + 180) * (Math.PI / 180);
  return new THREE.Vector3(
    -(POLYGON_RADIUS * Math.sin(phi) * Math.cos(theta)),
    POLYGON_RADIUS * Math.cos(phi),
    POLYGON_RADIUS * Math.sin(phi) * Math.sin(theta),
  );
}

function buildFanMeshGeometry(points: THREE.Vector3[]): THREE.BufferGeometry {
  const centroid = new THREE.Vector3();
  for (const point of points) {
    centroid.add(point);
  }
  centroid.divideScalar(points.length);

  const triangleCount = points.length;
  const positions = new Float32Array(triangleCount * 3 * 3);

  for (let i = 0; i < triangleCount; i++) {
    const current = points[i]!;
    const next = points[(i + 1) % triangleCount]!;

    const base = i * 9;
    positions[base + 0] = centroid.x;
    positions[base + 1] = centroid.y;
    positions[base + 2] = centroid.z;
    positions[base + 3] = current.x;
    positions[base + 4] = current.y;
    positions[base + 5] = current.z;
    positions[base + 6] = next.x;
    positions[base + 7] = next.y;
    positions[base + 8] = next.z;
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
  return geometry;
}

function buildPolygonEntry(alert: NwsAlert, parent: THREE.Object3D): PolygonEntry | null {
  if (alert.geometry === null) return null;

  const exteriorRing = alert.geometry.coordinates[0];
  if (!exteriorRing || exteriorRing.length < 3) return null;

  const points = exteriorRing.map(([lng, lat]) => latLngToPosition(lat!, lng!));

  const tier = resolveAlertTier(alert.event);
  const color = ALERT_COLORS[tier];
  const opacity = ALERT_OPACITIES[tier];

  const meshGeometry = buildFanMeshGeometry(points);
  const meshMaterial = new THREE.MeshBasicMaterial({
    color,
    transparent: true,
    opacity,
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(meshGeometry, meshMaterial);

  const lineGeometry = new THREE.BufferGeometry().setFromPoints(points);
  const lineMaterial = new THREE.LineBasicMaterial({ color, linewidth: 1 });
  const line = new THREE.LineLoop(lineGeometry, lineMaterial);

  parent.add(mesh);
  parent.add(line);

  return { mesh, line, meshGeometry, lineGeometry, meshMaterial, lineMaterial };
}

function disposePolygonEntry(entry: PolygonEntry, parent: THREE.Object3D): void {
  parent.remove(entry.mesh);
  parent.remove(entry.line);
  entry.meshGeometry.dispose();
  entry.lineGeometry.dispose();
  entry.meshMaterial.dispose();
  entry.lineMaterial.dispose();
}

export class AlertPolygonRenderer {
  private globe: THREE.Mesh;
  private polygons: Map<string, PolygonEntry> = new Map();
  private isLayerVisible = false;
  private unsubscribeData: () => void;
  private unsubscribeLayer: () => void;

  constructor(_scene: THREE.Scene, globe: THREE.Mesh) {
    this.globe = globe;

    let prevWeatherAlerts = useDataStore.getState().weatherAlerts;
    let prevActiveLayers = useLayerStore.getState().activeLayers;

    this.unsubscribeData = useDataStore.subscribe((state) => {
      if (state.weatherAlerts !== prevWeatherAlerts) {
        prevWeatherAlerts = state.weatherAlerts;
        this.updatePolygons(state.weatherAlerts);
      }
    });

    this.unsubscribeLayer = useLayerStore.subscribe((state) => {
      if (state.activeLayers !== prevActiveLayers) {
        prevActiveLayers = state.activeLayers;
        this.setVisible(state.activeLayers.has("weatherAlerts"));
      }
    });

    this.setVisible(useLayerStore.getState().activeLayers.has("weatherAlerts"));
    this.updatePolygons(useDataStore.getState().weatherAlerts);
  }

  private updatePolygons(alerts: readonly NwsAlert[]): void {
    const incomingIds = new Set(alerts.map((a) => a.id));

    for (const [alertId, entry] of this.polygons) {
      if (!incomingIds.has(alertId)) {
        disposePolygonEntry(entry, this.globe);
        this.polygons.delete(alertId);
      }
    }

    for (const alert of alerts) {
      if (this.polygons.has(alert.id)) continue;

      const entry = buildPolygonEntry(alert, this.globe);
      if (entry === null) continue;

      entry.mesh.visible = this.isLayerVisible;
      entry.line.visible = this.isLayerVisible;

      this.polygons.set(alert.id, entry);
    }
  }

  private setVisible(isVisible: boolean): void {
    this.isLayerVisible = isVisible;

    for (const [, entry] of this.polygons) {
      entry.mesh.visible = isVisible;
      entry.line.visible = isVisible;
    }
  }

  update(): void {
    // no per-frame work required; store subscriptions drive updates
  }

  dispose(): void {
    this.unsubscribeData();
    this.unsubscribeLayer();

    for (const [, entry] of this.polygons) {
      disposePolygonEntry(entry, this.globe);
    }
    this.polygons.clear();
  }
}
