import * as THREE from "three";
import { useDataStore } from "../stores/data-store.js";

const OVERLAY_RADIUS = 1.006;
const PATCH_HALF_EXTENT_RAD = 0.09;
const PATCH_SEGMENTS = 32;

interface ImageryState {
  url: string;
  lat: number;
  lng: number;
}

function buildPatchGeometry(lat: number, lng: number): THREE.SphereGeometry {
  const latRad = (lat * Math.PI) / 180;
  const lngRad = (lng * Math.PI) / 180;

  /**
   * THREE.SphereGeometry params: radius, widthSegs, heightSegs, phiStart, phiLength, thetaStart, thetaLength
   * phi controls longitude (horizontal), theta controls latitude (vertical, from north pole).
   * The globe is rotated -PI/2 on Y, so we offset phi to compensate.
   */
  const phiStart = Math.PI / 2 + lngRad - PATCH_HALF_EXTENT_RAD;
  const phiLength = PATCH_HALF_EXTENT_RAD * 2;
  const thetaStart = Math.PI / 2 - latRad - PATCH_HALF_EXTENT_RAD;
  const thetaLength = PATCH_HALF_EXTENT_RAD * 2;

  return new THREE.SphereGeometry(
    OVERLAY_RADIUS,
    PATCH_SEGMENTS,
    PATCH_SEGMENTS,
    phiStart,
    phiLength,
    thetaStart,
    thetaLength,
  );
}

export class ImageryOverlay {
  private patchMesh: THREE.Mesh | null = null;
  private patchGeometry: THREE.SphereGeometry | null = null;
  private patchMaterial: THREE.MeshBasicMaterial | null = null;
  private loadedTexture: THREE.Texture | null = null;
  private textureLoader = new THREE.TextureLoader().setCrossOrigin("anonymous");
  private unsubscribe: () => void;
  private currentState: ImageryState | null = null;

  constructor(private globe: THREE.Mesh) {
    let prevUrl = useDataStore.getState().activeImageryUrl;
    let prevCoords = useDataStore.getState().imageryEventCoordinates;

    this.unsubscribe = useDataStore.subscribe((state) => {
      const urlChanged = state.activeImageryUrl !== prevUrl;
      const coordsChanged = state.imageryEventCoordinates !== prevCoords;
      prevUrl = state.activeImageryUrl;
      prevCoords = state.imageryEventCoordinates;

      if (!urlChanged && !coordsChanged) return;

      if (!state.activeImageryUrl || !state.imageryEventCoordinates) {
        this.clearOverlay();
        return;
      }

      this.showOverlay(
        state.activeImageryUrl,
        state.imageryEventCoordinates.lat,
        state.imageryEventCoordinates.lng,
      );
    });
  }

  private showOverlay(url: string, lat: number, lng: number): void {
    if (
      this.currentState &&
      this.currentState.url === url &&
      this.currentState.lat === lat &&
      this.currentState.lng === lng
    ) {
      return;
    }

    this.clearOverlay();
    this.currentState = { url, lat, lng };

    this.textureLoader.load(
      url,
      (texture) => {
        /**
         * Guard against a race where clearOverlay was called
         * between the load call and the callback firing.
         */
        if (!this.currentState || this.currentState.url !== url) {
          texture.dispose();
          return;
        }

        this.loadedTexture = texture;
        this.patchGeometry = buildPatchGeometry(lat, lng);
        this.patchMaterial = new THREE.MeshBasicMaterial({
          map: texture,
          transparent: true,
          opacity: 0.85,
          depthWrite: false,
          side: THREE.FrontSide,
        });
        this.patchMesh = new THREE.Mesh(this.patchGeometry, this.patchMaterial);
        this.globe.add(this.patchMesh);
      },
      undefined,
      (err) => {
        console.error("imagery overlay texture load failed:", err);
        this.clearOverlay();
      },
    );
  }

  private clearOverlay(): void {
    if (this.patchMesh) {
      this.globe.remove(this.patchMesh);
    }
    this.patchGeometry?.dispose();
    this.patchMaterial?.dispose();
    this.loadedTexture?.dispose();
    this.patchMesh = null;
    this.patchGeometry = null;
    this.patchMaterial = null;
    this.loadedTexture = null;
    this.currentState = null;
  }

  update(): void {}

  dispose(): void {
    this.unsubscribe();
    this.clearOverlay();
  }
}
