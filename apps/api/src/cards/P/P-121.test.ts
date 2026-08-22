import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "./P-121.js";

describe("P-121 Armadillomon", () => {
  it("adds a black/yellow multicolor card and Cody Hida, then bottoms the rest", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "P-121", as: "armadillomon" }],
        deck: [{ card: "BT11-036", as: "multicolor" }, { card: "P-128", as: "cody" }, { card: "BT1-001", as: "filler" }],
      },
    }, { autoSelectCards: true, autoOrderCards: true });
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("armadillomon").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("multicolor").instanceId) && s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("cody").instanceId));
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("multicolor").instanceId)).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("cody").instanceId)).toBe(true);
    expect(s.state.players[0]!.deck.at(-1)?.instanceId).toBe(s.inst("filler").instanceId);
    assertNoLoudGap(s);
  });
});
