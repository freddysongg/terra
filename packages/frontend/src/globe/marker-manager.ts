import * as THREE from "three";
import { CSS2DRenderer, CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js";
import { useEventStore } from "../stores/event-store.js";
import { useLayerStore } from "../stores/layer-store.js";
import { CATEGORY_META } from "@terra/shared";
import type { NaturalEvent, EventCategoryId } from "@terra/shared";

const MARKER_RADIUS = 1.01;
const BACK_FACE_THRESHOLD = 0;
const MARKER_SIZE = 16;
const DOT_SIZE = 16;
const ICON_SIZE = 10;

type MarkerIconName =
  | "sun-dim"
  | "cloud"
  | "activity"
  | "droplets"
  | "mountain"
  | "alert-triangle"
  | "snowflake"
  | "zap"
  | "cloud-snow"
  | "thermometer"
  | "flame"
  | "waves"
  | "flame-kindling";

const ICON_SVG_PATHS: Record<MarkerIconName, string> = {
  "sun-dim": '<circle cx="12" cy="12" r="4"/><line x1="12" y1="2" x2="12" y2="4"/><line x1="12" y1="20" x2="12" y2="22"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="2" y1="12" x2="4" y2="12"/><line x1="20" y1="12" x2="22" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>',
  "cloud": '<path d="M17.5 19H9a7 7 0 1 1 6.71-9h1.79a4.5 4.5 0 1 1 0 9z"/>',
  "activity": '<polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/>',
  "droplets": '<path d="M7 16.3c2.2 0 4-1.83 4-4.05 0-1.16-.57-2.26-1.71-3.19S7.29 6.75 7 5.3c-.29 1.45-1.14 2.84-2.29 3.76S3 11.1 3 12.25c0 2.22 1.8 4.05 4 4.05z"/><path d="M12.56 6.6A10.97 10.97 0 0 0 14 3.02c.5 2.5 2 4.9 4 6.5s3 3.5 3 5.5a6.98 6.98 0 0 1-11.91 4.97"/>',
  "mountain": '<path d="m8 3 4 8 5-5 5 15H2L8 3z"/>',
  "alert-triangle": '<path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>',
  "snowflake": '<line x1="2" y1="12" x2="22" y2="12"/><line x1="12" y1="2" x2="12" y2="22"/><path d="m20 16-4-4 4-4"/><path d="m4 8 4 4-4 4"/><path d="m16 4-4 4-4-4"/><path d="m8 20 4-4 4 4"/>',
  "zap": '<polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/>',
  "cloud-snow": '<path d="M20 17.58A5 5 0 0 0 18 8h-1.26A8 8 0 1 0 4 16.25"/><line x1="8" y1="16" x2="8.01" y2="16"/><line x1="8" y1="20" x2="8.01" y2="20"/><line x1="12" y1="18" x2="12.01" y2="18"/><line x1="12" y1="22" x2="12.01" y2="22"/><line x1="16" y1="16" x2="16.01" y2="16"/><line x1="16" y1="20" x2="16.01" y2="20"/>',
  "thermometer": '<path d="M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"/>',
  "flame": '<path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/>',
  "waves": '<path d="M2 6c.6.5 1.2 1 2.5 1C7 7 7 5 9.5 5c2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M2 12c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/><path d="M2 18c.6.5 1.2 1 2.5 1 2.5 0 2.5-2 5-2 2.6 0 2.4 2 5 2 2.5 0 2.5-2 5-2 1.3 0 1.9.5 2.5 1"/>',
  "flame-kindling": '<path d="M12 2c1 1.5 2 3 2 5s-1 3-2 4"/><path d="M8.5 2c1 1.5 1.5 3 1.5 5s-.5 3-1.5 4"/><path d="M15.5 2c1 1.5 1.5 3 1.5 5s-.5 3-1.5 4"/><path d="M12 22v-2"/><path d="M6 22v-2"/><path d="M18 22v-2"/><path d="M3 8h18"/><path d="M6 20H3v-2a3 3 0 0 1 3-3h12a3 3 0 0 1 3 3v2h-3"/>',
};

function buildIconSvg(iconName: string, color: string): string {
  const paths = ICON_SVG_PATHS[iconName as MarkerIconName];
  if (!paths) return "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${ICON_SIZE}" height="${ICON_SIZE}" viewBox="0 0 24 24" fill="none" stroke="${color}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${paths}</svg>`;
}

interface MarkerEntry {
  object: CSS2DObject;
  element: HTMLDivElement;
  eventId: string;
  category: EventCategoryId;
  position: THREE.Vector3;
}

function latLngToVector3(latitude: number, longitude: number): THREE.Vector3 {
  const latRad = (latitude * Math.PI) / 180;
  const lngRad = (longitude * Math.PI) / 180;
  return new THREE.Vector3(
    -Math.cos(latRad) * Math.cos(lngRad) * MARKER_RADIUS,
    Math.sin(latRad) * MARKER_RADIUS,
    Math.cos(latRad) * Math.sin(lngRad) * MARKER_RADIUS,
  );
}

function projectToScreen(
  worldPosition: THREE.Vector3,
  camera: THREE.PerspectiveCamera,
  width: number,
  height: number,
): { x: number; y: number } {
  const projected = worldPosition.clone().project(camera);
  return {
    x: (projected.x * 0.5 + 0.5) * width,
    y: (-projected.y * 0.5 + 0.5) * height,
  };
}

function createMarkerElement(event: NaturalEvent): HTMLDivElement {
  const meta = CATEGORY_META[event.category];
  const color = meta?.color ?? "#ffffff";
  const iconName = meta?.icon ?? "activity";

  const container = document.createElement("div");
  container.className = "terra-marker";
  container.style.cssText = `
    pointer-events: auto;
    cursor: pointer;
    width: ${MARKER_SIZE}px;
    height: ${MARKER_SIZE}px;
    position: relative;
  `;

  const dot = document.createElement("div");
  dot.style.cssText = `
    width: ${DOT_SIZE}px;
    height: ${DOT_SIZE}px;
    border-radius: 50%;
    background: ${color};
    border: 1.5px solid rgba(255, 255, 255, 0.6);
    box-shadow: 0 0 6px ${color}80;
    transition: transform 0.15s ease;
    position: absolute;
    inset: 0;
  `;

  const iconWrapper = document.createElement("div");
  iconWrapper.style.cssText = `
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
  `;
  iconWrapper.innerHTML = buildIconSvg(iconName, "rgba(255,255,255,0.9)");

  container.appendChild(dot);
  container.appendChild(iconWrapper);

  container.addEventListener("mouseenter", () => {
    dot.style.transform = "scale(1.4)";
    useEventStore.getState().setHoveredEvent(event.id);
  });

  container.addEventListener("mouseleave", () => {
    dot.style.transform = "scale(1)";
    useEventStore.getState().setHoveredEvent(null);
  });

  return container;
}

export class MarkerManager {
  private css2dRenderer: CSS2DRenderer;
  private markers: Map<string, MarkerEntry> = new Map();
  private unsubscribeEvents: () => void;
  private unsubscribeLayers: () => void;
  private markerClickedThisFrame = false;

  constructor(
    private scene: THREE.Scene,
    private camera: THREE.PerspectiveCamera,
    private canvas: HTMLCanvasElement,
    private globe: THREE.Mesh,
  ) {
    this.css2dRenderer = new CSS2DRenderer();
    this.css2dRenderer.setSize(canvas.clientWidth, canvas.clientHeight);
    this.css2dRenderer.domElement.style.position = "absolute";
    this.css2dRenderer.domElement.style.top = "0";
    this.css2dRenderer.domElement.style.left = "0";
    this.css2dRenderer.domElement.style.pointerEvents = "none";
    canvas.parentElement?.appendChild(this.css2dRenderer.domElement);

    this.unsubscribeEvents = useEventStore.subscribe(
      (state, prevState) => {
        if (state.events !== prevState.events) {
          this.syncMarkers();
        }
      },
    );

    this.unsubscribeLayers = useLayerStore.subscribe(
      (state, prevState) => {
        if (state.activeLayers !== prevState.activeLayers) {
          this.updateVisibility();
        }
      },
    );

    canvas.addEventListener("click", this.handleCanvasClick);
  }

  private handleCanvasClick = (): void => {
    if (this.markerClickedThisFrame) return;
    useEventStore.getState().clearSelection();
  };

  private syncMarkers(): void {
    const events = useEventStore.getState().events;
    const currentIds = new Set(events.map((e) => e.id));

    for (const [eventId, entry] of this.markers) {
      if (!currentIds.has(eventId)) {
        this.globe.remove(entry.object);
        this.markers.delete(eventId);
      }
    }

    for (const event of events) {
      if (this.markers.has(event.id)) continue;

      const lastGeometry = event.geometries[event.geometries.length - 1];
      if (!lastGeometry || lastGeometry.type !== "Point") continue;

      const [longitude, latitude] = lastGeometry.coordinates;
      const position = latLngToVector3(latitude!, longitude!);

      const element = createMarkerElement(event);
      element.addEventListener("click", (e) => {
        e.stopPropagation();
        this.markerClickedThisFrame = true;
        requestAnimationFrame(() => { this.markerClickedThisFrame = false; });
        this.handleMarkerClick(event.id, position);
      });

      const cssObject = new CSS2DObject(element);
      cssObject.position.copy(position);

      this.globe.add(cssObject);

      this.markers.set(event.id, {
        object: cssObject,
        element,
        eventId: event.id,
        category: event.category,
        position,
      });
    }

    this.updateVisibility();
  }

  private handleMarkerClick(eventId: string, markerLocalPosition: THREE.Vector3): void {
    const worldPosition = new THREE.Vector3();
    this.globe.localToWorld(worldPosition.copy(markerLocalPosition));

    const parent = this.canvas.parentElement;
    const width = parent?.clientWidth ?? this.canvas.clientWidth;
    const height = parent?.clientHeight ?? this.canvas.clientHeight;

    const screenPos = projectToScreen(worldPosition, this.camera, width, height);

    const store = useEventStore.getState();
    store.selectEvent(eventId);
    store.setSelectedScreenPosition(screenPos);
  }

  private updateVisibility(): void {
    const activeLayers = useLayerStore.getState().activeLayers;

    for (const [, entry] of this.markers) {
      const isLayerActive = activeLayers.has(entry.category);
      entry.object.visible = isLayerActive;
    }
  }

  update(): void {
    const cameraDirection = this.camera.position.clone().normalize().negate();

    for (const [, entry] of this.markers) {
      if (!entry.object.visible) continue;

      const worldPos = new THREE.Vector3();
      this.globe.localToWorld(worldPos.copy(entry.position));
      const markerNormal = worldPos.clone().normalize();

      const dotProduct = markerNormal.dot(cameraDirection);
      entry.element.style.opacity = dotProduct < BACK_FACE_THRESHOLD ? "0" : "1";
      entry.element.style.pointerEvents = dotProduct < BACK_FACE_THRESHOLD ? "none" : "auto";
    }

    this.css2dRenderer.render(this.scene, this.camera);
  }

  resize(width: number, height: number): void {
    this.css2dRenderer.setSize(width, height);
  }

  dispose(): void {
    this.unsubscribeEvents();
    this.unsubscribeLayers();
    this.canvas.removeEventListener("click", this.handleCanvasClick);

    for (const [, entry] of this.markers) {
      this.globe.remove(entry.object);
    }
    this.markers.clear();

    this.css2dRenderer.domElement.remove();
  }
}
