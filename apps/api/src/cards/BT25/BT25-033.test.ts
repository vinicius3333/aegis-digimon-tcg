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
          count: 1,
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

  it("resolves On Play publicly with the exact play cost, security payment, and temporary DP change", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT25-033", as: "aegiomon" }],
          security: [
            { card: "BT1-009", as: "topCost" },
            { card: "BT1-010", as: "secondCost" },
          ],
        },
        1: { battleArea: [{ card: "BT1-010", as: "target", dp: 10000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("aegiomon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.perm("aegiomon").currentDP === 5000);
    expect(s.state.memory).toBe(0);
    expect(s.state.players[0]!.hand).toContainEqual(
      expect.objectContaining({ instanceId: s.inst("topCost").instanceId }),
    );
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[0]!.security[0]!.instanceId).toBe(s.inst("secondCost").instanceId);
    expect(s.perm("target").currentDP).toBe(5000);
    await advance(s.engine).runTurn(0);
    expect(s.perm("target").currentDP).toBe(10000);
  });

  it("cannot pay the On Play effect with an empty security stack", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT25-033", as: "aegiomon" }] },
        1: { battleArea: [{ card: "BT1-010", as: "target", dp: 10000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 5;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("aegiomon").instanceId })).toEqual({
      ok: true,
    });
    await settle();
    expect(s.perm("target").currentDP).toBe(10000);
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.security).toHaveLength(0);
  });

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

  it("accepts inherited Barrier through a legal BT25-025 over Aegiomon stack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT25-025", as: "host", under: ["BT25-033"], suspended: true }],
        security: [{ card: "BT1-001", as: "barrierCost" }],
      },
      1: { battleArea: [{ card: "BT1-010", as: "attacker", dp: 10000 }] },
    });
    s.state.turnSeat = 1;
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Barrier")).toBe(true);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("host").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "barrierPrompt"));
    expect(
      s.engine.applyIntent(0, { type: "respondBarrier", permanentId: s.perm("host").permanentId, accept: true }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.security).toHaveLength(0);
  });

  it("uses Aegiomon's own Barrier in a public attack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT25-033", as: "host", suspended: true }],
        security: [{ card: "BT1-001", as: "barrierCost" }],
      },
      1: { battleArea: [{ card: "BT1-010", as: "attacker", dp: 10000 }] },
    });
    s.state.turnSeat = 1;
    await s.ready();
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: s.perm("host").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.events.some((event) => event.kind === "barrierPrompt"));
    expect(
      s.engine.applyIntent(0, { type: "respondBarrier", permanentId: s.perm("host").permanentId, accept: true }),
    ).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[0]!.battleArea).toHaveLength(1);
    expect(s.state.players[0]!.security).toHaveLength(0);
  });

  it("lets a declined or unpayable inherited Barrier delete the legal host", async () => {
    const declined = setupEngine({
      0: {
        battleArea: [{ card: "BT25-025", as: "host", under: ["BT25-033"], suspended: true }],
        security: [{ card: "BT1-001", as: "barrierCost" }],
      },
      1: { battleArea: [{ card: "BT1-010", as: "attacker", dp: 10000 }] },
    });
    declined.state.turnSeat = 1;
    await declined.ready();
    expect(
      declined.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: declined.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: declined.perm("host").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => declined.events.some((event) => event.kind === "barrierPrompt"));
    expect(
      declined.engine.applyIntent(0, {
        type: "respondBarrier",
        permanentId: declined.perm("host").permanentId,
        accept: false,
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(declined.engine).isAttacking());
    expect(declined.state.players[0]!.battleArea).toHaveLength(0);

    const unpayable = setupEngine({
      0: { battleArea: [{ card: "BT25-025", as: "host", under: ["BT25-033"], suspended: true }] },
      1: { battleArea: [{ card: "BT1-010", as: "attacker", dp: 10000 }] },
    });
    unpayable.state.turnSeat = 1;
    await unpayable.ready();
    expect(
      unpayable.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: unpayable.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: unpayable.perm("host").permanentId },
      }),
    ).toEqual({ ok: true });
    await settle(() => !observe(unpayable.engine).isAttacking());
    expect(unpayable.state.players[0]!.battleArea).toHaveLength(0);
    expect(unpayable.events.some((event) => event.kind === "barrierPrompt")).toBe(false);
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

  it("rejects a same-level level-3 source without TS through the public evolution intent", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "nonTsBase" }], hand: [{ card: "BT25-033", as: "aegiomon" }] },
    });
    await s.ready();
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("nonTsBase").permanentId,
        instanceId: s.inst("aegiomon").instanceId,
        useAlternateCost: true,
        alternateRequirementIndex: 0,
      }),
    ).toMatchObject({ ok: false });
  });
});
