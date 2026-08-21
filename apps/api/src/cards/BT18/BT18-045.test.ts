import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT18-045.js";

describe("BT18-045 Pomumon", () => {
  it("gives every other own Digimon exactly 1000 DP while it is suspended", async () => {
    const suspended = setupEngine({
      0: { battleArea: [{ card: "BT18-045", as: "pomumon", suspended: true }, { card: "BT1-030", as: "other" }] },
    });
    await suspended.engine.recomputeContinuousEffects();
    expect(suspended.perm("other").currentDP).toBe(4000);
    expect(suspended.perm("pomumon").currentDP).toBe(2000);

    const active = setupEngine({
      0: { battleArea: [{ card: "BT18-045", as: "pomumon" }, { card: "BT1-030", as: "other" }] },
    });
    await active.engine.recomputeContinuousEffects();
    expect(active.perm("other").currentDP).toBe(3000);
  });
});
