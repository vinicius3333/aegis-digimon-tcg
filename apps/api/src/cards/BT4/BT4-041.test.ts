import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT4-041.js";

describe("BT4-041 Meicoomon", () => {
  it("gives -4000 DP when its owner has three or fewer security cards", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT4-041", as: "source" }], security: 3 }, 1: {
      battleArea: [{ card: "BT4-026", as: "target", dp: 6000 }],
    } }, { autoSelectCards: true, autoOrderTriggers: true });
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("source").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("target").currentDP === 2000);
    expect(s.perm("target").currentDP).toBe(2000);
  });

  it("does not reduce DP when its owner has four security cards", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "BT4-041", as: "source" }], security: 4 },
      1: { battleArea: [{ card: "BT4-026", as: "target", dp: 6000 }] },
    }, { autoSelectCards: true, autoOrderTriggers: true });
    s.state.memory = 5;

    expect(s.engine.applyIntent(0, {
      type: "playCard",
      instanceId: s.inst("source").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard.cardId === "BT4-041"));

    expect(s.perm("target").currentDP).toBe(6000);
  });
});
