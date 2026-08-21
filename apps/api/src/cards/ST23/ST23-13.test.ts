import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./ST23-13.js";

describe("ST23-13 Tomoro Tenma & Kyo Sawashiro", () => {
  it("places the exact deck-top card face down under itself and gains memory when the opponent has a Digimon", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "ST23-13", as: "tamer" }], deck: ["BT1-001", "BT1-002"] },
      1: { battleArea: [{ card: "BT1-009", as: "opponent" }], deck: ["BT1-002"] },
    }, { autoAcceptOptional: true });
    const deckTopId = s.state.players[0]!.deck[0]!.instanceId;
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("tamer").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.instanceId === s.inst("tamer").instanceId && perm.stack.some((card) => card.instanceId === deckTopId)) && s.state.memory === 7);
    const playedTamer = s.state.players[0]!.battleArea.find((perm) => perm.topCard?.instanceId === s.inst("tamer").instanceId)!;
    expect(playedTamer.stack).toHaveLength(1);
    expect(playedTamer.stack[0]!.instanceId).toBe(deckTopId);
    expect(playedTamer.stack[0]!.faceUp).toBe(false);
    expect(s.state.memory).toBe(7);
  });
});
