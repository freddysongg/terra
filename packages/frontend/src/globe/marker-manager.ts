import * as THREE from "three";
import { CSS2DRenderer, CSS2DObject } from "three/addons/renderers/CSS2DRenderer.js";
import { useEventStore } from "../stores/event-store.js";
import { useLayerStore } from "../stores/layer-store.js";
import { CATEGORY_META } from "@terra/shared";
import { computeClusters } from "./clustering.js";
import type { NaturalEvent, EventCategoryId } from "@terra/shared";
import type { ClusterInput, Cluster } from "./clustering.js";

const MARKER_RADIUS = 1.01;
const BACK_FACE_THRESHOLD = 0;
const MARKER_SIZE = 16;
const DOT_SIZE = 16;
const ICON_SIZE = 10;
const LAYER_FADE_DURATION_MS = 300;
const RING_COUNT = 3;
const RING_STAGGER_DELAY_S = 0.5;
const CLUSTER_GRID_CELL_SIZE = 60;
const CLUSTER_MIN_SIZE = 16;
const CLUSTER_MAX_SIZE = 24;

let styleInjected = false;

function injectMarkerStyles(): void {
  if (styleInjected) return;
  styleInjected = true;

  const style = document.createElement("style");
  style.textContent = `
    @keyframes terra-pulse {
      0% { transform: scale(1); opacity: 0.6; }
      100% { transform: scale(2.5); opacity: 0; }
    }
    @keyframes terra-ring {
      0% { transform: scale(1); opacity: 0.8; }
      100% { transform: scale(3); opacity: 0; }
    }
  `;
  document.head.appendChild(style);
}

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
  color: string;
}

interface ClusterBubbleEntry {
  element: HTMLDivElement;
  countLabel: HTMLSpanElement;
}

function clusterBubbleSize(memberCount: number): number {
  return Math.min(CLUSTER_MIN_SIZE + memberCount, CLUSTER_MAX_SIZE);
}

function createClusterBubble(): ClusterBubbleEntry {
  const element = document.createElement("div");
  element.className = "terra-cluster-bubble";
  element.style.cssText = `
    position: absolute;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;
    font-size: 10px;
    font-weight: 700;
    color: #fff;
    text-shadow: 0 1px 2px rgba(0,0,0,0.6);
    border: 1.5px solid rgba(255,255,255,0.5);
    box-shadow: 0 0 8px rgba(0,0,0,0.4);
    transition: opacity 0.2s ease;
  `;

  const countLabel = document.createElement("span");
  element.appendChild(countLabel);

  return { element, countLabel };
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

function createPulseElement(color: string): HTMLDivElement {
  const pulse = document.createElement("div");
  pulse.style.cssText = `
    width: ${DOT_SIZE}px;
    height: ${DOT_SIZE}px;
    border-radius: 50%;
    background: ${color};
    position: absolute;
    inset: 0;
    pointer-events: none;
    animation: terra-pulse 2.5s ease-out infinite;
  `;
  return pulse;
}

function createRingElement(color: string, delayS: number): HTMLDivElement {
  const ring = document.createElement("div");
  ring.style.cssText = `
    width: ${DOT_SIZE}px;
    height: ${DOT_SIZE}px;
    border-radius: 50%;
    border: 1px solid ${color};
    position: absolute;
    inset: 0;
    pointer-events: none;
    animation: terra-ring 1.5s ease-out ${delayS}s infinite;
  `;
  return ring;
}

function createMarkerElement(event: NaturalEvent): HTMLDivElement {
  injectMarkerStyles();

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

  if (event.status === "open") {
    const pulse = createPulseElement(color);
    container.appendChild(pulse);
  }

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
  private clusterBubbles: ClusterBubbleEntry[] = [];
  private clusterOverlay: HTMLDivElement;
  private clusteredMarkerIds: Set<string> = new Set();
  private unsubscribeEvents: () => void;
  private unsubscribeLayers: () => void;
  private unsubscribeSelection: () => void;
  private markerClickedThisFrame = false;
  private selectedEventId: string | null = null;
  private fadingOutIds: Set<string> = new Set();

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

    this.clusterOverlay = document.createElement("div");
    this.clusterOverlay.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      pointer-events: none;
      overflow: hidden;
    `;
    canvas.parentElement?.appendChild(this.clusterOverlay);

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

    this.unsubscribeSelection = useEventStore.subscribe(
      (state, prevState) => {
        if (state.selectedEventId !== prevState.selectedEventId) {
          this.updateSelectionRings(prevState.selectedEventId, state.selectedEventId);
        }
      },
    );

    canvas.addEventListener("click", this.handleCanvasClick);
  }

  private handleCanvasClick = (): void => {
    if (this.markerClickedThisFrame) return;
    useEventStore.getState().clearSelection();
  };

  private removeRings(element: HTMLDivElement): void {
    const rings = element.querySelectorAll(".terra-ring");
    rings.forEach((ring) => ring.remove());
  }

  private addRings(element: HTMLDivElement, color: string): void {
    for (let i = 0; i < RING_COUNT; i++) {
      const ring = createRingElement(color, i * RING_STAGGER_DELAY_S);
      ring.classList.add("terra-ring");
      element.insertBefore(ring, element.firstChild);
    }
  }

  private updateSelectionRings(
    prevSelectedId: string | null,
    nextSelectedId: string | null,
  ): void {
    if (prevSelectedId !== null) {
      const prevEntry = this.markers.get(prevSelectedId);
      if (prevEntry) {
        this.removeRings(prevEntry.element);
      }
    }

    this.selectedEventId = nextSelectedId;

    if (nextSelectedId !== null) {
      const nextEntry = this.markers.get(nextSelectedId);
      if (nextEntry) {
        this.addRings(nextEntry.element, nextEntry.color);
      }
    }
  }

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

      const meta = CATEGORY_META[event.category];
      const color = meta?.color ?? "#ffffff";

      this.markers.set(event.id, {
        object: cssObject,
        element,
        eventId: event.id,
        category: event.category,
        position,
        color,
      });

      if (this.selectedEventId === event.id) {
        this.addRings(element, color);
      }
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

      if (isLayerActive && !entry.object.visible) {
        entry.object.visible = true;
        entry.element.style.transition = `opacity ${LAYER_FADE_DURATION_MS}ms ease`;
        entry.element.style.opacity = "0";
        requestAnimationFrame(() => {
          entry.element.style.opacity = "1";
        });
      } else if (!isLayerActive && entry.object.visible) {
        this.fadingOutIds.add(entry.eventId);
        entry.element.style.transition = `opacity ${LAYER_FADE_DURATION_MS}ms ease`;
        entry.element.style.opacity = "0";
        setTimeout(() => {
          entry.object.visible = false;
          this.fadingOutIds.delete(entry.eventId);
        }, LAYER_FADE_DURATION_MS);
      }
    }
  }

  private updateClusters(): void {
    const activeLayers = useLayerStore.getState().activeLayers;
    const parent = this.canvas.parentElement;
    const width = parent?.clientWidth ?? this.canvas.clientWidth;
    const height = parent?.clientHeight ?? this.canvas.clientHeight;
    const cameraDirection = this.camera.position.clone().normalize().negate();

    const visibleInputs: ClusterInput[] = [];

    for (const [, entry] of this.markers) {
      if (!entry.object.visible) continue;
      if (!activeLayers.has(entry.category)) continue;

      const worldPos = new THREE.Vector3();
      this.globe.localToWorld(worldPos.copy(entry.position));
      const markerNormal = worldPos.clone().normalize();
      const isBackFacing = markerNormal.dot(cameraDirection) < BACK_FACE_THRESHOLD;
      if (isBackFacing) continue;

      const screenPos = projectToScreen(worldPos, this.camera, width, height);
      visibleInputs.push({
        id: entry.eventId,
        screenX: screenPos.x,
        screenY: screenPos.y,
        category: entry.category,
      });
    }

    const clusters = computeClusters(visibleInputs, CLUSTER_GRID_CELL_SIZE);

    this.clusteredMarkerIds.clear();
    const multiMemberClusters: Cluster[] = [];

    for (const cluster of clusters) {
      if (cluster.members.length > 1) {
        multiMemberClusters.push(cluster);
        for (const member of cluster.members) {
          this.clusteredMarkerIds.add(member.id);
        }
      }
    }

    this.reconcileClusterBubbles(multiMemberClusters);
  }

  private reconcileClusterBubbles(clusters: Cluster[]): void {
    while (this.clusterBubbles.length < clusters.length) {
      const bubble = createClusterBubble();
      this.clusterOverlay.appendChild(bubble.element);
      this.clusterBubbles.push(bubble);
    }

    for (let i = 0; i < this.clusterBubbles.length; i++) {
      const bubble = this.clusterBubbles[i]!;
      if (i < clusters.length) {
        const cluster = clusters[i]!;
        const size = clusterBubbleSize(cluster.members.length);
        bubble.element.style.display = "flex";
        bubble.element.style.width = `${size}px`;
        bubble.element.style.height = `${size}px`;
        bubble.element.style.left = `${cluster.centerX - size / 2}px`;
        bubble.element.style.top = `${cluster.centerY - size / 2}px`;
        bubble.element.style.background = cluster.color;
        bubble.countLabel.textContent = String(cluster.members.length);
      } else {
        bubble.element.style.display = "none";
      }
    }
  }

  update(): void {
    const cameraDirection = this.camera.position.clone().normalize().negate();

    this.updateClusters();

    for (const [, entry] of this.markers) {
      if (!entry.object.visible) continue;

      const worldPos = new THREE.Vector3();
      this.globe.localToWorld(worldPos.copy(entry.position));
      const markerNormal = worldPos.clone().normalize();

      const dotProduct = markerNormal.dot(cameraDirection);
      const isBackFacing = dotProduct < BACK_FACE_THRESHOLD;
      const isClustered = this.clusteredMarkerIds.has(entry.eventId);

      if (!this.fadingOutIds.has(entry.eventId)) {
        entry.element.style.opacity = (isBackFacing || isClustered) ? "0" : "1";
      }
      entry.element.style.pointerEvents = (isBackFacing || isClustered) ? "none" : "auto";
    }

    this.css2dRenderer.render(this.scene, this.camera);
  }

  resize(width: number, height: number): void {
    this.css2dRenderer.setSize(width, height);
  }

  dispose(): void {
    this.unsubscribeEvents();
    this.unsubscribeLayers();
    this.unsubscribeSelection();
    this.canvas.removeEventListener("click", this.handleCanvasClick);

    for (const [, entry] of this.markers) {
      this.globe.remove(entry.object);
    }
    this.markers.clear();

    this.css2dRenderer.domElement.remove();
    this.clusterOverlay.remove();
    this.clusterBubbles = [];
    this.clusteredMarkerIds.clear();
  }
}
