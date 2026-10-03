import { describe, expect, it } from "vitest";
import { fitLanes, LanePlacement } from "./OrganizedBattleRow";
import { linkCardSlots, sourceFanStepLimit } from "../../boardModel";

const crowded = { digimonCount: 6, supportCount: 6 };

describe("fitLanes", () => {
  it("keeps the layout's width when a single lane has enough height", () => {
    expect(fitLanes({ width: 900, height: 220 }, 116, { digimonCount: 6, supportCount: 0 })).toMatchObject({
      placement: LanePlacement.Stacked,
      digimon: 116,
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
    const lanes = fitLanes({ width: 1600, height: 200 }, 84, { digimonCount: 3, supportCount: 2 });
    expect(lanes.placement).toBe(LanePlacement.Stacked);
    expect(lanes).toEqual(fitLanes({ width: 1600, height: 200 }, 84, crowded));
  });

  it("stays stacked when side by side would push cards out of sight", () => {
    expect(fitLanes({ width: 778, height: 200 }, 84, crowded).placement).toBe(LanePlacement.Stacked);
  });

  it("fits the rotating artwork's diagonal in a short single lane", () => {
    const height = 90;
    const { support } = fitLanes({ width: 900, height }, 116, { digimonCount: 0, supportCount: 3 });
    const artworkHeight = Math.ceil(support * 1.4);
    const frameHeight = Math.max(44, artworkHeight);
    const swing = Math.ceil((Math.hypot(support, artworkHeight) - frameHeight) / 2);
    expect(frameHeight + 22 + Math.max(4, swing + 4)).toBeLessThanOrEqual(height);
  });

  it("reserves the Yoshino source fan and badges in both stacked lanes", () => {
    const lanes = fitLanes({ width: 900, height: 245 }, 116, {
      ...crowded,
      digimonSources: 3,
      supportSources: 4,
      sourceTop: 6,
      sourceStep: 4,
    });
    expect(lanes.placement).toBe(LanePlacement.Stacked);
    expect(lanes.digimon * 1.4 + lanes.support * 1.4 + 22 + 18 + 22 + 22 + 2).toBeLessThanOrEqual(245);
  });

  it("fits a short row even when it contains only Digimon", () => {
    const lanes = fitLanes({ width: 900, height: 90 }, 116, { digimonCount: 3, supportCount: 0, digimonSources: 6 });
    const fan = 6 + 5 * Math.min(4, sourceFanStepLimit(lanes.digimon, 6));
    expect(lanes.digimon * 1.4 + 22 + fan + 4).toBeLessThanOrEqual(90);
  });

  it("keeps deep sources visible without reducing the card to a one-pixel placeholder", () => {
    const height = 71;
    const lanes = fitLanes({ width: 900, height }, 58, { ...crowded, digimonSources: 12, supportSources: 8 });
    expect(lanes.placement).toBe(LanePlacement.SideBySide);
    expect(lanes.digimon).toBeGreaterThanOrEqual(22);
    const fan = 6 + 11 * Math.min(4, sourceFanStepLimit(lanes.digimon, 12));
    expect(Math.max(44, lanes.digimon * 1.4 + fan) + 22 + 4).toBeLessThanOrEqual(height);
  });

  it("reserves both linked cards below Vulcanusmon in a short single lane", () => {
    const lanes = fitLanes({ width: 900, height: 90 }, 116, {
      digimonCount: 1,
      supportCount: 0,
      digimonLinks: 2,
    });
    const paintedBottom = Math.max(
      lanes.digimon * 1.4,
      ...linkCardSlots(2, lanes.digimon).map((slot) => slot.top + slot.height),
    );
    expect(paintedBottom + 22 + 4).toBeLessThanOrEqual(90);
  });
});
