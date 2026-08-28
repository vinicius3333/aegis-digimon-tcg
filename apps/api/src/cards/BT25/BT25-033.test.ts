import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { matchingAlternateDigivolutionRequirement } from "../../engine/cards/cardData.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled as BT25_033 } from "./BT25-033.js";
import "../index.js";

describe("BT25-033 Aegiomon", () => {
  it("requires adding your top security card before the -5000 DP effect", () => {
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      const effect = BT25_033.effects?.find((entry) => entry.trigger === trigger);
      expect(effect?.actions?.[0]).toMatchObject({
        kind: "ModifyDP",
        amount: -5000,
        duration: "forTheTurn",
        optional: true,
        abortOnDecline: true,
        cost: {
          kind: "securityToHand",
          controller: "mine",
          amount: 1,
        },
      });
    }
  });

  it("targets one opponent Digimon and preserves both Barrier keywords", () => {
    expect(BT25_033.effects?.[0]).toMatchObject({ trigger: "Static", keywords: [{ keyword: "Barrier" }] });
    expect(BT25_033.effects?.[3]).toMatchObject({
      trigger: "Static",
      isInherited: true,
      keywords: [{ keyword: "Barrier" }],
    });
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      const effect = BT25_033.effects?.find((entry) => entry.trigger === trigger);
      expect(effect?.actions?.[0]).toMatchObject({
        target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
      });
    }
  });

  it.each([EffectTiming.OnPlay, EffectTiming.WhenDigivolving])(
    "%s may add top security to hand to give one opposing Digimon -5000 DP for the turn",
    async (timing) => {
      const s = setupEngine(
        {
          0: {
            battleArea: [{ card: "BT25-033", as: "aegiomon" }],
            security: [{ card: "BT1-009", as: "cost" }],
          },
          1: {
            battleArea: [
              { card: "BT1-010", as: "target", dp: 10000 },
              { card: "BT1-009", as: "untouched", dp: 10000 },
            ],
          },
        },
        { autoAcceptOptional: true, autoSelectCards: true },
      );

      await advance(s.engine).fireForPermanent(timing, s.perm("aegiomon"));

      expect(s.state.players[0]!.security).toHaveLength(0);
      expect(s.state.players[0]!.hand.map((card) => card.cardId)).toContain("BT1-009");
      expect(s.perm("target").currentDP).toBe(5000);
      expect(s.perm("untouched").currentDP).toBe(10000);
    },
  );

  it("does not pay or apply the DP reduction when the optional cost is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT25-033", as: "aegiomon" }],
          security: [{ card: "BT1-009", as: "cost" }],
        },
        1: { battleArea: [{ card: "BT1-010", as: "target", dp: 10000 }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("aegiomon"));

    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.perm("target").currentDP).toBe(10000);
  });

  it("inherits Barrier through a realistic evolution stack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT25-025", as: "host", under: ["BT25-033"] }],
        },
        1: { battleArea: [{ card: "BT1-010", as: "target", dp: 10000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(observe(s.engine).hasKeyword(s.perm("host"), "Barrier")).toBe(true);
  });

  it("expires the DP reduction at the end of the turn", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT25-033", as: "aegiomon" }],
          security: [{ card: "BT1-009", as: "cost" }],
        },
        1: { battleArea: [{ card: "BT1-010", as: "target", dp: 10000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("aegiomon"));
    expect(s.perm("target").currentDP).toBe(5000);

    await advance(s.engine).runTurn(0);
    expect(s.perm("target").currentDP).toBe(10000);
  });

  it("matches only level-3 TS evolution sources and resolves the When Digivolving cost", async () => {
    expect(matchingAlternateDigivolutionRequirement("BT25-033", "BT25-030")?.cost).toBe(2);
    expect(matchingAlternateDigivolutionRequirement("BT25-033", "BT25-032")).toBeUndefined();

    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT25-030", as: "base" }],
          hand: [{ card: "BT25-033", as: "aegiomon" }],
          security: [{ card: "BT1-009", as: "cost" }],
        },
        1: { battleArea: [{ card: "BT1-010", as: "target", dp: 10000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("aegiomon").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("aegiomon").instanceId);

    expect(s.state.memory).toBe(3);
    expect(s.state.players[0]!.security).toHaveLength(0);
    expect(s.perm("target").currentDP).toBe(5000);
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["BT25-030"]);
  });
});
