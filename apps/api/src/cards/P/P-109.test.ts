import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "./P-109.js";

describe("P-109 Imperialdramon: Dragon Mode", () => {
  it("suspends then unsuspends a Digimon on play and may play a small card", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "P-109", as: "dragon" }, { card: "BT1-009", as: "small" }],
        security: ["BT1-001"],
      },
      1: { battleArea: [{ card: "BT1-010", as: "target" }] },
    }, { autoAcceptOptional: true, autoSelectCards: true });
    await s.ready();

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("dragon").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined && s.state.players[0]!.battleArea.some((p) => p.topCard?.cardId === "P-109"));

    const dragon = s.state.players[0]!.battleArea.find((p) => p.topCard?.cardId === "P-109")!;
    expect(dragon.isSuspended).toBe(false);
    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-009")).toBe(true);
    assertNoLoudGap(s);
  });

  it("fires its once-per-turn all-turns effect when it becomes suspended", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "P-109", as: "dragon" }],
        hand: [{ card: "BT1-009", as: "small" }],
        security: ["BT1-001"],
      },
      1: { battleArea: [{ card: "BT1-010", as: "opponent" }], security: ["BT1-001"] },
    }, { autoAcceptOptional: true, autoSelectCards: true });
    await s.ready();

    expect(s.engine.applyIntent(0, {
      type: "attack",
      attackerPermanentId: s.perm("dragon").permanentId,
      target: { kind: "player" },
    })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined && s.perm("dragon").isSuspended);

    expect(s.state.players[0]!.hand.some((card) => card.cardId === "BT1-009")).toBe(true);
    assertNoLoudGap(s);
  });
});
