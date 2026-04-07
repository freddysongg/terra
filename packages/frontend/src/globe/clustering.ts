import { CATEGORY_META } from "@terra/shared";
import type { EventCategoryId } from "@terra/shared";

/**
 * Severity ranking determines cluster color — the highest-severity category
 * in a cluster wins. Index 0 = highest severity.
 */
const SEVERITY_RANKING: readonly EventCategoryId[] = [
  "volcanoes",
  "earthquakes",
  "severeStorms",
  "wildfires",
  "floods",
  "landslides",
  "manmade",
  "drought",
  "tempExtremes",
  "dustHaze",
  "snow",
  "seaLakeIce",
  "waterColor",
] as const;

const severityIndex = new Map<EventCategoryId, number>(
  SEVERITY_RANKING.map((categoryId, rank) => [categoryId, rank]),
);

export interface ClusterInput {
  id: string;
  screenX: number;
  screenY: number;
  category: EventCategoryId;
}

export interface Cluster {
  members: ClusterInput[];
  centerX: number;
  centerY: number;
  color: string;
  highestSeverityCategory: EventCategoryId;
}

function resolveHighestSeverityCategory(members: ClusterInput[]): EventCategoryId {
  let bestCategory: EventCategoryId = members[0]!.category;
  let bestRank = severityIndex.get(bestCategory) ?? SEVERITY_RANKING.length;

  for (let i = 1; i < members.length; i++) {
    const rank = severityIndex.get(members[i]!.category) ?? SEVERITY_RANKING.length;
    if (rank < bestRank) {
      bestRank = rank;
      bestCategory = members[i]!.category;
    }
  }

  return bestCategory;
}

function computeClusterCenter(members: ClusterInput[]): { centerX: number; centerY: number } {
  let sumX = 0;
  let sumY = 0;
  for (const member of members) {
    sumX += member.screenX;
    sumY += member.screenY;
  }
  return {
    centerX: sumX / members.length,
    centerY: sumY / members.length,
  };
}

/**
 * Grid-based spatial clustering. Divides screen space into cells of
 * gridCellSize pixels; markers that fall into the same cell merge
 * into a single cluster.
 */
export function computeClusters(markers: ClusterInput[], gridCellSize: number): Cluster[] {
  if (markers.length === 0) return [];

  const cells = new Map<string, ClusterInput[]>();

  for (const marker of markers) {
    const cellCol = Math.floor(marker.screenX / gridCellSize);
    const cellRow = Math.floor(marker.screenY / gridCellSize);
    const cellKey = `${cellCol}:${cellRow}`;

    const existing = cells.get(cellKey);
    if (existing) {
      existing.push(marker);
    } else {
      cells.set(cellKey, [marker]);
    }
  }

  const clusters: Cluster[] = [];

  for (const members of cells.values()) {
    const highestSeverityCategory = resolveHighestSeverityCategory(members);
    const color = CATEGORY_META[highestSeverityCategory]?.color ?? "#ffffff";
    const { centerX, centerY } = computeClusterCenter(members);

    clusters.push({
      members,
      centerX,
      centerY,
      color,
      highestSeverityCategory,
    });
  }

  return clusters;
}

export { SEVERITY_RANKING };
