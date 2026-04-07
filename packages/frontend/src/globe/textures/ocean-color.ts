import * as THREE from "three";

const PALETTE: readonly [number, number, number][] = [
  [7, 12, 24],
  [10, 17, 32],
  [14, 22, 40],
  [18, 28, 48],
  [22, 34, 55],
];

function lerp3(
  a: readonly [number, number, number],
  b: readonly [number, number, number],
  t: number,
): [number, number, number] {
  const clamped = Math.max(0, Math.min(1, t));
  return [
    a[0] + (b[0] - a[0]) * clamped,
    a[1] + (b[1] - a[1]) * clamped,
    a[2] + (b[2] - a[2]) * clamped,
  ];
}

function samplePalette(t: number): [number, number, number] {
  const clamped = Math.max(0, Math.min(1, t));
  const idx = clamped * (PALETTE.length - 1);
  const lo = Math.floor(idx);
  return lerp3(
    PALETTE[lo] as [number, number, number],
    PALETTE[Math.min(lo + 1, PALETTE.length - 1)] as [number, number, number],
    idx - lo,
  );
}

function buildNoiseGrid(size: number): Float32Array {
  const grid = new Float32Array(size * size);
  for (let i = 0; i < grid.length; i++) grid[i] = Math.random();
  return grid;
}

function sampleNoise(
  grid: Float32Array,
  gridSize: number,
  u: number,
  v: number,
): number {
  const x = (((u % 1) + 1) % 1) * gridSize;
  const y = (((v % 1) + 1) % 1) * gridSize;
  const ix = Math.floor(x) % gridSize;
  const iy = Math.floor(y) % gridSize;
  const fx = x - Math.floor(x);
  const fy = y - Math.floor(y);
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const nx = (ix + 1) % gridSize;
  const ny = (iy + 1) % gridSize;
  return (
    grid[iy * gridSize + ix]! * (1 - sx) * (1 - sy) +
    grid[iy * gridSize + nx]! * sx * (1 - sy) +
    grid[ny * gridSize + ix]! * (1 - sx) * sy +
    grid[ny * gridSize + nx]! * sx * sy
  );
}

function greatCircleDistance(
  lon1: number,
  lat1: number,
  lon2: number,
  lat2: number,
): number {
  let dLon = Math.abs(lon1 - lon2);
  if (dLon > 180) dLon = 360 - dLon;
  return Math.sqrt(dLon * dLon + (lat1 - lat2) * (lat1 - lat2));
}

function basinInfluence(
  noiseGrid: Float32Array,
  noiseSize: number,
  lon: number,
  lat: number,
  centerLon: number,
  centerLat: number,
  radius: number,
  u: number,
  v: number,
): number {
  const warpLon = lon + (sampleNoise(noiseGrid, noiseSize, u * 1.5 + 0.7, v * 1.5 + 3.1) - 0.5) * 25;
  const warpLat = lat + (sampleNoise(noiseGrid, noiseSize, u * 1.5 + 7.2, v * 1.5 + 1.4) - 0.5) * 20;
  const d = greatCircleDistance(warpLon, warpLat, centerLon, centerLat);
  const t = Math.max(0, 1 - d / radius);
  return t * t * (3 - 2 * t);
}

export function createOceanColorMap(): THREE.CanvasTexture {
  const W = 1024;
  const H = 512;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  const imgData = ctx.createImageData(W, H);
  const pixels = imgData.data;

  const noiseSize = 64;
  const noiseGrid = buildNoiseGrid(noiseSize);

  for (let py = 0; py < H; py++) {
    for (let px = 0; px < W; px++) {
      const u = px / W;
      const v = py / H;
      const lon = u * 360 - 180;
      const lat = 90 - v * 180;

      let baseT = 0.15 + (1 - Math.abs(lat) / 90) * 0.3;

      baseT += basinInfluence(noiseGrid, noiseSize, lon, lat, -155, -5, 100, u, v) * -0.12;
      baseT += basinInfluence(noiseGrid, noiseSize, lon, lat, -40, 45, 60, u, v) * 0.15;
      baseT += basinInfluence(noiseGrid, noiseSize, lon, lat, -65, 18, 45, u, v) * 0.2;
      baseT += basinInfluence(noiseGrid, noiseSize, lon, lat, 72, -10, 70, u, v) * 0.1;
      baseT += Math.max(0, (-lat - 50) / 20) * -0.15;

      const n1 = sampleNoise(noiseGrid, noiseSize, u * 3, v * 3);
      const n2 = sampleNoise(noiseGrid, noiseSize, u * 5 + 5.3, v * 5 + 2.7);
      baseT += (n1 - 0.5) * 0.08 + (n2 - 0.5) * 0.04;

      const col = samplePalette(baseT);
      const i = (py * W + px) * 4;
      pixels[i] = col[0];
      pixels[i + 1] = col[1];
      pixels[i + 2] = col[2];
      pixels[i + 3] = 255;
    }
  }

  ctx.putImageData(imgData, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.minFilter = THREE.LinearMipmapLinearFilter;
  tex.magFilter = THREE.LinearFilter;
  tex.generateMipmaps = true;
  return tex;
}
