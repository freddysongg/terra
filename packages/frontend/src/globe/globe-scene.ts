import * as THREE from "three";
import { OrbitControls } from "three/addons/controls/OrbitControls.js";
import { createStarField } from "./stars.js";
import { createAtmosphere } from "./atmosphere.js";
import { createPostProcessing } from "./post-processing.js";
import { createOceanColorMap } from "./textures/ocean-color.js";
import { createContourTexture } from "./textures/contour-lines.js";
import { createFallbackNightTexture } from "./textures/fallback-night.js";
import { loadGlobeTextures, applyTextureSettings } from "./textures/texture-loader.js";
import { MarkerManager } from "./marker-manager.js";
import { EnhancementRenderer } from "./enhancement-renderer.js";
import { AlertPolygonRenderer } from "./alert-polygon-renderer.js";
import { createAurora } from "./aurora.js";
import { StormTrackRenderer } from "./storm-tracks.js";
import { ImageryOverlay } from "./imagery-overlay.js";
import { useEventStore } from "../stores/event-store.js";
import { useGlobeStore } from "../stores/globe-store.js";
import globeSurfaceVert from "./shaders/globe-surface.vert";
import globeSurfaceFrag from "./shaders/globe-surface.frag";

const BACKGROUND_COLOR = 0x040a16;
const AUTO_ROTATE_SPEED = 0.25;
const GLOBE_TILT_DEG = 12;

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

interface GlobeSceneConfig {
  canvas: HTMLCanvasElement;
  onProgress?: (progress: number) => void;
  onReady?: () => void;
}

export class GlobeScene {
  private renderer: THREE.WebGLRenderer;
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private controls: OrbitControls;
  private animationFrameId: number | null = null;
  private resizeObserver: ResizeObserver;
  private markerManager: MarkerManager | null = null;
  private enhancementRenderer: EnhancementRenderer | null = null;
  private alertPolygonRenderer: AlertPolygonRenderer | null = null;
  private stormTrackRenderer: StormTrackRenderer | null = null;
  private imageryOverlay: ImageryOverlay | null = null;
  private aurora: ReturnType<typeof createAurora> | null = null;
  private raycaster = new THREE.Raycaster();
  private cursorNdc = new THREE.Vector2();
  private isCursorOverCanvas = false;

  private flyToProgress: number | null = null;
  private flyToStart = new THREE.Vector3();
  private flyToEnd = new THREE.Vector3();
  private unsubFlyTo: (() => void) | null = null;
  private unsubPerformanceMode: (() => void) | null = null;
  private isPerformanceMode = false;

  private atmosphere: ReturnType<typeof createAtmosphere> | null = null;
  private postProcessing: ReturnType<typeof createPostProcessing> | null = null;
  private globe: THREE.Mesh | null = null;
  private globeMaterial: THREE.ShaderMaterial | null = null;
  private contourMesh: THREE.Mesh | null = null;
  private starField: THREE.Points | null = null;
  private globeGeometry: THREE.SphereGeometry | null = null;
  private contourGeometry: THREE.SphereGeometry | null = null;
  private contourMaterial: THREE.MeshBasicMaterial | null = null;
  private oceanColorMap: THREE.CanvasTexture | null = null;
  private clock = new THREE.Clock();

  constructor(private config: GlobeSceneConfig) {
    const { canvas } = config;

    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(BACKGROUND_COLOR);

    this.camera = new THREE.PerspectiveCamera(
      45,
      canvas.clientWidth / canvas.clientHeight,
      0.1,
      200,
    );
    this.camera.position.set(0, 0.4, 3.5);

    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
    this.renderer.setSize(canvas.clientWidth, canvas.clientHeight);
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;

    this.controls = this.createControls();

    this.resizeObserver = new ResizeObserver(this.handleResize);
    this.resizeObserver.observe(canvas.parentElement ?? canvas);

    this.starField = createStarField();
    this.scene.add(this.starField);

    canvas.addEventListener("mousemove", this.handleMouseMove);
    canvas.addEventListener("mouseleave", this.handleMouseLeave);

    this.unsubFlyTo = useGlobeStore.subscribe((state, prev) => {
      if (state.flyToTarget === prev.flyToTarget) return;
      const target = state.flyToTarget;
      if (!target) return;
      this.startFlyTo(target.lat, target.lng);
      useGlobeStore.getState().setFlyToTarget(null);
    });

    this.unsubPerformanceMode = useGlobeStore.subscribe((state, prev) => {
      if (state.isPerformanceMode === prev.isPerformanceMode) return;
      this.applyPerformanceMode(state.isPerformanceMode);
    });

    this.init().catch((err) => {
      console.error("globe scene initialization failed:", err);
    });
  }

  private createControls(): OrbitControls {
    const controls = new OrbitControls(this.camera, this.config.canvas);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 1.8;
    controls.maxDistance = 3.5;
    controls.enablePan = false;
    controls.autoRotate = true;
    controls.autoRotateSpeed = AUTO_ROTATE_SPEED;

    controls.addEventListener("start", () => {
      controls.autoRotate = false;
      useEventStore.getState().clearSelection();
    });

    return controls;
  }

  private async init(): Promise<void> {
    const { onProgress, onReady } = this.config;

    const { night, topo } = await loadGlobeTextures(onProgress);
    onProgress?.(60);

    const maxAniso = this.renderer.capabilities.getMaxAnisotropy();
    if (night) applyTextureSettings(night, maxAniso, THREE.SRGBColorSpace);
    if (topo) applyTextureSettings(topo, maxAniso, THREE.LinearSRGBColorSpace);

    const finalNight = night ?? createFallbackNightTexture();
    onProgress?.(75);

    this.oceanColorMap = createOceanColorMap();
    this.globeMaterial = new THREE.ShaderMaterial({
      vertexShader: globeSurfaceVert,
      fragmentShader: globeSurfaceFrag,
      uniforms: {
        uNightMap: { value: finalNight },
        uTopoMap: { value: topo ?? this.createFlatTexture() },
        uOceanMap: { value: this.oceanColorMap },
      },
    });

    this.globeGeometry = new THREE.SphereGeometry(1, 200, 200);
    this.globe = new THREE.Mesh(this.globeGeometry, this.globeMaterial);
    this.globe.rotation.y = -Math.PI / 2;
    this.globe.rotation.x = THREE.MathUtils.degToRad(GLOBE_TILT_DEG);
    this.scene.add(this.globe);

    this.contourGeometry = new THREE.SphereGeometry(1.003, 200, 200);
    this.contourMaterial = new THREE.MeshBasicMaterial({
      map: createContourTexture(),
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    this.contourMesh = new THREE.Mesh(this.contourGeometry, this.contourMaterial);
    this.globe.add(this.contourMesh);

    this.aurora = createAurora();
    this.globe.add(this.aurora.mesh);

    onProgress?.(85);

    this.atmosphere = createAtmosphere(this.camera);
    this.postProcessing = createPostProcessing(this.renderer, this.scene, this.camera);

    this.markerManager = new MarkerManager(
      this.scene,
      this.camera,
      this.config.canvas,
      this.globe,
    );

    this.enhancementRenderer = new EnhancementRenderer(this.scene, this.globe);
    this.alertPolygonRenderer = new AlertPolygonRenderer(this.scene, this.globe);
    this.stormTrackRenderer = new StormTrackRenderer(this.scene, this.globe);
    this.imageryOverlay = new ImageryOverlay(this.globe);

    onProgress?.(100);
    onReady?.();

    this.animate();
  }

  private createFlatTexture(): THREE.CanvasTexture {
    const canvas = document.createElement("canvas");
    canvas.width = 4;
    canvas.height = 4;
    canvas.getContext("2d")!.fillRect(0, 0, 4, 4);
    return new THREE.CanvasTexture(canvas);
  }

  private latLngToTarget(lat: number, lng: number): THREE.Vector3 {
    const latRad = (lat * Math.PI) / 180;
    const lngRad = (lng * Math.PI) / 180;
    return new THREE.Vector3(
      Math.cos(latRad) * Math.cos(lngRad),
      Math.sin(latRad),
      -Math.cos(latRad) * Math.sin(lngRad),
    ).multiplyScalar(0.01);
  }

  private startFlyTo(lat: number, lng: number): void {
    this.flyToStart.copy(this.controls.target);
    this.flyToEnd.copy(this.latLngToTarget(lat, lng));
    this.flyToProgress = 0;
    this.controls.autoRotate = false;
  }

  private updateFlyTo(deltaTime: number): void {
    if (this.flyToProgress === null) return;

    const FLY_TO_DURATION = 1.0;
    this.flyToProgress = Math.min(this.flyToProgress + deltaTime / FLY_TO_DURATION, 1.0);
    const t = easeInOutCubic(this.flyToProgress);
    this.controls.target.lerpVectors(this.flyToStart, this.flyToEnd, t);

    if (this.flyToProgress >= 1.0) {
      this.flyToProgress = null;
    }
  }

  private applyPerformanceMode(isOn: boolean): void {
    this.isPerformanceMode = isOn;

    if (this.contourMesh) {
      this.contourMesh.visible = !isOn;
    }
  }

  private animate = (): void => {
    this.animationFrameId = requestAnimationFrame(this.animate);
    const deltaTime = this.clock.getDelta();
    this.controls.update();
    this.aurora?.update(this.clock.elapsedTime);
    this.updateFlyTo(deltaTime);
    this.updateCursorCoordinates();

    if (this.postProcessing && this.atmosphere) {
      if (this.isPerformanceMode) {
        /* Bypass the entire post-processing pipeline to save GPU work */
        this.renderer.render(this.scene, this.camera);
      } else {
        this.postProcessing.composer.render();
      }
      this.renderer.autoClear = false;
      this.renderer.render(this.atmosphere.scene, this.camera);
      this.renderer.autoClear = true;
    }
    this.markerManager?.update();
    this.enhancementRenderer?.update();
    this.alertPolygonRenderer?.update();
    this.stormTrackRenderer?.update();
    this.imageryOverlay?.update();
  };

  private updateCursorCoordinates(): void {
    if (!this.globe || !this.isCursorOverCanvas) {
      if (useGlobeStore.getState().cursorCoordinates !== null) {
        useGlobeStore.getState().setCursorCoordinates(null);
      }
      return;
    }

    this.raycaster.setFromCamera(this.cursorNdc, this.camera);
    const intersections = this.raycaster.intersectObject(this.globe);

    if (intersections.length === 0) {
      if (useGlobeStore.getState().cursorCoordinates !== null) {
        useGlobeStore.getState().setCursorCoordinates(null);
      }
      return;
    }

    const localPoint = this.globe.worldToLocal(intersections[0]!.point.clone()).normalize();
    const lat = Math.asin(localPoint.y) * (180 / Math.PI);
    const lng = Math.atan2(localPoint.z, -localPoint.x) * (180 / Math.PI);

    useGlobeStore.getState().setCursorCoordinates({ lat, lng });
  }

  private handleMouseMove = (event: MouseEvent): void => {
    const rect = this.config.canvas.getBoundingClientRect();
    this.cursorNdc.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.cursorNdc.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.isCursorOverCanvas = true;
  };

  private handleMouseLeave = (): void => {
    this.isCursorOverCanvas = false;
  };

  private handleResize = (): void => {
    const parent = this.config.canvas.parentElement;
    if (!parent) return;
    const width = parent.clientWidth;
    const height = parent.clientHeight;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.postProcessing?.resize(width, height);
    this.markerManager?.resize(width, height);
  };

  dispose(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
    }
    this.config.canvas.removeEventListener("mousemove", this.handleMouseMove);
    this.config.canvas.removeEventListener("mouseleave", this.handleMouseLeave);
    this.unsubFlyTo?.();
    this.unsubPerformanceMode?.();
    this.resizeObserver.disconnect();
    this.controls.dispose();
    this.markerManager?.dispose();
    this.enhancementRenderer?.dispose();
    this.alertPolygonRenderer?.dispose();
    this.stormTrackRenderer?.dispose();
    this.imageryOverlay?.dispose();

    this.starField?.geometry.dispose();
    (this.starField?.material as THREE.PointsMaterial | undefined)?.dispose();
    this.globeGeometry?.dispose();
    this.globeMaterial?.dispose();
    this.contourGeometry?.dispose();
    this.contourMaterial?.map?.dispose();
    this.contourMaterial?.dispose();
    this.oceanColorMap?.dispose();

    this.aurora?.dispose();
    this.atmosphere?.dispose();
    this.postProcessing?.dispose();
    this.renderer.dispose();
  }
}
