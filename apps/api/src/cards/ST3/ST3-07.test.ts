import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./ST3-07.js";

describe("ST3-07 Unimon", () => {
  it("has Blocker and loses 2 memory when attacking", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "ST3-07", as: "unimon" }] }, 1: { security: ["ST3-02"] } });
    s.state.memory = 1;
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("unimon"), "Blocker")).toBe(true);
    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("unimon").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => s.state.memory === -1 && s.state.players[1]!.security.length === 0);
    expect(s.state.memory).toBe(-1);
    expect(s.state.players[1]!.security).toHaveLength(0);
  });
});
