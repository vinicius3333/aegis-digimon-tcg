import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT4-005.js";

describe("BT4-005 Missimon", () => {
  it("gives +1000 DP to its D-Brigade host during its turn", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT4-063", as: "host", under: ["BT4-005"] }] },
    });

    await s.engine.recomputeContinuousEffects();

    expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP + 1000);
  });

  it("does not give DP to a host without the D-Brigade trait", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT3-025", as: "host", under: ["BT4-005"] }] },
    });

    await s.engine.recomputeContinuousEffects();

    expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP);
  });
});
