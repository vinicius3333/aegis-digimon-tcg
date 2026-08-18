import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT4-041.js";
import "./BT4-045.js";

describe("BT4-045 Maycrackmon", () => {
  it("gives all of your Security Digimon +4000 DP on the opponent's turn at 3 or fewer security", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT4-045", as: "may" }], security: ["BT1-001", "BT1-002", "BT1-003"] } });
    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).securityDp(0)).toBe(4000);
  });

  it.each([
    { label: "on its controller's turn", turnSeat: 0 as const, security: 3 },
    { label: "with four security cards", turnSeat: 1 as const, security: 4 },
  ])("does not grant Security DP $label", async ({ turnSeat, security }) => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT4-045", as: "may" }], security },
    });
    s.state.turnSeat = turnSeat;

    await s.engine.recomputeContinuousEffects();

    expect(observe(s.engine).securityDp(0)).toBe(0);
  });

  it("works in the Meicoomon to Maycrackmon evolution line", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "BT4-041", as: "meicoomon" }, { card: "BT4-045", as: "maycrackmon" }],
        deck: ["BT9-074"],
        security: ["BT1-001", "BT1-002", "BT1-003"],
      },
      1: { battleArea: [{ card: "BT4-026", as: "target", dp: 6000 }] },
    }, { autoSelectCards: true, autoOrderTriggers: true });
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("meicoomon").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP === 2000);
    const meicoomon = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.cardId === "BT4-041")!;
    const evolutionPermanentId = meicoomon.permanentId;
    expect(s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: meicoomon.permanentId,
      instanceId: s.inst("maycrackmon").instanceId,
    })).toEqual({ ok: true });
    await settle(() =>
      s.state.players[0]!.battleArea.find((permanent) => permanent.permanentId === evolutionPermanentId)?.topCard.cardId === "BT4-045",
    );
    // The card reaches the top before the asynchronous digivolution pipeline has
    // finished its timing windows and trailing continuous recompute.
    await settle();

    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).securityDp(0)).toBe(4000);
  });
});
