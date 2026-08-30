import { EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled as BT25_059 } from "./BT25-059.js";

describe("BT25-059 Ceresmon", () => {
  it("matches every catalog surface and maps all printed clauses", () => {
    expect(getCardDefinition("BT25-059")).toMatchObject({
      nameEn: "Ceresmon",
      colors: ["Green", "Yellow"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 12,
      dp: 12000,
      evoCosts: [
        { color: "Green", level: 5, memoryCost: 4 },
        { color: "Yellow", level: 5, memoryCost: 4 },
      ],
      forms: ["Mega"],
      attributes: ["Data"],
      types: ["Shaman", "Olympos XII", "Iliad", "TS", "Vegetation"],
      effectText: expect.stringContaining("2 or more suspended Digimon"),
      dualEffect: "Ceresmon",
    });
    expect(BT25_059.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ trigger: "Static" }),
        expect.objectContaining({ trigger: "OnPlay" }),
        expect.objectContaining({ trigger: "WhenDigivolving" }),
        expect.objectContaining({ trigger: "AllTurns", frequency: "OncePerTurn" }),
      ]),
    );
    expect(BT25_059.digivolutionRequirement).toEqual([
      { level: 5, traits: ["Vegetation", "TS"], cost: 3, isAlternate: true },
    ]);
    expect(BT25_059.effects?.flatMap((effect) => effect.keywords ?? [])).toEqual([]);
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      const effect = BT25_059.effects?.find((entry) => entry.trigger === trigger);
      expect(effect?.actions?.[0]).toMatchObject({
        kind: "Suspend",
        target: { filter: { controllerDefault: "any", kind: ["Digimon"] }, count: 2, upTo: true },
        optional: true,
      });
      expect(effect?.actions?.[1]).toMatchObject({
        kind: "GrantStatic",
        target: {
          filter: { controller: "mine", kind: ["Digimon"], trait: ["Vegetation", "TS"], suspended: true },
          count: "all",
        },
        grant: "immuneToOpponentDigimonEffects",
        duration: "untilOpponentTurnEnd",
      });
      expect(effect?.actions?.[1]?.optional).toBeUndefined();
    }
    const allTurns = BT25_059.effects?.find((entry) => entry.trigger === "AllTurns");
    expect(allTurns?.actions?.[0]).toMatchObject({
      kind: "SubTrigger",
      event: "whenSuspended",
      actions: [
        {
          kind: "ModifyDP",
          amount: -3000,
          duration: "untilOpponentTurnEnd",
          scaling: {
            per: 1,
            unit: "cards",
            filter: { controllerDefault: "any", suspended: true, kind: ["Digimon"] },
          },
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
        },
      ],
    });
  });

  it("reduces the exact 12-cost play to 7 with two suspended Digimon, but not with one", async () => {
    const reduced = setupEngine(
      {
        0: { hand: [{ card: "BT25-059", as: "ceresmon" }] },
        1: {
          battleArea: [
            { card: "BT1-013", as: "suspendedOne", suspended: true },
            { card: "BT1-013", as: "suspendedTwo", suspended: true },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    reduced.state.memory = 7;
    expect(
      reduced.engine.applyIntent(0, { type: "playCard", instanceId: reduced.inst("ceresmon").instanceId }),
    ).toEqual({
      ok: true,
    });
    const reducedPermanent = () => reduced.state.players[0]!.battleArea.find((p) => p.topCard?.cardId === "BT25-059");
    await settle(() => reducedPermanent()?.topCard?.cardId === "BT25-059");
    expect(reduced.state.memory).toBe(0);

    const noReduction = setupEngine({
      0: { hand: [{ card: "BT25-059", as: "ceresmon" }] },
      1: { battleArea: [{ card: "BT1-013", as: "onlySuspended", suspended: true }] },
    });
    noReduction.state.memory = 7;
    expect(
      noReduction.engine.applyIntent(0, { type: "playCard", instanceId: noReduction.inst("ceresmon").instanceId }),
    ).toEqual({ ok: true });
    await settle(() => noReduction.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT25-059"));
    expect(noReduction.state.memory).toBe(-5); // one suspended Digimon is below the two-card threshold
  });

  it("On Play suspends up to two Digimon from either side, then protects all own suspended TS/Vegetation Digimon", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "BT25-059", as: "ceresmon" }],
          battleArea: [
            { card: "BT25-062", as: "ownTs" },
            { card: "BT1-013", as: "ownOther" },
          ],
        },
        1: { battleArea: [{ card: "BT1-013", as: "opponent", dp: 12000 }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("ownTs").permanentId, s.perm("opponent").permanentId);
    s.state.memory = 12;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("ceresmon").instanceId })).toEqual({
      ok: true,
    });
    const playedPermanent = () => s.state.players[0]!.battleArea.find((p) => p.topCard?.cardId === "BT25-059")!;
    await settle(() => s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "BT25-059"));
    await settle(() => observe(s.engine).hasRestriction(s.perm("ownTs"), "beAffected", "Digimon"));

    expect(s.perm("ownTs").isSuspended).toBe(true);
    expect(s.perm("opponent").isSuspended).toBe(true);
    expect(observe(s.engine).hasRestriction(s.perm("ownTs"), "beAffected", "Digimon")).toBe(true);
    expect(observe(s.engine).hasRestriction(s.perm("ownOther"), "beAffected", "Digimon")).toBe(false);
    expect(observe(s.engine).hasKeyword(playedPermanent(), "Reboot")).toBe(false);
    expect(observe(s.engine).hasKeyword(playedPermanent(), "Blocker")).toBe(false);
    expect(observe(s.engine).hasKeyword(playedPermanent(), "Fortitude")).toBe(false);
  });

  it("When Digivolving grants the same protection even when the optional suspend is declined", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT25-053", as: "vegetationBase" },
            { card: "BT25-062", as: "ownTs", suspended: true },
          ],
          hand: [{ card: "BT25-059", as: "ceresmon" }],
        },
      },
      { autoAcceptOptional: false },
    );
    s.state.memory = 3;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("vegetationBase").permanentId,
        instanceId: s.inst("ceresmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "optional");
    const decision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "optional", accept: false },
      }),
    ).toEqual({ ok: true });
    await settle(() => observe(s.engine).hasRestriction(s.perm("ownTs"), "beAffected", "Digimon"));

    expect(s.perm("vegetationBase").topCard.cardId).toBe("BT25-059");
    expect(s.perm("ownTs").isSuspended).toBe(true);
    expect(observe(s.engine).hasRestriction(s.perm("ownTs"), "beAffected", "Digimon")).toBe(true);
  });

  it("counts all suspended Digimon for one once-per-turn DP reduction and keeps the turn-end duration", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT25-059", as: "ceresmon" },
            { card: "BT1-013", as: "alreadySuspended", suspended: true },
            { card: "BT1-013", as: "toSuspend" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-013", as: "otherSuspended", suspended: true },
            { card: "BT1-013", dp: 12000, as: "target" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("target").permanentId);
    await s.ready();
    await advance(s.engine).verb.suspend([s.perm("toSuspend").permanentId]);
    await settle(() => s.perm("target").currentDP === 3000);
    expect(s.perm("target").currentDP).toBe(3000); // 12000 - (3 suspended Digimon × 3000)

    await advance(s.engine).verb.unsuspend([s.perm("toSuspend").permanentId]);
    await advance(s.engine).verb.suspend([s.perm("toSuspend").permanentId]);
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.perm("target").currentDP).toBe(3000); // Once Per Turn: no second -9000

    s.state.turnSeat = 1;
    await advance(s.engine).runTurn(1);
    expect(s.perm("target").currentDP).toBe(12000); // untilOpponentTurnEnd expires after seat 1's turn
  });
});
