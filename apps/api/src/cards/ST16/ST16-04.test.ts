import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./ST16-04.js";
describe("ST16-04 Tapirmon", () => {
  it("retaliation deletes the battling opponent", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "ST16-04", as: "a", dp: 1000 }] }, 1: { battleArea: [{ card: "BT1-009", as: "b", dp: 2000, suspended: true }] } });
    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("a").permanentId, target: { kind: "permanent", permanentId: s.perm("b").permanentId } })).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.trash.length > 0, 1500);
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });
});
