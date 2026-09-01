import { describe, expect, it } from "vitest";
import { EffectTiming, Phase, digivolutionRequirementsFor } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT26-027.js";

describe("BT26-027 Petermon", () => {
  it("models both printed timing windows and suspension cost", () => {
    expect(compiled.digivolutionRequirement).toEqual([{ level: 3, traits: ["WG"], cost: 2, isAlternate: true }]);
    expect(compiled.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          trigger: "OnPlay",
          actions: [
            expect.objectContaining({
              kind: "GainKeyword",
              keyword: { keyword: "SecurityAttack", amount: -2 },
              duration: "untilOpponentTurnEnd",
              cost: {
                kind: "suspend",
                target: { filter: expect.objectContaining({ controllerDefault: "mine", kind: ["Digimon"] }), count: 1 },
              },
            }),
          ],
        }),
        expect.objectContaining({ trigger: "StartOfOpponentsMainPhase" }),
      ]),
    );
  });

  it("publicly pays by suspending an eligible WG Digimon and removes two Security Attack", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-034", as: "vegetationCost" },
            { card: "BT1-009", as: "nonTrait" },
          ],
          hand: [{ card: "BT26-027", as: "petermon" }],
          security: ["BT1-001", "BT1-002"],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "target" },
            { card: "BT26-034", as: "opponentVegetation" },
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("vegetationCost").permanentId, s.perm("target").permanentId);
    s.state.memory = 4;
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("petermon").instanceId })).toEqual({
      ok: true,
    });
    await settle();

    expect(s.perm("vegetationCost").isSuspended).toBe(true);
    expect(s.perm("nonTrait").isSuspended).toBe(false);
    expect(s.perm("opponentVegetation").isSuspended).toBe(false);
    const costRequest = s.decisions.find(
      ({ req }) =>
        req.kind === "chooseTargets" &&
        req.options?.candidateInstanceIds?.includes(s.perm("vegetationCost").permanentId),
    );
    expect(costRequest?.req.options?.candidateInstanceIds).toEqual(
      expect.arrayContaining([s.perm("vegetationCost").permanentId]),
    );
    expect(observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack")).toBe(-2);

    s.state.turnSeat = 1;
    s.state.phase = Phase.Main;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("target").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").isSuspended);
    await settle();
    expect(s.state.players[0]!.security).toHaveLength(2);
  });

  it("may decline the suspension payment, and an already-suspended trait Digimon cannot pay it", async () => {
    const declined = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-027", as: "petermon" },
            { card: "BT26-024", as: "cost" },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await advance(declined.engine).fire(EffectTiming.OnPlay, declined.perm("petermon"));
    expect(declined.perm("cost").isSuspended).toBe(false);
    expect(observe(declined.engine).keywordAmount(declined.perm("target"), "SecurityAttack")).toBe(0);

    const unpayable = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-027", as: "petermon", suspended: true },
            { card: "BT26-024", as: "suspendedCost", suspended: true },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await advance(unpayable.engine).fire(EffectTiming.OnPlay, unpayable.perm("petermon"));
    expect(observe(unpayable.engine).keywordAmount(unpayable.perm("target"), "SecurityAttack")).toBe(0);
  });

  it("resolves again at the start of the opponent's main phase and expires at that turn end", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-027", as: "petermon" },
            { card: "BT26-024", as: "cost" },
          ],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("cost").permanentId);
    s.state.turnSeat = 1;

    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("petermon"));

    expect(s.perm("cost").isSuspended).toBe(true);
    expect(observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack")).toBe(-2);
    advance(s.engine).ledgers.continuous.sweep(s.state, "eachTurnEnd", 1);
    expect(observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack")).toBe(0);
  });

  it("grants inherited Barrier only while Petermon is under another Digimon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT26-027", as: "top" },
          { card: "BT21-050", as: "host", under: [{ card: "BT26-027", as: "source" }] },
        ],
      },
    });
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Barrier")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("top"), "Barrier")).toBe(false);
  });

  it("uses the exact level-3 WG cost-2 evolution and rejects a near-match", async () => {
    expect(digivolutionRequirementsFor("BT26-027")).toContainEqual({
      level: 3,
      traits: ["WG"],
      cost: 2,
      isAlternate: true,
    });
    const legal = setupEngine({
      0: {
        battleArea: [{ card: "BT26-024", as: "base" }],
        hand: [{ card: "BT26-027", as: "petermon" }],
        deck: ["BT1-009"],
      },
    });
    legal.state.memory = 2;
    expect(
      legal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: legal.perm("base").permanentId,
        instanceId: legal.inst("petermon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => legal.perm("base").topCard.cardId === "BT26-027");
    expect(legal.state.memory).toBe(0);
    expect(legal.perm("base").stack.map(({ cardId }) => cardId)).toEqual(["BT26-024"]);

    const invalid = setupEngine({
      0: {
        battleArea: [{ card: "BT1-009", as: "base" }],
        hand: [{ card: "BT26-027", as: "petermon" }],
      },
    });
    invalid.state.memory = 2;
    expect(
      invalid.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: invalid.perm("base").permanentId,
        instanceId: invalid.inst("petermon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
  });
});
