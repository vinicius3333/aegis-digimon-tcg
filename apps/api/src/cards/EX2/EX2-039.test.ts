import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX2-039.js";
import "./EX2-040.js";
import "./EX2-043.js";
import "./EX2-074.js";

describe("EX2-039 Impmon", () => {
  it("adds Beelzemon and Ai & Mako from the top four on play", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "EX2-039", as: "impmon" }], deck: [{ card: "EX2-044", as: "beelzemon" }, { card: "EX2-065", as: "aiMako" }, "BT1-001", "BT1-002"] } }, { autoSelectCards: true, autoOrderTriggers: true });
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("impmon").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.length === 2);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual(expect.arrayContaining([s.inst("beelzemon").instanceId, s.inst("aiMako").instanceId]));
  });

  it("does not recursively trigger an Impmon trashed by EX2-039's own mill", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX2-043", as: "attacker", under: ["EX2-040"] }],
        deck: [
          { card: "EX2-039", as: "firstImpmon" },
          "BT1-001",
          { card: "EX2-039", as: "secondImpmon" },
          "BT1-002",
          "BT1-003",
          { card: "BT1-004", as: "sentinel" },
        ],
      },
      1: { security: ["BT1-005"] },
    }, {
      autoAcceptOptional: true,
      autoOrderTriggers: true,
      autoSelectCards: true,
      autoChooseOption: true,
      preferOptionIndex: 2,
    });
    await s.ready();

    expect(s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("attacker").permanentId,
      target: { kind: "player" },
    })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.length === 5);

    expect(s.state.players[0]!.trash).toHaveLength(5);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([
      s.inst("sentinel").instanceId,
    ]);
    assertNoLoudGap(s);
  });

  it("may trash only one card after activating its up-to-three mill", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "EX2-043", as: "attacker", under: ["EX2-040"] }],
        deck: [
          { card: "EX2-039", as: "impmon" },
          "BT1-001",
          { card: "BT1-002", as: "chosenMill" },
          { card: "BT1-003", as: "sentinel" },
        ],
      },
      1: { security: ["BT1-004"] },
    }, {
      autoAcceptOptional: true,
      autoOrderTriggers: true,
      autoSelectCards: true,
      autoChooseOption: true,
      preferOptionIndex: 0,
    });
    await s.ready();

    expect(s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("attacker").permanentId,
      target: { kind: "player" },
    })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.trash.length === 3);

    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(
      s.inst("chosenMill").instanceId,
    );
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([
      s.inst("sentinel").instanceId,
    ]);
    assertNoLoudGap(s);
  });

  it("grants its inherited DP bonus to a later Beelzemon form", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "EX2-074", as: "blastMode", under: ["EX2-039"] }] },
    });
    await s.ready();
    await s.engine.recomputeContinuousEffects();
    await s.engine.recomputeContinuousEffects();

    expect(s.perm("blastMode").currentDP).toBe(18_000);
    assertNoLoudGap(s);
  });
});
