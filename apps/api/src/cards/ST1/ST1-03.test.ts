import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./ST1-03.js";

describe("ST1-03 Agumon", () => {
  it("registers the complete inherited DP clause as compiled IR", () => {
    expect(compiled).toMatchObject({
      coverage: "full",
      residual: [],
      effects: [{ trigger: "YourTurn", isInherited: true, actions: [{ kind: "ModifyDP", amount: 1000 }] }],
    });
  });

  it("gives its host +1000 DP during its owner's turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "ST1-07", as: "host", under: ["ST1-03"] }] } });
    await s.ready();
    expect(s.perm("host").currentDP).toBe(5000);

    s.state.turnSeat = 1;
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("host").currentDP).toBe(4000);
  });
});
