import * as THREE from "three";
import { CSS2DRenderer, CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js";
import { useEventStore } from "../stores/event-store.js";
import { useLayerStore } from "../stores/layer-store.js";
import { CATEGORY_META } from "@terra/shared";
import type { NaturalEvent, EventCategoryId } from "@terra/shared";

const MARKER_RADIUS = 1.01;
const BACK_FACE_THRESHOLD = 0;

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
  const color = CATEGORY_META[event.category]?.color ?? "#ffffff";

  const container = document.createElement("div");
  container.className = "terra-marker";
  container.style.cssText = `
    pointer-events: auto;
    cursor: pointer;
    width: 12px;
    height: 12px;
    position: relative;
  `;

  const dot = document.createElement("div");
  dot.style.cssText = `
    width: 12px;
    height: 12px;
    border-radius: 50%;
    background: ${color};
    border: 1.5px solid rgba(255, 255, 255, 0.6);
    box-shadow: 0 0 6px ${color}80;
    transition: transform 0.15s ease;
  `;

  container.appendChild(dot);

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
