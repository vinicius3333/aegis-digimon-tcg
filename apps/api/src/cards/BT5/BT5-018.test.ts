import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT5-018.js";

describe("BT5-018 Dorbickmon", () => {
  it("trashes a red Digimon and adds its DP for the turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT5-018", as: "dorbickmon" }], hand: ["BT1-009"] } });
    const before = s.perm("dorbickmon").currentDP;
    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("dorbickmon").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.hand.length === 0);
    expect(s.perm("dorbickmon").currentDP).toBe(before + 3000);
    expect(s.state.players[0]!.trash).toHaveLength(1);
  });
});
