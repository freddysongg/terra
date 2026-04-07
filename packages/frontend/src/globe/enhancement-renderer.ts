import * as THREE from "three";
import { useDataStore } from "../stores/data-store.js";
import { useLayerStore } from "../stores/layer-store.js";
import type { FireHotspot, Earthquake } from "@terra/shared";

const MARKER_RADIUS = 1.01;

const FIRE_MAX_COUNT = 150_000;
const EARTHQUAKE_MAX_COUNT = 1_000;

const FIRE_CIRCLE_RADIUS = 0.003;
const FIRE_CIRCLE_SEGMENTS = 8;

const EARTHQUAKE_MAGNITUDE_SCALE = 0.003;

const DEPTH_SHALLOW_MAX_KM = 70;
const DEPTH_INTERMEDIATE_MAX_KM = 300;

const DIAMOND_ROTATION_Z = Math.PI / 4;

type FireConfidence = FireHotspot["confidence"];

const FIRE_COLORS: Record<FireConfidence, number> = {
  low: 0xfbbf24,
  nominal: 0xf97316,
  high: 0xef4444,
};

const EARTHQUAKE_DEPTH_COLORS = {
  shallow: 0xef4444,
  intermediate: 0xf97316,
  deep: 0x3b82f6,
} as const;

type EarthquakeDepthTier = keyof typeof EARTHQUAKE_DEPTH_COLORS;

const FIRE_CONFIDENCE_TIERS: readonly FireConfidence[] = ["low", "nominal", "high"];
const EARTHQUAKE_DEPTH_TIERS: readonly EarthquakeDepthTier[] = [
  "shallow",
  "intermediate",
  "deep",
];

function latLngToVector3(latitude: number, longitude: number): THREE.Vector3 {
  const latRad = (latitude * Math.PI) / 180;
  const lngRad = (longitude * Math.PI) / 180;
  return new THREE.Vector3(
    -Math.cos(latRad) * Math.cos(lngRad) * MARKER_RADIUS,
    Math.sin(latRad) * MARKER_RADIUS,
    Math.cos(latRad) * Math.sin(lngRad) * MARKER_RADIUS,
  );
}

function depthTierFor(depthKm: number): EarthquakeDepthTier {
  if (depthKm < DEPTH_SHALLOW_MAX_KM) return "shallow";
  if (depthKm < DEPTH_INTERMEDIATE_MAX_KM) return "intermediate";
  return "deep";
}

function buildFireMesh(confidence: FireConfidence): THREE.InstancedMesh {
  const geometry = new THREE.CircleGeometry(FIRE_CIRCLE_RADIUS, FIRE_CIRCLE_SEGMENTS);
  const material = new THREE.MeshBasicMaterial({
    color: FIRE_COLORS[confidence],
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const mesh = new THREE.InstancedMesh(geometry, material, FIRE_MAX_COUNT);
  mesh.count = 0;
  mesh.frustumCulled = false;
  return mesh;
}

function buildEarthquakeMesh(tier: EarthquakeDepthTier): THREE.InstancedMesh {
  const geometry = new THREE.PlaneGeometry(1, 1);
  const material = new THREE.MeshBasicMaterial({
    color: EARTHQUAKE_DEPTH_COLORS[tier],
    side: THREE.DoubleSide,
    depthWrite: false,
  });
  const mesh = new THREE.InstancedMesh(geometry, material, EARTHQUAKE_MAX_COUNT);
  mesh.count = 0;
  mesh.frustumCulled = false;
  return mesh;
}

export class EnhancementRenderer {
  private scene: THREE.Scene;
  private fireMeshes: Record<FireConfidence, THREE.InstancedMesh>;
  private earthquakeMeshes: Record<EarthquakeDepthTier, THREE.InstancedMesh>;
  private unsubscribeData: () => void;
  private unsubscribeLayer: () => void;

  constructor(scene: THREE.Scene, _globe: THREE.Mesh) {
    this.scene = scene;

    this.fireMeshes = {
      low: buildFireMesh("low"),
      nominal: buildFireMesh("nominal"),
      high: buildFireMesh("high"),
    };

    this.earthquakeMeshes = {
      shallow: buildEarthquakeMesh("shallow"),
      intermediate: buildEarthquakeMesh("intermediate"),
      deep: buildEarthquakeMesh("deep"),
    };

    for (const tier of FIRE_CONFIDENCE_TIERS) {
      this.scene.add(this.fireMeshes[tier]);
    }
    for (const tier of EARTHQUAKE_DEPTH_TIERS) {
      this.scene.add(this.earthquakeMeshes[tier]);
    }

    this.applyLayerVisibility(useLayerStore.getState().activeLayers);
    this.updateFireInstances(useDataStore.getState().fireHotspots);
    this.updateEarthquakeInstances(useDataStore.getState().earthquakes);

    let prevFireHotspots = useDataStore.getState().fireHotspots;
    let prevEarthquakes = useDataStore.getState().earthquakes;

    this.unsubscribeData = useDataStore.subscribe((state) => {
      if (state.fireHotspots !== prevFireHotspots) {
        prevFireHotspots = state.fireHotspots;
        this.updateFireInstances(state.fireHotspots);
      }
      if (state.earthquakes !== prevEarthquakes) {
        prevEarthquakes = state.earthquakes;
        this.updateEarthquakeInstances(state.earthquakes);
      }
    });

    let prevActiveLayers = useLayerStore.getState().activeLayers;

    this.unsubscribeLayer = useLayerStore.subscribe((state) => {
      if (state.activeLayers !== prevActiveLayers) {
        prevActiveLayers = state.activeLayers;
        this.applyLayerVisibility(state.activeLayers);
      }
    });
  }

  private updateFireInstances(hotspots: readonly FireHotspot[]): void {
    const buckets: Record<FireConfidence, FireHotspot[]> = {
      low: [],
      nominal: [],
      high: [],
    };

    for (const hotspot of hotspots) {
      buckets[hotspot.confidence].push(hotspot);
    }

    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3();

    for (const tier of FIRE_CONFIDENCE_TIERS) {
      const mesh = this.fireMeshes[tier];
      const items = buckets[tier];
      const count = Math.min(items.length, FIRE_MAX_COUNT);

      for (let i = 0; i < count; i++) {
        const hotspot = items[i]!;
        position.copy(latLngToVector3(hotspot.latitude, hotspot.longitude));
        matrix.setPosition(position);
        mesh.setMatrixAt(i, matrix);
      }

      mesh.count = count;
      mesh.instanceMatrix.needsUpdate = true;
    }
  }

  private updateEarthquakeInstances(earthquakes: readonly Earthquake[]): void {
    const buckets: Record<EarthquakeDepthTier, Earthquake[]> = {
      shallow: [],
      intermediate: [],
      deep: [],
    };

    for (const quake of earthquakes) {
      buckets[depthTierFor(quake.depth)].push(quake);
    }

    const matrix = new THREE.Matrix4();
    const position = new THREE.Vector3();
    const rotationQuat = new THREE.Quaternion().setFromEuler(
      new THREE.Euler(0, 0, DIAMOND_ROTATION_Z),
    );
    const scaleVec = new THREE.Vector3();

    for (const tier of EARTHQUAKE_DEPTH_TIERS) {
      const mesh = this.earthquakeMeshes[tier];
      const items = buckets[tier];
      const count = Math.min(items.length, EARTHQUAKE_MAX_COUNT);

      for (let i = 0; i < count; i++) {
        const quake = items[i]!;
        position.copy(latLngToVector3(quake.latitude, quake.longitude));

        const size = quake.magnitude * EARTHQUAKE_MAGNITUDE_SCALE;
        scaleVec.set(size, size, size);

        matrix.compose(position, rotationQuat, scaleVec);
        mesh.setMatrixAt(i, matrix);
      }

      mesh.count = count;
      mesh.instanceMatrix.needsUpdate = true;
    }
  }

  private applyLayerVisibility(activeLayers: Set<string>): void {
    const isFireVisible = activeLayers.has("fireDensity");
    const isSeismicVisible = activeLayers.has("seismicDensity");

    for (const tier of FIRE_CONFIDENCE_TIERS) {
      this.fireMeshes[tier].visible = isFireVisible;
    }
    for (const tier of EARTHQUAKE_DEPTH_TIERS) {
      this.earthquakeMeshes[tier].visible = isSeismicVisible;
    }
  }

  update(): void {}

  dispose(): void {
    this.unsubscribeData();
    this.unsubscribeLayer();

    for (const tier of FIRE_CONFIDENCE_TIERS) {
      const mesh = this.fireMeshes[tier];
      this.scene.remove(mesh);
      mesh.geometry.dispose();
      (mesh.material as THREE.MeshBasicMaterial).dispose();
    }

    for (const tier of EARTHQUAKE_DEPTH_TIERS) {
      const mesh = this.earthquakeMeshes[tier];
      this.scene.remove(mesh);
      mesh.geometry.dispose();
      (mesh.material as THREE.MeshBasicMaterial).dispose();
    }
  }
}
