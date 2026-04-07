import * as THREE from "three";

const STAR_COUNT = 1200;
const MIN_DISTANCE = 40;
const MAX_DISTANCE = 70;

export function createStarField(): THREE.Points {
  const positions = new Float32Array(STAR_COUNT * 3);

  for (let i = 0; i < STAR_COUNT; i++) {
    const theta = Math.random() * Math.PI * 2;
    const phi = Math.acos(2 * Math.random() - 1);
    const dist = MIN_DISTANCE + Math.random() * (MAX_DISTANCE - MIN_DISTANCE);
    positions[i * 3] = dist * Math.sin(phi) * Math.cos(theta);
    positions[i * 3 + 1] = dist * Math.sin(phi) * Math.sin(theta);
    positions[i * 3 + 2] = dist * Math.cos(phi);
  }

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));

  const material = new THREE.PointsMaterial({
    color: 0xffffff,
    size: 0.05,
    transparent: true,
    opacity: 0.25,
    sizeAttenuation: true,
  });

  return new THREE.Points(geometry, material);
}
