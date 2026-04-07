import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";

const BLOOM_STRENGTH = 0.55;
const BLOOM_RADIUS = 0.3;
const BLOOM_THRESHOLD = 0.5;

interface PostProcessingPipeline {
  composer: EffectComposer;
  resize: (width: number, height: number) => void;
  dispose: () => void;
}

export function createPostProcessing(
  renderer: THREE.WebGLRenderer,
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
): PostProcessingPipeline {
  const composer = new EffectComposer(renderer);
  composer.addPass(new RenderPass(scene, camera));
  composer.addPass(
    new UnrealBloomPass(
      new THREE.Vector2(window.innerWidth, window.innerHeight),
      BLOOM_STRENGTH,
      BLOOM_RADIUS,
      BLOOM_THRESHOLD,
    ),
  );
  composer.addPass(new OutputPass());

  return {
    composer,
    resize(width: number, height: number): void {
      composer.setSize(width, height);
    },
    dispose(): void {
      composer.dispose();
    },
  };
}
