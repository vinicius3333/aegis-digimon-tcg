import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT2-005.js";
import "./BT2-065.js";

describe("BT2-005 Kapurimon", () => {
  it("gives +1000 DP during its turn while its host has Reboot", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT2-065", as: "host", under: ["BT2-005"] }] } });
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP + 1000);
  });

  it("does not give +1000 DP when its host lacks Reboot", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT2-062", as: "host", under: ["BT2-005"] }] } });
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP);
  });

  it("does not give +1000 DP during the opponent's turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT2-065", as: "host", under: ["BT2-005"] }] } });
    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP);
  });
});
