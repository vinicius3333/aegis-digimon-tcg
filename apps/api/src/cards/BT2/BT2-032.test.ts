import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT2-032.js";

describe("BT2-032 UlforceVeedramon", () => {
  it("unsuspends when a blue Tamer suspends and gains 1 memory during main", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT2-032", as: "ulforce", suspended: true }, { card: "BT1-086", as: "tamer" }] } });
    s.state.memory = 0;
    await advance(s.engine).verb.suspend([s.perm("tamer").permanentId]);
    expect(s.perm("ulforce").isSuspended).toBe(false);
    expect(s.state.memory).toBe(1);
  });

  it("Q1008 gains no memory when already active or when unsuspended outside main", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT2-032", as: "ulforce" }, { card: "BT1-086", as: "tamer" }] } });
    s.state.memory = 0;
    await advance(s.engine).verb.suspend([s.perm("tamer").permanentId]);
    expect(s.state.memory).toBe(0);

    await advance(s.engine).verb.suspend([s.perm("ulforce").permanentId]);
    s.state.phase = Phase.Active;
    await advance(s.engine).verb.unsuspend([s.perm("ulforce").permanentId]);
    expect(s.state.memory).toBe(0);
  });
});
