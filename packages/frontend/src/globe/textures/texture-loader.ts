import * as THREE from "three";

const NIGHT_URLS: readonly string[] = [
  "https://cdn.jsdelivr.net/npm/three-globe@2.34.1/example/img/earth-night.jpg",
  "https://cdn.jsdelivr.net/npm/three-globe@2.31.1/example/img/earth-night.jpg",
  "https://cdn.jsdelivr.net/npm/three-globe@2.24.13/example/img/earth-night.jpg",
  "https://unpkg.com/three-globe@2.34.1/example/img/earth-night.jpg",
  "https://unpkg.com/three-globe@2.31.1/example/img/earth-night.jpg",
];

const TOPO_URLS: readonly string[] = [
  "https://cdn.jsdelivr.net/npm/three-globe@2.34.1/example/img/earth-topology.png",
  "https://cdn.jsdelivr.net/npm/three-globe@2.31.1/example/img/earth-topology.png",
];

async function cascadeLoad(urls: readonly string[]): Promise<THREE.Texture | null> {
  const loader = new THREE.TextureLoader();
  for (const url of urls) {
    try {
      return await new Promise<THREE.Texture>((resolve, reject) => {
        loader.load(url, resolve, undefined, reject);
      });
    } catch {
      /* try next URL */
    }
  }
  return null;
}

interface LoadedTextures {
  night: THREE.Texture | null;
  topo: THREE.Texture | null;
}

export async function loadGlobeTextures(
  onProgress?: (progress: number) => void,
): Promise<LoadedTextures> {
  onProgress?.(10);
  const [night, topo] = await Promise.all([
    cascadeLoad(NIGHT_URLS),
    cascadeLoad(TOPO_URLS),
  ]);
  onProgress?.(60);
  return { night, topo };
}

export function configureTexture(
  texture: THREE.Texture,
  maxAnisotropy: number,
  colorSpace: THREE.ColorSpace,
): void {
  texture.colorSpace = colorSpace;
  texture.anisotropy = maxAnisotropy;
  texture.minFilter = THREE.LinearMipmapLinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = true;
}
