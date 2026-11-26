import { describe, expect, it } from "vitest";
import { CARD_DIMENSIONS } from "@/design/webglCard/cardDimensions";
import { ArenaZone } from "@/game/arena3d/ArenaZone";
import { ArenaLayoutVariant, type ArenaLayoutVariantEntry } from "@/game/arena3d/field/ArenaLayoutVariant";
import {
  ARENA_MEMORY_TRACK,
  ARENA_PILE_CARD_WIDTH,
  ARENA_ROW_LAYOUT,
  ARENA_SECURITY_LAYOUT,
  type ArenaZoneKey,
} from "@/game/arena3d/field/arenaWorldLayout";
import { getArenaColumnX } from "@/game/arena3d/field/getArenaColumnX";
import { Side } from "@/game/side";

type Footprint = {
  key: ArenaZoneKey;
  left: number;
  right: number;
  near: number;
  far: number;
};

type FootprintParams = {
  layout: ArenaLayoutVariantEntry;
  key: ArenaZoneKey;
};

const LAYOUTS = Object.values(ArenaLayoutVariant);
const BREEDING_ZONES = [ArenaZone.EGGS.value, ArenaZone.RAISING.value];

function measureZoneSize(zone: ArenaZone): { width: number; depth: number } {
  if (zone === ArenaZone.SECURITY.value) {
    return { width: ARENA_SECURITY_LAYOUT.tileWidth * CARD_DIMENSIONS.height, depth: ARENA_SECURITY_LAYOUT.maxDepth };
  }
  const width = zone === ArenaZone.RAISING.value ? ARENA_ROW_LAYOUT.cardWidth : ARENA_PILE_CARD_WIDTH;
  return { width, depth: width * CARD_DIMENSIONS.height };
}

function buildFootprint({ layout, key }: FootprintParams): Footprint {
  const point = layout.zones[key]!;
  const { width, depth } = measureZoneSize(key.split(":")[1] as ArenaZone);
  return {
    key,
    left: point.x - width / 2,
    right: point.x + width / 2,
    near: point.z + depth / 2,
    far: point.z - depth / 2,
  };
}

function listFootprints(layout: ArenaLayoutVariantEntry): Footprint[] {
  return (Object.keys(layout.zones) as ArenaZoneKey[]).map((key) => buildFootprint({ layout, key }));
}

function isOverlapping(a: Footprint, b: Footprint): boolean {
  return a.left < b.right && b.left < a.right && a.far < b.near && b.far < a.near;
}

function measureRowReach(layout: ArenaLayoutVariantEntry): number {
  return getArenaColumnX(ARENA_ROW_LAYOUT.columns - 1, layout.lanes) + ARENA_ROW_LAYOUT.cardWidth / 2;
}

describe.each(LAYOUTS)("the $name world layout", (layout) => {
  const breedingKeys = [Side.Viewer, Side.Opponent].flatMap((side) =>
    BREEDING_ZONES.map((zone) => `${side}:${zone}` as ArenaZoneKey),
  );

  it("mirrors the opponent's breeding area through the centre line, as the classic board does", () => {
    const viewerEggs = layout.zones[`${Side.Viewer}:${ArenaZone.EGGS.value}`]!;
    const viewerRaising = layout.zones[`${Side.Viewer}:${ArenaZone.RAISING.value}`]!;
    const opponentEggs = layout.zones[`${Side.Opponent}:${ArenaZone.EGGS.value}`]!;
    const opponentRaising = layout.zones[`${Side.Opponent}:${ArenaZone.RAISING.value}`]!;
    expect(opponentEggs.z).toBeCloseTo(-viewerEggs.z, 6);
    expect(opponentRaising.z).toBeCloseTo(-viewerRaising.z, 6);
    expect((opponentEggs.x + opponentRaising.x) / 2).toBeCloseTo(-(viewerEggs.x + viewerRaising.x) / 2, 6);
  });

  it.each([Side.Viewer, Side.Opponent])(
    "puts the %s egg deck left of the raising slot, as the classic board does",
    (side) => {
      const eggs = layout.zones[`${side}:${ArenaZone.EGGS.value}`]!;
      const raising = layout.zones[`${side}:${ArenaZone.RAISING.value}`]!;
      expect(eggs.x).toBeLessThan(raising.x);
      expect(eggs.z).toBeCloseTo(raising.z, 6);
    },
  );

  it("keeps every breeding card inside the world bounds", () => {
    for (const key of breedingKeys) {
      const footprint = buildFootprint({ layout, key });
      expect(Math.max(Math.abs(footprint.left), Math.abs(footprint.right))).toBeLessThanOrEqual(
        layout.bounds.halfWidth,
      );
      expect(Math.max(Math.abs(footprint.near), Math.abs(footprint.far))).toBeLessThanOrEqual(layout.bounds.halfDepth);
    }
  });

  it("keeps the breeding cards clear of the piles and the security stack", () => {
    const footprints = listFootprints(layout);
    for (const key of breedingKeys) {
      const breeding = buildFootprint({ layout, key });
      const others = footprints.filter((footprint) => footprint.key !== key);
      expect(
        others.filter((footprint) => isOverlapping(breeding, footprint)).map((footprint) => footprint.key),
      ).toEqual([]);
    }
  });

  it("keeps the breeding cards off the field columns and the memory track", () => {
    const reach = measureRowReach(layout);
    const trackReach = ARENA_MEMORY_TRACK.railHalfDepth * layout.memoryScale;
    for (const key of breedingKeys) {
      const breeding = buildFootprint({ layout, key });
      const besideColumns = breeding.left >= reach || breeding.right <= -reach;
      const behindLanes = Math.min(Math.abs(breeding.near), Math.abs(breeding.far)) >= layout.lanes.supportDepth;
      expect(besideColumns || behindLanes).toBe(true);
      expect(Math.min(Math.abs(breeding.near), Math.abs(breeding.far))).toBeGreaterThan(trackReach);
    }
  });
});

describe("the tall world layout", () => {
  it("leaves at least one card width between the Digimon rows for the classic memory gauge", () => {
    const cardDepth = ARENA_ROW_LAYOUT.cardWidth * CARD_DIMENSIONS.height;
    const centerGap = 2 * (ArenaLayoutVariant.TALL.lanes.digimonDepth - cardDepth / 2);
    expect(centerGap).toBeGreaterThanOrEqual(ARENA_ROW_LAYOUT.cardWidth);
  });
});
