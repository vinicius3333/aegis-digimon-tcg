import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT4-047.js";

describe("BT4-047 Rasielmon", () => {
  it("recovers 2 cards from the deck when digivolving", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT4-046", as: "base" }], hand: [{ card: "BT4-047", as: "rasiel" }], deck: ["BT1-001", "BT1-002", "BT1-003"] } });
    s.state.memory = 5;
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("rasiel").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.security.length === 2);

    expect(s.state.players[0]!.security).toHaveLength(2);
    expect(s.state.players[0]!.deck).toHaveLength(0);
  });

  it("trashes the top security card at the end of the opponent's turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT4-047" }], security: [{ card: "BT1-001", as: "top" }, "BT1-002"], deck: ["BT1-009"] }, 1: { deck: ["BT1-009"], hand: ["BT1-010"] } });
    s.state.turnSeat = 1;
    const turn = s.engine.runOneTurn();
    const mainPhase = (s.engine as any).mainPhase as { isOpen: boolean };
    await settle(() => mainPhase.isOpen);
    expect(s.engine.applyIntent(1, { type: "endPhase" })).toEqual({ ok: true });
    await turn;

    expect(s.state.players[0]!.trash.some((card) => card.instanceId === s.inst("top").instanceId)).toBe(true);
  });
});
