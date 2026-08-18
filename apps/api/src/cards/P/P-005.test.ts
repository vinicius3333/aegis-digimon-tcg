import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./P-005.js";

describe("P-005 Patamon", () => {
  it("recovers the top deck card only at one or fewer security", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "P-005", as: "patamon" }], deck: [{ card: "BT1-009", as: "recovered" }], security: ["BT1-028"] } });
    const p0 = s.state.players[0]!;
    const recovered = s.inst("recovered").instanceId;
    s.state.memory = 4;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("patamon").instanceId })).toEqual({ ok: true });
    await settle(() => p0.security.some((card) => card.instanceId === recovered));
    expect(p0.security.map((card) => card.instanceId)).toEqual(expect.arrayContaining([recovered]));
    expect(p0.deck).toHaveLength(0);
  });

  it("does not recover at two security cards", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "P-005", as: "patamon" }],
        deck: [{ card: "BT1-009", as: "deck-top" }],
        security: ["BT1-028", "BT1-028"],
      },
    });
    s.state.memory = 4;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("patamon").instanceId })).toEqual({ ok: true });
    await settle();

    expect(s.state.players[0]!.security).toHaveLength(2);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([
      s.inst("deck-top").instanceId,
    ]);
  });
});
