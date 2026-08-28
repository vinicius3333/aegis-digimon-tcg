import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT2-043.js";

describe("BT2-043 Agumon", () => {
  it("gives its host +1000 DP during its controller's turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT2-045", as: "host", under: ["BT2-043"] }] } });

    await s.engine.recomputeContinuousEffects();

    expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP + 1000);
  });

  it("does not give its host +1000 DP during the opponent's turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT2-045", as: "host", under: ["BT2-043"] }] } });
    s.state.turnSeat = 1;

    await s.engine.recomputeContinuousEffects();

    expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP);
  });

  it("does not apply the inherited effect while Agumon is the top card", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT2-043", as: "agumon" }] } });

    await s.engine.recomputeContinuousEffects();

    expect(s.perm("agumon").currentDP).toBe(s.perm("agumon").baseDP);
  });
});
