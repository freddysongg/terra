import * as THREE from "three";

const CITY_COORDS: readonly [longitude: number, latitude: number][] = [
  [-74, 40.7], [-87.6, 41.9], [-118.2, 34.1], [-122.4, 37.8], [-95.4, 29.8],
  [-80.2, 25.8], [-77, 38.9], [-99.1, 19.4], [-43.2, -22.9], [-58.4, -34.6],
  [-3.7, 40.4], [2.3, 48.9], [-0.1, 51.5], [13.4, 52.5], [12.5, 41.9],
  [37.6, 55.8], [28.9, 41], [55.3, 25.3], [72.9, 19], [77.2, 28.6],
  [100.5, 13.8], [103.9, 1.4], [114.2, 22.3], [121.5, 31.2], [116.4, 39.9],
  [126.9, 37.6], [139.7, 35.7], [151.2, -33.9], [3.4, 6.5], [28.1, -26.2],
];

export function createFallbackNightTexture(): THREE.CanvasTexture {
  const W = 4096;
  const H = 2048;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#020406";
  ctx.fillRect(0, 0, W, H);

  for (const [lon, lat] of CITY_COORDS) {
    const cx = ((lon + 180) / 360) * W;
    const cy = ((90 - lat) / 180) * H;
    const dotCount = 20 + Math.floor(Math.random() * 20);
    for (let i = 0; i < dotCount; i++) {
      const dx = cx + (Math.random() - 0.5) * 10;
      const dy = cy + (Math.random() - 0.5) * 10;
      ctx.beginPath();
      ctx.arc(dx, dy, 0.3 + Math.random(), 0, Math.PI * 2);
      const g = 185 + Math.floor(Math.random() * 40);
      const b = 100 + Math.floor(Math.random() * 40);
      const a = 0.2 + Math.random() * 0.4;
      ctx.fillStyle = `rgba(255,${g},${b},${a})`;
      ctx.fill();
    }
  }

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}
