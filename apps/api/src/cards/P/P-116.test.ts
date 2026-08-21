import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "./P-116.js";

describe("P-116 DIGIMON CON 2023", () => {
  it("reveals two, adds all eligible low-cost Tamers, and returns the rest to the top", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT17-074", as: "white" }],
        hand: [{ card: "P-116", as: "option" }],
        deck: [{ card: "BT10-092", as: "tamer" }, { card: "BT1-001", as: "nonTamer" }],
      },
    }, { autoSelectCards: true, autoOrderCards: true });
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("tamer").instanceId));
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("tamer").instanceId)).toBe(true);
    expect(s.state.players[0]!.deck[0]?.instanceId).toBe(s.inst("nonTamer").instanceId);
    assertNoLoudGap(s);
  });
});
