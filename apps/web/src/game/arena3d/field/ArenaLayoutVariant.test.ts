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

describe("the phone world layout", () => {
  const zone = (side: Side, name: ArenaZone) => ArenaLayoutVariant.PHONE.zones[`${side}:${name}` as ArenaZoneKey]!;

  it("puts each side's deck and trash side by side, as the classic landscape phone board does", () => {
    for (const side of [Side.Viewer, Side.Opponent]) {
      expect(zone(side, ArenaZone.DECK.value).x).toBeLessThan(zone(side, ArenaZone.TRASH.value).x);
      expect(zone(side, ArenaZone.DECK.value).z).toBeCloseTo(zone(side, ArenaZone.TRASH.value).z, 6);
    }
  });

  it("puts the opponent's security in their breeding row, right of the raising slot", () => {
    const security = zone(Side.Opponent, ArenaZone.SECURITY.value);
    const raising = zone(Side.Opponent, ArenaZone.RAISING.value);
    expect(security.z).toBeCloseTo(raising.z, 6);
    expect(security.x).toBeGreaterThan(raising.x);
  });

  it("keeps the viewer's security on the left, above the breeding area, level with the deck", () => {
    const security = zone(Side.Viewer, ArenaZone.SECURITY.value);
    expect(security.x).toBeLessThan(zone(Side.Viewer, ArenaZone.EGGS.value).x);
    expect(security.z).toBeLessThan(zone(Side.Viewer, ArenaZone.EGGS.value).z);
    expect(security.z).toBeCloseTo(zone(Side.Viewer, ArenaZone.DECK.value).z, 6);
  });
});

describe("the short world layout", () => {
  const zone = (side: Side, name: ArenaZone) => ArenaLayoutVariant.SHORT.zones[`${side}:${name}` as ArenaZoneKey]!;

  it("stacks the opponent's deck above their trash, as the classic short board does", () => {
    const deck = zone(Side.Opponent, ArenaZone.DECK.value);
    const trash = zone(Side.Opponent, ArenaZone.TRASH.value);
    expect(deck.x).toBeCloseTo(trash.x, 6);
    expect(deck.z).toBeLessThan(trash.z);
  });

  it("puts the viewer's deck and trash side by side in the bottom row", () => {
    const deck = zone(Side.Viewer, ArenaZone.DECK.value);
    const trash = zone(Side.Viewer, ArenaZone.TRASH.value);
    expect(deck.x).toBeLessThan(trash.x);
    expect(deck.z).toBeCloseTo(trash.z, 6);
    expect(deck.z).toBeCloseTo(zone(Side.Viewer, ArenaZone.EGGS.value).z, 6);
  });
});
