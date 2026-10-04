import { describe, expect, it } from "vitest";
import { fitLanes, fitLanesToWidth, laneContentWidth, LanePlacement } from "./OrganizedBattleRow";
import { linkCardSlots, sourceFanStepLimit } from "../../boardModel";

const crowded = { digimonCount: 6, supportCount: 6 };

describe("fitLanes", () => {
  it("shrinks a crowded lane to fit the row before it scrolls, down to a floor", () => {
    const upright = { suspended: false, sources: 0, links: 0, copies: 1 };
    const suspended = { ...upright, suspended: true };
    const crowded = { digimon: [...Array(7).fill(upright), ...Array(4).fill(suspended)], support: [upright] };
    const lanes = { placement: LanePlacement.Stacked, digimon: 87, support: 87 };
    const content = { digimonCount: 11, supportCount: 1, supportScale: 1, sourceStep: 2, fitWidth: true };
    const fitted = fitLanesToWidth(lanes, 1260, crowded, content);
    expect(fitted.digimon).toBeLessThan(87);
    expect(fitted.digimon).toBe(fitted.support);
    expect(laneContentWidth(crowded.digimon, fitted.digimon, 0.25, 2)).toBeLessThanOrEqual(1260);
    expect(fitLanesToWidth(lanes, 400, crowded, content).digimon).toBe(66);
    expect(fitLanesToWidth(lanes, 1260, crowded, { ...content, fitWidth: false })).toBe(lanes);
  });
  it("sizes a sideline row the same before and after its first Tamer", () => {
    const sideline = { supportScale: 1, reserveSupport: true, overlapLanes: true };
    const row = { width: 1257, height: 323 };
    const empty = fitLanes(row, 100, { digimonCount: 1, supportCount: 0, ...sideline });
    const withTamer = fitLanes(row, 100, { digimonCount: 1, supportCount: 1, ...sideline });
    expect(withTamer).toEqual(empty);
    expect(withTamer).toMatchObject({ placement: LanePlacement.Stacked, support: withTamer.digimon });
  });
  it("gains width when stacked lanes share their clearance", () => {
    const row = { width: 1257, height: 323 };
    const content = { digimonCount: 1, supportCount: 1, supportScale: 1 };
    const separate = fitLanes(row, 100, content);
    const shared = fitLanes(row, 100, { ...content, overlapLanes: true });
    expect(shared.digimon).toBeGreaterThan(separate.digimon);
  });
  it("keeps portrait support below Digimon when both lanes fit", () => {
    const lanes = fitLanes({ width: 288, height: 320 }, 84, {
      ...crowded,
      digimonSources: 12,
      digimonLinks: 2,
      supportSources: 8,
      sourceTop: 2,
      sourceStep: 1.25,
      preferStacked: true,
    });
    expect(lanes.placement).toBe(LanePlacement.Stacked);
    expect(lanes.digimon).toBeGreaterThanOrEqual(72);
    expect(lanes.support).toBe(52);
  });
  it("merges a short portrait row into one lane of equal cards", () => {
    const lanes = fitLanes({ width: 288, height: 116 }, 76, {
      ...crowded,
      digimonSources: 12,
      digimonLinks: 2,
      supportSources: 8,
      preferStacked: true,
      sourceTop: 2,
      sourceStep: 1.25,
    });
    expect(lanes.placement).toBe(LanePlacement.Merged);
    expect(lanes.digimon).toBeGreaterThanOrEqual(40);
    expect(lanes.support).toBe(lanes.digimon);
  });
  it("shrinks a merged lane until Digimon and support fit the row together", () => {
    const upright = { suspended: false, sources: 0, links: 0, copies: 1 };
    const cards = { digimon: [upright, upright], support: [upright] };
    const lanes = { placement: LanePlacement.Merged, digimon: 60, support: 60 };
    const content = { digimonCount: 2, supportCount: 1, supportScale: 1, preferStacked: true, fitWidth: true };
    const fitted = fitLanesToWidth(lanes, 300, cards, content);
    expect(fitted.digimon).toBeLessThan(60);
    expect(fitted.support).toBe(fitted.digimon);
    expect(laneContentWidth([...cards.digimon, ...cards.support], fitted.digimon, 0.25, 4, true)).toBeLessThanOrEqual(
      300,
    );
  });
  it("keeps the layout's width when a single lane has enough height", () => {
    expect(fitLanes({ width: 900, height: 220 }, 116, { digimonCount: 6, supportCount: 0 })).toMatchObject({
      placement: LanePlacement.Stacked,
      digimon: 116,
    });
  });

  it("stacks the lanes when the row is tall enough", () => {
    const lanes = fitLanes({ width: 1300, height: 260 }, 116, crowded);
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
    const lanes = fitLanes({ width: 1600, height: 220 }, 84, { digimonCount: 3, supportCount: 2 });
    expect(lanes.placement).toBe(LanePlacement.Stacked);
    expect(lanes).toEqual(fitLanes({ width: 1600, height: 220 }, 84, crowded));
  });

  it("stays stacked when side by side would push cards out of sight", () => {
    expect(fitLanes({ width: 778, height: 220 }, 84, crowded).placement).toBe(LanePlacement.Stacked);
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
    const lanes = fitLanes({ width: 900, height: 270 }, 116, {
      ...crowded,
      digimonSources: 3,
      supportSources: 4,
      sourceTop: 6,
      sourceStep: 4,
    });
    expect(lanes.placement).toBe(LanePlacement.Stacked);
    expect(Math.ceil(lanes.digimon * 1.4) + Math.ceil(lanes.support * 1.4) + 22 + 24 + 22 + 28).toBeLessThanOrEqual(
      270,
    );
  });

  it("fits a short row even when it contains only Digimon", () => {
    const lanes = fitLanes({ width: 900, height: 90 }, 116, { digimonCount: 3, supportCount: 0, digimonSources: 6 });
    const fan = 6 + 5 * Math.min(4, sourceFanStepLimit(lanes.digimon, 6));
    expect(lanes.digimon * 1.4 + 22 + fan + 4).toBeLessThanOrEqual(90);
  });

  it("keeps deep sources visible without reducing the card to a one-pixel placeholder", () => {
    const height = 77;
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
