import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT9-026.js";

describe("BT9-026 Piranimon", () => {
  it("can attack on the turn it was played because it has Rush", async () => {
    const s = setupEngine({ 0: { hand: [{ card: "BT9-026", as: "piranimon" }] }, 1: { security: ["BT1-001"] } });
    s.state.memory = 12;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("piranimon").instanceId })).toEqual({ ok: true });
    const played = s.state.players[0]!.battleArea[0]!;
    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: played.permanentId, target: { kind: "player" } })).toEqual({ ok: true });
  });
});
