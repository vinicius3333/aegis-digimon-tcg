import { describe, expect, it } from "vitest";
import type { CollectedEffect } from "#api/engine/effects/collect";
import { buildEffectQueueSlots } from "#api/engine/effects/resolution/buildEffectQueueSlots";

type Fake = { name: string; seat: 0 | 1; tier: number; planIndex: number };

function build(fakes: readonly Fake[], turnSeat: 0 | 1 = 0): string[][] {
  const byEffect = new Map(fakes.map((fake) => [fake as unknown as CollectedEffect, fake]));
  const read = (collected: CollectedEffect): Fake => byEffect.get(collected)!;
  return buildEffectQueueSlots({
    pending: [...byEffect.keys()],
    turnSeat,
    getTier: (collected) => read(collected).tier,
    getSeat: (collected) => read(collected).seat,
    getPlanIndex: (collected) => read(collected).planIndex,
  }).map((slot) => slot.effects.map((collected) => read(collected).name));
}

describe("buildEffectQueueSlots", () => {
  it("puts the turn player's unordered effects in one shared slot ahead of the opponent's", () => {
    expect(
      build([
        { name: "opponent", seat: 1, tier: 1, planIndex: -1 },
        { name: "first", seat: 0, tier: 1, planIndex: -1 },
        { name: "second", seat: 0, tier: 1, planIndex: -1 },
      ]),
    ).toEqual([["first", "second"], ["opponent"]]);
  });

  it("splits a controller's planned effects into their chosen order before the unplanned rest", () => {
    expect(
      build([
        { name: "unplanned", seat: 0, tier: 1, planIndex: -1 },
        { name: "planned-last", seat: 0, tier: 1, planIndex: 3 },
        { name: "planned-first", seat: 0, tier: 1, planIndex: 0 },
      ]),
    ).toEqual([["planned-first"], ["planned-last"], ["unplanned"]]);
  });

  it("resolves a newer derived tier before older pending effects, even the opponent's", () => {
    expect(
      build([
        { name: "older-turn", seat: 0, tier: 1, planIndex: -1 },
        { name: "derived-opponent", seat: 1, tier: 2, planIndex: -1 },
      ]),
    ).toEqual([["derived-opponent"], ["older-turn"]]);
  });

  it("follows the turn seat when the second player is taking the turn", () => {
    expect(
      build(
        [
          { name: "seat-zero", seat: 0, tier: 1, planIndex: -1 },
          { name: "seat-one", seat: 1, tier: 1, planIndex: -1 },
        ],
        1,
      ),
    ).toEqual([["seat-one"], ["seat-zero"]]);
  });
});
