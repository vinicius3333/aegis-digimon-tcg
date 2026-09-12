import { describe, expect, it } from "vitest";
import { digivolutionRequirementsFor } from "@aegis/shared";
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
          security: ["BT1-009", "BT1-009"],
          deck: [
            "BT1-009",
            "BT1-010",
            "BT1-011",
            "BT1-012",
            "BT1-013",
            "BT1-014",
            "BT1-009",
            "BT1-010",
            "BT1-011",
            "BT1-012",
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-009", as: "target" },
            { card: "BT26-034", as: "opponentVegetation" },
          ],
          deck: [
            "BT1-009",
            "BT1-010",
            "BT1-011",
            "BT1-012",
            "BT1-013",
            "BT1-014",
            "BT1-009",
            "BT1-010",
            "BT1-011",
            "BT1-012",
          ],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("vegetationCost").permanentId, s.perm("target").permanentId);
    s.state.memory = 4;
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);

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

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
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
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });

  it("may decline the suspension payment, and an already-suspended trait Digimon cannot pay it", async () => {
    const declined = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-024", as: "cost" }],
          hand: [{ card: "BT26-027", as: "petermon" }],
        },
        1: { battleArea: [{ card: "BT1-009", as: "target" }], deck: ["BT1-009", "BT1-010", "BT1-011"] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await declined.ready();
    expect(
      declined.engine.applyIntent(0, { type: "playCard", instanceId: declined.inst("petermon").instanceId }),
    ).toEqual({ ok: true });
    await settle();
    expect(declined.perm("cost").isSuspended).toBe(false);
    expect(observe(declined.engine).keywordAmount(declined.perm("target"), "SecurityAttack")).toBe(0);

    const unpayable = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT26-027", as: "petermon", suspended: true },
            { card: "BT26-024", as: "suspendedCost", suspended: true },
          ],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014"],
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "target" }],
          security: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013"],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const unpayableLoop = unpayable.engine.startTurnLoop();
    await advance(unpayable.engine).waitForMainPhase(0);
    expect(
      unpayable.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: unpayable.perm("suspendedCost").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();
    expect(
      unpayable.engine.applyIntent(0, {
        type: "attack",
        attackerPermanentId: unpayable.perm("petermon").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle();
    advance(unpayable.engine).endMainPhaseIfOpen(0);
    await advance(unpayable.engine).waitForMainPhase(1);
    expect(observe(unpayable.engine).keywordAmount(unpayable.perm("target"), "SecurityAttack")).toBe(0);
    advance(unpayable.engine).endMainPhaseIfOpen(1);
    await advance(unpayable.engine).waitForMainPhase(0);
    expect(unpayable.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await unpayableLoop;
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
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014"],
        },
        1: {
          battleArea: [{ card: "BT1-009", as: "target" }],
          deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012", "BT1-013", "BT1-014"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("cost").permanentId);
    const loop = s.engine.startTurnLoop();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);

    expect(s.perm("cost").isSuspended).toBe(true);
    expect(observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack")).toBe(-2);
    advance(s.engine).ledgers.continuous.sweep(s.state, "eachTurnEnd", 1);
    expect(observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack")).toBe(0);
    advance(s.engine).endMainPhaseIfOpen(1);
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
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
