import { describe, it, expect } from "vitest";
import { computeClusters, SEVERITY_RANKING } from "../clustering.js";
import { CATEGORY_META } from "@terra/shared";
import type { ClusterInput } from "../clustering.js";
import type { EventCategoryId } from "@terra/shared";

function makeMarker(
  id: string,
  screenX: number,
  screenY: number,
  category: EventCategoryId,
): ClusterInput {
  return { id, screenX, screenY, category };
}

describe("computeClusters", () => {
  describe("basic clustering", () => {
    it("returns empty array for empty input", () => {
      const clusters = computeClusters([], 50);
      expect(clusters).toEqual([]);
    });

    it("returns a single cluster for one marker", () => {
      const markers = [makeMarker("a", 10, 10, "wildfires")];
      const clusters = computeClusters(markers, 50);

      expect(clusters).toHaveLength(1);
      expect(clusters[0]!.members).toHaveLength(1);
      expect(clusters[0]!.members[0]!.id).toBe("a");
    });

    it("groups markers in the same grid cell into one cluster", () => {
      const markers = [
        makeMarker("a", 10, 10, "wildfires"),
        makeMarker("b", 20, 30, "floods"),
        makeMarker("c", 45, 45, "earthquakes"),
      ];
      const clusters = computeClusters(markers, 50);

      expect(clusters).toHaveLength(1);
      expect(clusters[0]!.members).toHaveLength(3);
    });

    it("separates markers in different grid cells into separate clusters", () => {
      const markers = [
        makeMarker("a", 10, 10, "wildfires"),
        makeMarker("b", 110, 110, "floods"),
      ];
      const clusters = computeClusters(markers, 50);

      expect(clusters).toHaveLength(2);
      expect(clusters[0]!.members).toHaveLength(1);
      expect(clusters[1]!.members).toHaveLength(1);
    });

    it("creates multiple clusters across different cells", () => {
      const markers = [
        makeMarker("a", 10, 10, "wildfires"),
        makeMarker("b", 20, 20, "floods"),
        makeMarker("c", 200, 200, "earthquakes"),
        makeMarker("d", 210, 220, "volcanoes"),
      ];
      const clusters = computeClusters(markers, 50);

      expect(clusters).toHaveLength(2);

      const clusterWithA = clusters.find((c) =>
        c.members.some((m) => m.id === "a"),
      )!;
      const clusterWithC = clusters.find((c) =>
        c.members.some((m) => m.id === "c"),
      )!;

      expect(clusterWithA.members).toHaveLength(2);
      expect(clusterWithC.members).toHaveLength(2);
    });
  });

  describe("cluster center calculation", () => {
    it("computes center as average of member positions", () => {
      const markers = [
        makeMarker("a", 0, 0, "wildfires"),
        makeMarker("b", 40, 20, "floods"),
      ];
      const clusters = computeClusters(markers, 50);

      expect(clusters[0]!.centerX).toBe(20);
      expect(clusters[0]!.centerY).toBe(10);
    });

    it("returns exact position for single-member cluster", () => {
      const markers = [makeMarker("a", 75, 33, "wildfires")];
      const clusters = computeClusters(markers, 50);

      expect(clusters[0]!.centerX).toBe(75);
      expect(clusters[0]!.centerY).toBe(33);
    });
  });

  describe("severity ranking and cluster color", () => {
    it("assigns volcano color when volcano is in cluster", () => {
      const markers = [
        makeMarker("a", 10, 10, "floods"),
        makeMarker("b", 20, 20, "volcanoes"),
      ];
      const clusters = computeClusters(markers, 50);

      expect(clusters[0]!.highestSeverityCategory).toBe("volcanoes");
      expect(clusters[0]!.color).toBe(CATEGORY_META.volcanoes.color);
    });

    it("assigns earthquake color over storms", () => {
      const markers = [
        makeMarker("a", 10, 10, "severeStorms"),
        makeMarker("b", 20, 20, "earthquakes"),
      ];
      const clusters = computeClusters(markers, 50);

      expect(clusters[0]!.highestSeverityCategory).toBe("earthquakes");
      expect(clusters[0]!.color).toBe(CATEGORY_META.earthquakes.color);
    });

    it("assigns storm color over wildfire", () => {
      const markers = [
        makeMarker("a", 10, 10, "wildfires"),
        makeMarker("b", 20, 20, "severeStorms"),
      ];
      const clusters = computeClusters(markers, 50);

      expect(clusters[0]!.highestSeverityCategory).toBe("severeStorms");
      expect(clusters[0]!.color).toBe(CATEGORY_META.severeStorms.color);
    });

    it("assigns lowest severity correctly (waterColor)", () => {
      const markers = [
        makeMarker("a", 10, 10, "waterColor"),
        makeMarker("b", 20, 20, "seaLakeIce"),
      ];
      const clusters = computeClusters(markers, 50);

      expect(clusters[0]!.highestSeverityCategory).toBe("seaLakeIce");
    });

    it("handles all categories ranked correctly", () => {
      for (let i = 0; i < SEVERITY_RANKING.length - 1; i++) {
        const higher = SEVERITY_RANKING[i]!;
        const lower = SEVERITY_RANKING[i + 1]!;
        const markers = [
          makeMarker("a", 10, 10, lower),
          makeMarker("b", 20, 20, higher),
        ];
        const clusters = computeClusters(markers, 50);
        expect(clusters[0]!.highestSeverityCategory).toBe(higher);
      }
    });

    it("uses own category color for single-member cluster", () => {
      const markers = [makeMarker("a", 10, 10, "drought")];
      const clusters = computeClusters(markers, 50);

      expect(clusters[0]!.highestSeverityCategory).toBe("drought");
      expect(clusters[0]!.color).toBe(CATEGORY_META.drought.color);
    });
  });

  describe("zoom breakpoint behavior", () => {
    it("clusters tight markers with large cell size (zoomed out)", () => {
      const markers = [
        makeMarker("a", 100, 100, "floods"),
        makeMarker("b", 120, 110, "wildfires"),
        makeMarker("c", 105, 130, "earthquakes"),
      ];
      const clusters = computeClusters(markers, 200);

      expect(clusters).toHaveLength(1);
      expect(clusters[0]!.members).toHaveLength(3);
    });

    it("splits markers into individual clusters with small cell size (zoomed in)", () => {
      const markers = [
        makeMarker("a", 100, 100, "floods"),
        makeMarker("b", 120, 110, "wildfires"),
        makeMarker("c", 105, 130, "earthquakes"),
      ];
      const clusters = computeClusters(markers, 5);

      expect(clusters).toHaveLength(3);
      expect(clusters.every((c) => c.members.length === 1)).toBe(true);
    });

    it("transitions from clustered to unclustered as cell size shrinks", () => {
      const markers = [
        makeMarker("a", 10, 10, "floods"),
        makeMarker("b", 40, 40, "wildfires"),
      ];

      const clusteredLarge = computeClusters(markers, 100);
      expect(clusteredLarge).toHaveLength(1);

      const clusteredSmall = computeClusters(markers, 20);
      expect(clusteredSmall).toHaveLength(2);
    });
  });

  describe("grid cell boundary behavior", () => {
    it("markers at exact cell boundary are in different cells", () => {
      const markers = [
        makeMarker("a", 49, 10, "floods"),
        makeMarker("b", 50, 10, "wildfires"),
      ];
      const clusters = computeClusters(markers, 50);

      expect(clusters).toHaveLength(2);
    });

    it("handles negative screen coordinates", () => {
      const markers = [
        makeMarker("a", -10, -10, "floods"),
        makeMarker("b", -20, -20, "wildfires"),
      ];
      const clusters = computeClusters(markers, 50);

      expect(clusters).toHaveLength(1);
      expect(clusters[0]!.members).toHaveLength(2);
    });
  });

  describe("member count reflects total events", () => {
    it("cluster with 5 markers has 5 members", () => {
      const markers = Array.from({ length: 5 }, (_, i) =>
        makeMarker(`m${i}`, i * 2, i * 2, "floods"),
      );
      const clusters = computeClusters(markers, 50);

      expect(clusters).toHaveLength(1);
      expect(clusters[0]!.members).toHaveLength(5);
    });
  });
});
