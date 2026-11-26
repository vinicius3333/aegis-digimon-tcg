import { describe, expect, it } from "vitest";
import { ArenaZone } from "@/game/arena3d/ArenaZone";
import { getArenaZoneDomWidth } from "@/game/arena3d/field/getArenaZoneDomWidth";

const PHONE_LANDSCAPE_WIDTHS = { pileWidth: 44, raisingWidth: 58 };

describe("the DOM width a 3D zone is scaled from", () => {
  it("uses the raising width for the egg deck, which renders at that width", () => {
    expect(getArenaZoneDomWidth({ zone: ArenaZone.EGGS.value, ...PHONE_LANDSCAPE_WIDTHS })).toBe(58);
  });

  it("uses the raising width for the raising slot", () => {
    expect(getArenaZoneDomWidth({ zone: ArenaZone.RAISING.value, ...PHONE_LANDSCAPE_WIDTHS })).toBe(58);
  });

  it("uses the pile width for the deck and trash", () => {
    expect(getArenaZoneDomWidth({ zone: ArenaZone.DECK.value, ...PHONE_LANDSCAPE_WIDTHS })).toBe(44);
    expect(getArenaZoneDomWidth({ zone: ArenaZone.TRASH.value, ...PHONE_LANDSCAPE_WIDTHS })).toBe(44);
  });
});
