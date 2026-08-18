import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./ST6-01.js";

describe("ST6-01 Pagumon", () => {
  it("trashes the top 2 cards when its host is deleted", async () => {
    const s = setupEngine({ 0: { deck: ["ST6-03", "ST6-04"], battleArea: [{ card: "ST6-03", as: "host", under: ["ST6-01"], suspended: true }] }, 1: { battleArea: [{ card: "ST6-13", as: "attacker" }] } });
    s.state.turnSeat = 1;
    expect(s.engine.applyIntent(1, { type: "attack", attackerPermanentId: s.perm("attacker").permanentId, target: { kind: "permanent", permanentId: s.perm("host").permanentId } })).toEqual({ ok: true });
    await settle(() => !observe(s.engine).isAttacking());
    expect(s.state.players[0]!.deck).toHaveLength(0);
    expect(s.state.players[0]!.trash).toHaveLength(4);
    expect(s.state.gameOver).toBe(false);
  });
});
