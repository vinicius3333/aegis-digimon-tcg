import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT1-082.js";

describe("BT1-082 Rosemon", () => {
  it("matches the catalog contract", () => {
    expect(getCardDefinition("BT1-082")).toMatchObject({
      cardId: "BT1-082",
      set: "BT1",
      nameEn: "Rosemon",
      colors: ["Green"],
      kinds: ["Digimon"],
      level: 6,
      playCost: 12,
      dp: 11000,
      evoCosts: [{ color: "Green", level: 5, memoryCost: 3 }],
      forms: ["Mega"],
      attributes: ["Data"],
      types: ["Fairy"],
      rarity: "SR",
      maxCountInDeck: 4,
      imageId: "BT1-082",
      nameJp: "ロゼモン",
    });
    expect(getCardDefinition("BT1-082")?.effectText).toContain("Opponent's Turn");
    expect(getCardDefinition("BT1-082")?.inheritedEffectText).toBeUndefined();
    expect(getCardDefinition("BT1-082")?.securityEffectText).toBeUndefined();
  });

  it("digivolves from a green level 5 for 3 memory, draws, and preserves its source stack", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-076", as: "base" }],
        hand: [{ card: "BT1-082", as: "rosemon" }],
        deck: ["BT1-010"],
      },
    });
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("rosemon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("rosemon").instanceId);

    expect(s.state.memory).toBe(0);
    expect(s.perm("base").stack.map((card) => card.cardId)).toEqual(["BT1-076"]);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-010")).toBe(true);
  });

  it("rejects evolution from a non-green level 5", () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-021", as: "redBase" }], hand: [{ card: "BT1-082", as: "rosemon" }] },
    });

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("redBase").permanentId,
        instanceId: s.inst("rosemon").instanceId,
      }),
    ).toEqual({ ok: false, reason: "invalid-evolution" });
  });

  it("suspends an opposing Digimon when another opposing Digimon attacks the player while Rosemon is suspended", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT1-082", as: "rosemon", suspended: true, under: ["BT1-073", "BT1-076"] }],
          security: ["BT1-010"],
        },
        1: {
          battleArea: [
            { card: "BT1-016", as: "attacker" },
            { card: "BT1-017", as: "target" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("target").permanentId);
    s.state.turnSeat = 1;
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").isSuspended);
    expect(s.perm("target").isSuspended).toBe(true);
  });

  it("allows Rosemon's controller to choose an opposing Digimon with Blocker (Q936)", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-082", as: "rosemon", suspended: true }], security: ["BT1-010"] },
      1: {
        battleArea: [
          { card: "BT1-016", as: "attacker" },
          { card: "BT1-072", as: "blocker" },
        ],
      },
    });
    s.state.turnSeat = 1;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision?.kind === "chooseTargets");
    const decision = s.state.pendingDecision!;
    expect(
      s.engine.applyIntent(0, {
        type: "respondDecision",
        decisionId: decision.decisionId,
        response: { kind: "chooseTargets", instanceIds: [s.perm("blocker").permanentId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("blocker").isSuspended);

    expect(s.perm("blocker").isSuspended).toBe(true);
  });

  it("activates if Rosemon becomes suspended before activation (Q937)", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-082", as: "rosemon" }], security: ["BT1-010"] },
        1: {
          battleArea: [
            { card: "BT1-016", as: "attacker" },
            { card: "BT1-017", as: "target" },
          ],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("target").permanentId);
    s.state.turnSeat = 1;
    await advance(s.engine).verb.suspend([s.perm("rosemon").permanentId], 1);

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("target").isSuspended);

    expect(s.perm("target").isSuspended).toBe(true);
  });

  it("does not activate if Rosemon becomes unsuspended before activation (Q938)", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT1-082", as: "rosemon", suspended: true }], security: ["BT1-010"] },
        1: {
          battleArea: [
            { card: "BT1-016", as: "attacker" },
            { card: "BT1-017", as: "target" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    await advance(s.engine).verb.unsuspend([s.perm("rosemon").permanentId]);

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "player" },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 0);

    expect(s.perm("target").isSuspended).toBe(false);
  });

  it("does not activate when the attack targets a Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT1-082", as: "rosemon", suspended: true },
            { card: "BT1-010", as: "defender", suspended: true },
          ],
        },
        1: {
          battleArea: [
            { card: "BT1-016", as: "attacker" },
            { card: "BT1-017", as: "target" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    const defenderId = s.perm("defender").permanentId;

    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("attacker").permanentId,
        target: { kind: "permanent", permanentId: defenderId },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.every((permanent) => permanent.permanentId !== defenderId));

    expect(s.perm("target").isSuspended).toBe(false);
  });
});
