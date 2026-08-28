import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "./P-122.js";

describe("P-122 Patamon", () => {
  it("adds a yellow/black security card, recovers one, and keeps the stack size", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [{ card: "P-122", as: "patamon" }],
          security: [
            { card: "BT11-036", as: "match" },
            { card: "BT1-001", as: "other" },
          ],
          deck: [{ card: "BT1-002", as: "recovery" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("patamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(
      () =>
        s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("match").instanceId) &&
        s.state.players[0]!.security.length === 2,
    );
    expect(s.state.players[0]!.hand.some((card) => card.instanceId === s.inst("match").instanceId)).toBe(true);
    expect(s.state.players[0]!.security).toHaveLength(2);
    expect(s.state.players[0]!.security.some((card) => card.instanceId === s.inst("recovery").instanceId)).toBe(true);
    assertNoLoudGap(s);
  });

  it("does not recover when no eligible security card exists", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "P-122", as: "patamon" }], security: ["BT1-001"], deck: [{ card: "BT1-002", as: "top" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("patamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.security.length === 1 && s.state.pendingDecision === undefined);
    expect(s.state.players[0]!.security).toHaveLength(1);
    expect(s.state.players[0]!.deck.some((card) => card.instanceId === s.inst("top").instanceId)).toBe(true);
    assertNoLoudGap(s);
  });
});
