import * as THREE from "three";
import { useDataStore } from "../stores/data-store.js";
import { useGlobeStore } from "../stores/globe-store.js";
import auroraVert from "./shaders/aurora.vert";
import auroraFrag from "./shaders/aurora.frag";

const AURORA_SPHERE_RADIUS = 1.025;
const AURORA_SEGMENTS = 64;
const KP_ACTIVATION_THRESHOLD = 5;
const KP_MAX = 9;

interface AuroraResources {
  mesh: THREE.Mesh;
  update: (elapsed: number) => void;
  dispose: () => void;
}

function computeKpIntensity(storms: readonly { kpIndex: number }[]): number {
  if (storms.length === 0) return 0;

  let maxKp = 0;
  for (const storm of storms) {
    if (storm.kpIndex > maxKp) maxKp = storm.kpIndex;
  }

  if (maxKp < KP_ACTIVATION_THRESHOLD) return 0;

  return Math.min((maxKp - KP_ACTIVATION_THRESHOLD) / (KP_MAX - KP_ACTIVATION_THRESHOLD), 1.0);
}

export function createAurora(): AuroraResources {
  const material = new THREE.ShaderMaterial({
    vertexShader: auroraVert,
    fragmentShader: auroraFrag,
    uniforms: {
      uKpIntensity: { value: 0.0 },
      uTime: { value: 0.0 },
    },
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    side: THREE.FrontSide,
  });

  const geometry = new THREE.SphereGeometry(
    AURORA_SPHERE_RADIUS,
    AURORA_SEGMENTS,
    AURORA_SEGMENTS,
  );
  const mesh = new THREE.Mesh(geometry, material);
  mesh.visible = false;

  function syncKpFromStore(): void {
    const storms = useDataStore.getState().spaceWeather?.geomagneticStorms ?? [];
    const intensity = computeKpIntensity(storms);
    material.uniforms.uKpIntensity.value = intensity;

    const isPerformance = useGlobeStore.getState().isPerformanceMode;
    mesh.visible = intensity > 0 && !isPerformance;
  }

  syncKpFromStore();

  const unsubData = useDataStore.subscribe((state, prev) => {
    if (state.spaceWeather !== prev.spaceWeather) {
      syncKpFromStore();
    }
  });

  const unsubGlobe = useGlobeStore.subscribe((state, prev) => {
    if (state.isPerformanceMode !== prev.isPerformanceMode) {
      syncKpFromStore();
    }
  });

  function update(elapsed: number): void {
    if (!mesh.visible) return;
    material.uniforms.uTime.value = elapsed;
  }

  function dispose(): void {
    unsubData();
    unsubGlobe();
    geometry.dispose();
    material.dispose();
  }

  return { mesh, update, dispose };
}
