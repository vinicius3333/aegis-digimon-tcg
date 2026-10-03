import { describe, expect, it } from "vitest";
import { fitLanes, LanePlacement } from "./OrganizedBattleRow";

const crowded = { digimonCount: 6, supportCount: 6 };

describe("fitLanes", () => {
  it("keeps the layout's width when nothing goes in the support lane", () => {
    expect(fitLanes({ width: 900, height: 120 }, 116, { digimonCount: 6, supportCount: 0 })).toEqual({
      placement: LanePlacement.Stacked,
      digimon: 116,
      support: 72,
    });
  });

  it("stacks the lanes when the row is tall enough", () => {
    const lanes = fitLanes({ width: 1300, height: 245 }, 116, crowded);
    expect(lanes.placement).toBe(LanePlacement.Stacked);
    expect(lanes.digimon).toBeLessThanOrEqual(116);
    expect(lanes.digimon * 1.4 + lanes.support * 1.4).toBeLessThanOrEqual(245);
  });

  it("never grows a card past the layout's width", () => {
    expect(fitLanes({ width: 800, height: 900 }, 88, crowded)).toMatchObject({ digimon: 88 });
  });

  it("puts the lanes side by side on a row too short to stack them", () => {
    const lanes = fitLanes({ width: 380, height: 64 }, 58, crowded);
    expect(lanes.placement).toBe(LanePlacement.SideBySide);
    expect(lanes.digimon * 1.4).toBeLessThanOrEqual(64);
  });

  it("keeps the same lanes and card sizes when copies split or merge", () => {
    const lanes = fitLanes({ width: 1600, height: 160 }, 84, { digimonCount: 3, supportCount: 2 });
    expect(lanes.placement).toBe(LanePlacement.Stacked);
    expect(lanes).toEqual(fitLanes({ width: 1600, height: 160 }, 84, crowded));
  });

  it("stays stacked when side by side would push cards out of sight", () => {
    expect(fitLanes({ width: 778, height: 160 }, 84, crowded).placement).toBe(LanePlacement.Stacked);
  });
});
