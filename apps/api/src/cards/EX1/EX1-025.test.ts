import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./EX1-025.js";

describe("EX1-025 Salamon", () => {
  it("draws 1 on attack with 3 or more security cards", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "EX1-028", as: "host", under: ["EX1-025"] }], deck: ["BT1-009"], security: ["BT1-001", "BT1-001", "BT1-001"] }, 1: { security: ["BT1-001", "BT1-001"] } });
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("host").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.length === 1);
    expect(s.state.players[0]!.hand).toHaveLength(1);
  });
});
