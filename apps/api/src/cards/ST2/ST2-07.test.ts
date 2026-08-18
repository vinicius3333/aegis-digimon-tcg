import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./ST2-07.js";

describe("ST2-07 Grizzlymon", () => {
  it("has Blocker and loses 2 memory when attacking", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "ST2-07", as: "grizzlymon" }] }, 1: { security: ["BT1-001"] } });
    s.state.memory = 1;
    await s.ready();
    expect(observe(s.engine).hasKeyword(s.perm("grizzlymon"), "Blocker")).toBe(true);
    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("grizzlymon").permanentId, target: { kind: "player" } })).toEqual({ ok: true });
    await settle(() => s.state.memory === -1 && s.state.players[1]!.security.length === 0);
    expect(s.state.memory).toBe(-1);
    expect(s.state.players[1]!.security).toHaveLength(0);
  });
});
