import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "./P-119.js";

describe("P-119 Hawkmon", () => {
  it("adds a red/yellow multicolor card and Yolei Inoue, then bottoms the rest", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "P-119", as: "hawkmon" }],
        deck: [{ card: "BT11-009", as: "multicolor" }, { card: "P-126", as: "yolei" }, { card: "BT1-001", as: "filler" }],
      },
    }, { autoSelectCards: true, autoOrderCards: true });
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("hawkmon").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("multicolor").instanceId) && s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("yolei").instanceId));
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("multicolor").instanceId)).toBe(true);
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("yolei").instanceId)).toBe(true);
    expect(s.state.players[0]!.deck.at(-1)?.instanceId).toBe(s.inst("filler").instanceId);
    assertNoLoudGap(s);
  });
});
