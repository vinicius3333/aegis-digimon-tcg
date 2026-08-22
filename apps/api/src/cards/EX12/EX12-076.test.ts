import { EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./EX12-076.js";

import "../index.js";

const CARD_ID = "EX12-076";
const FOUR_COLOR_STACK = ["EX12-015", "EX12-019", "EX12-020"];
const THREE_COLOR_STACK = ["EX12-015", "EX12-019"];

describe("EX12-076 Susanoomon", () => {
  it("preserves the printed evolution and Assembly requirements", () => {
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 6, traits: ["Hybrid", "Shambala", "TS"], cost: 5, isAlternate: true },
    ]);
    expect(compiled.assemblyRequirement).toEqual([
      {
        materials: [{ count: 8, traits: ["Hybrid", "Shambala"], differentNames: true }],
        reduceCost: 9,
      },
    ]);
  });

  it("trashes the opponent's top security and recovers only after the four-color condition", () => {
    const attacking = compiled.effects.find((effect) => effect.trigger === "WhenAttacking")!;
    expect(attacking.frequency).toBe("OncePerTurn");
    expect(attacking.actions[0]).toMatchObject({
      kind: "SecurityManipulation",
      op: "placeAsSecurity",
      controller: "opponent",
    });
    expect(attacking.actions.slice(1)).toMatchObject([
      {
        kind: "SecurityManipulation",
        op: "trashTop",
        controller: "opponent",
        amount: 1,
        condition: { kind: "selfDigivolutionStackDistinctColorCount", op: "gte", value: 4 },
      },
      {
        kind: "GainKeyword",
        keyword: { keyword: "Recovery", amount: 1 },
        condition: { kind: "selfDigivolutionStackDistinctColorCount", op: "gte", value: 4 },
      },
    ]);
  });

  it("keeps Rush, Raid, Blocker, and the Rule-granted Hybrid trait active", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: CARD_ID, as: "susanoo" }] } });
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("susanoo"), "Rush")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("susanoo"), "Raid")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("susanoo"), "Blocker")).toBe(true);
    expect(observe(s.engine).hasEffectiveTrait(s.perm("susanoo"), "Hybrid")).toBe(true);
  });

  it.each([EffectTiming.OnPlay, EffectTiming.WhenDigivolving])(
    "reduces every opposing Digimon by 3000 for each distinct stack color at %s",
    async (timing) => {
      const s = setupEngine({
        0: { battleArea: [{ card: CARD_ID, as: "susanoo", under: FOUR_COLOR_STACK }] },
        1: {
          battleArea: [
            { card: "BT1-009", as: "first", dp: 16000 },
            { card: "BT1-010", as: "second", dp: 14000 },
          ],
        },
      });
      await s.ready();

      await advance(s.engine).fire(timing, s.perm("susanoo"));

      expect(s.perm("first").currentDP).toBe(4000);
      expect(s.perm("second").currentDP).toBe(2000);
    },
  );

  it("places the opponent's Digimon in security without the conditional trash or Recovery at three colors", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: CARD_ID, as: "susanoo", under: THREE_COLOR_STACK }] },
        1: { battleArea: [{ card: "BT1-009", as: "victim" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    const victimId = s.perm("victim").topCard!.instanceId;
    await s.ready();

    await advance(s.engine).fireForPermanent(EffectTiming.OnUseAttack, s.perm("susanoo"));

    expect(s.state.players[1]!.security.at(-1)?.instanceId).toBe(victimId);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === victimId)).toBe(false);
    expect(s.state.players[0]!.security).toHaveLength(0);
  });

  it("trashes the placed security Digimon and recovers one card at four colors", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: CARD_ID, as: "susanoo", under: FOUR_COLOR_STACK }],
          deck: ["BT1-101"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "victim" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    const victimId = s.perm("victim").topCard!.instanceId;
    await s.ready();

    await advance(s.engine).fireForPermanent(EffectTiming.OnUseAttack, s.perm("susanoo"));

    expect(s.state.players[1]!.security.some((card) => card.instanceId === victimId)).toBe(false);
    expect(s.state.players[1]!.trash.some((card) => card.instanceId === victimId)).toBe(true);
    expect(s.state.players[0]!.security.at(-1)?.cardId).toBe("BT1-101");
    expect(s.state.players[0]!.deck).toHaveLength(0);
  });
});
