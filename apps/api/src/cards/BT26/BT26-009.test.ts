import { describe, expect, it } from "vitest";
import { EffectTiming, digivolutionRequirementsFor } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT26-009.js";
import "../index.js";

describe("BT26-009 Hyokomon", () => {
  it("compiles both printed clauses with complete coverage", () => {
    expect(compiled).toMatchObject({
      coverage: "full",
      effects: [{ trigger: "StartOfYourMainPhase" }, { trigger: "WhenAttacking", isInherited: true }],
    });
  });
  it("uses the exact off-color Lv.2 [TS] cost-0 evolution path and rejects a near-match", async () => {
    expect(digivolutionRequirementsFor("BT26-009")).toContainEqual({
      level: 2,
      traits: ["TS"],
      cost: 0,
      isAlternate: true,
    });

    const legal = setupEngine({
      0: {
        breeding: { card: "BT24-002", as: "tsEgg" },
        hand: [{ card: "BT26-009", as: "hyokomon" }],
        deck: ["BT1-009"],
      },
    });
    expect(
      legal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: legal.perm("tsEgg").permanentId,
        instanceId: legal.inst("hyokomon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual({ ok: true });
    await settle(() => legal.perm("tsEgg").topCard.cardId === "BT26-009");
    expect(legal.perm("tsEgg").stack.map((card) => card.cardId)).toEqual(["BT24-002"]);
    expect(legal.state.memory).toBe(0);

    const illegal = setupEngine({
      0: {
        breeding: { card: "BT21-005", as: "plainEgg" },
        hand: [{ card: "BT26-009", as: "hyokomon" }],
      },
    });
    expect(
      illegal.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: illegal.perm("plainEgg").permanentId,
        instanceId: illegal.inst("hyokomon").instanceId,
        useAlternateCost: true,
      }),
    ).toEqual(expect.objectContaining({ ok: false }));
  });

  it("Q6963 pays with a card that mentions Chronomon only in inherited text, then draws and gains memory", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-009", as: "hyokomon" }],
          hand: [
            { card: "BT26-001", as: "chronomonText" },
            { card: "BT1-009", as: "unrelated" },
          ],
          deck: [{ card: "BT1-010", as: "drawn" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("chronomonText").instanceId);

    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("hyokomon"));

    expect(s.state.memory).toBe(1);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(s.inst("chronomonText").instanceId);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([s.inst("unrelated").instanceId, s.inst("drawn").instanceId]),
    );
    expect(s.state.players[0]!.deck).toHaveLength(0);
  });

  it("accepts the alternative Shaman-trait cost while rejecting an unrelated hand card", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-009", as: "hyokomon" }],
          hand: [
            { card: "BT26-032", as: "shaman" },
            { card: "BT1-009", as: "unrelated" },
          ],
          deck: [{ card: "BT1-010", as: "drawn" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("shaman").instanceId);

    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("hyokomon"));

    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toEqual([s.inst("shaman").instanceId]);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual(
      expect.arrayContaining([s.inst("unrelated").instanceId, s.inst("drawn").instanceId]),
    );
    expect(s.state.memory).toBe(1);
  });

  it("does not draw or gain memory when no hand card can pay the start-main cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-009", as: "hyokomon" }],
          hand: [{ card: "BT1-009", as: "unrelated" }],
          deck: [{ card: "BT1-010", as: "notDrawn" }],
        },
      },
      { autoAcceptOptional: true },
    );

    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("hyokomon"));

    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("unrelated").instanceId]);
    expect(s.state.players[0]!.deck.map(({ instanceId }) => instanceId)).toEqual([s.inst("notDrawn").instanceId]);
    expect(s.state.memory).toBe(0);
  });

  it("may decline the optional start-main payment without trashing, drawing, or gaining memory", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-009", as: "hyokomon" }],
          hand: [{ card: "BT26-016", as: "eligibleCost" }],
          deck: [{ card: "BT1-010", as: "notDrawn" }],
        },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );

    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("hyokomon"));

    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("eligibleCost").instanceId]);
    expect(s.state.players[0]!.trash).toHaveLength(0);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([s.inst("notDrawn").instanceId]);
    expect(s.state.memory).toBe(0);
  });

  it("inherited attack draws first, then at exactly 6 returns one hand card face-down to deck bottom", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT26-014", as: "host", under: [{ card: "BT26-009" }] }],
          hand: [{ card: "BT1-009", as: "bottom" }, "BT1-010", "BT1-011", "BT1-012", "BT1-013"],
          deck: [{ card: "BT1-014", as: "drawn" }],
        },
      },
      { autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.inst("bottom").instanceId);

    await advance(s.engine).fireForPermanent(EffectTiming.OnUseAttack, s.perm("host"), {
      attackerPermanentId: s.perm("host").permanentId,
    });

    expect(s.state.players[0]!.hand).toHaveLength(5);
    expect(s.state.players[0]!.hand.some(({ instanceId }) => instanceId === s.inst("drawn").instanceId)).toBe(true);
    expect(s.state.players[0]!.deck.at(-1)?.instanceId).toBe(s.inst("bottom").instanceId);
    expect(s.state.players[0]!.deck.at(-1)?.faceUp).toBe(false);
  });

  it("inherited attack stops after drawing when the post-draw hand has only 5 cards", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT26-014", as: "host", under: [{ card: "BT26-009" }] },
          { card: "BT1-009", as: "ally" },
        ],
        hand: ["BT1-001", "BT1-002", "BT1-003", "BT1-004"],
        deck: [{ card: "BT1-005", as: "drawn" }],
      },
    });
    await advance(s.engine).fireForPermanent(EffectTiming.OnUseAttack, s.perm("ally"), {
      attackerPermanentId: s.perm("ally").permanentId,
    });
    expect(s.state.players[0]!.hand).toHaveLength(4);
    expect(s.state.players[0]!.deck).toHaveLength(1);

    await advance(s.engine).fireForPermanent(EffectTiming.OnUseAttack, s.perm("host"), {
      attackerPermanentId: s.perm("host").permanentId,
    });
    expect(s.state.players[0]!.hand).toHaveLength(5);
    expect(s.state.players[0]!.deck).toHaveLength(0);
  });
});
