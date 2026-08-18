import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT1-033.js";

describe("BT1-033 Dolphmon", () => {
  it("gives its Digimon +1000 DP while the opponent has a Digimon without digivolution cards", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-032", as: "host", dp: 5000, under: ["BT1-033"] }] }, 1: { battleArea: ["BT1-016"] } });
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("host").currentDP).toBe(6000);
  });

  it("loses the bonus immediately when the last qualifying battle-area Digimon leaves and ignores breeding", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT1-032", as: "host", dp: 5000, under: ["BT1-033"] }] },
      1: { battleArea: [{ card: "BT1-016", as: "qualifier" }], breeding: "BT1-017" },
    });
    await s.ready();
    expect(s.perm("host").currentDP).toBe(6000);
    await advance(s.engine).verb.deletePermanent([s.perm("qualifier").permanentId]);
    expect(s.perm("host").currentDP).toBe(5000);
  });
});
