import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT16-002.js";
import "../index.js";

describe("BT16-002", () => {
  it("gains +1000 DP on all turns while it has two colors", () =>
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "AllTurns",
      isInherited: true,
      actions: [
        { kind: "Aura", effect: { kind: "modifyDP", amount: 1000 }, while: { kind: "selfColorCount", value: 2 } },
      ],
    }));

  it("applies +1000 DP to a multicolor host", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT16-007", as: "host", under: ["BT16-002"] }] } });
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("host").currentDP).toBe(3000);
  });

  it("does not apply the bonus to a one-color host", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT1-010", as: "host", under: ["BT16-002"] }] } });
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("host").currentDP).toBe(2000);
  });
});
