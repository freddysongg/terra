import * as THREE from "three";
import atmosphereVert from "./shaders/atmosphere.vert";
import atmosphereFrag from "./shaders/atmosphere.frag";

const ATMOSPHERE_RADIUS = 2.2;

interface AtmosphereResources {
  scene: THREE.Scene;
  material: THREE.ShaderMaterial;
  dispose: () => void;
}

export function createAtmosphere(camera: THREE.PerspectiveCamera): AtmosphereResources {
  const scene = new THREE.Scene();

  const material = new THREE.ShaderMaterial({
    vertexShader: atmosphereVert,
    fragmentShader: atmosphereFrag,
    uniforms: {
      uCamPos: { value: camera.position },
      uColorInner: { value: new THREE.Vector3(0.15, 0.45, 0.85) },
      uColorOuter: { value: new THREE.Vector3(0.06, 0.18, 0.42) },
      uGlobeR: { value: 1.0 },
      uAtmosR: { value: ATMOSPHERE_RADIUS },
      uIntensity: { value: 0.56 },
      uFalloff: { value: 3.5 },
    },
    side: THREE.BackSide,
    transparent: true,
    blending: THREE.AdditiveBlending,
    depthWrite: false,
    depthTest: false,
  });

  const geometry = new THREE.SphereGeometry(ATMOSPHERE_RADIUS, 64, 64);
  const mesh = new THREE.Mesh(geometry, material);
  scene.add(mesh);

  return {
    scene,
    material,
    dispose(): void {
      geometry.dispose();
      material.dispose();
    },
  };
}
