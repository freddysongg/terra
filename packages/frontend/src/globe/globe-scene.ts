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
import { useEventStore } from "../stores/event-store.js";
import globeSurfaceVert from "./shaders/globe-surface.vert";
import globeSurfaceFrag from "./shaders/globe-surface.frag";

const BACKGROUND_COLOR = 0x040a16;
const AUTO_ROTATE_SPEED = 0.25;
const GLOBE_TILT_DEG = 12;

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

    onProgress?.(85);

    this.atmosphere = createAtmosphere(this.camera);
    this.postProcessing = createPostProcessing(this.renderer, this.scene, this.camera);

    this.markerManager = new MarkerManager(
      this.scene,
      this.camera,
      this.config.canvas,
      this.globe,
    );

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

  private animate = (): void => {
    this.animationFrameId = requestAnimationFrame(this.animate);
    this.controls.update();

    if (this.postProcessing && this.atmosphere) {
      this.postProcessing.composer.render();
      this.renderer.autoClear = false;
      this.renderer.render(this.atmosphere.scene, this.camera);
      this.renderer.autoClear = true;
    }

    this.markerManager?.update();
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
    this.resizeObserver.disconnect();
    this.controls.dispose();
    this.markerManager?.dispose();

    this.starField?.geometry.dispose();
    (this.starField?.material as THREE.PointsMaterial | undefined)?.dispose();
    this.globeGeometry?.dispose();
    this.globeMaterial?.dispose();
    this.contourGeometry?.dispose();
    this.contourMaterial?.map?.dispose();
    this.contourMaterial?.dispose();
    this.oceanColorMap?.dispose();

    this.atmosphere?.dispose();
    this.postProcessing?.dispose();
    this.renderer.dispose();
  }
}
