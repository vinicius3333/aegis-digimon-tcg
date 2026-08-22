import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT16-038.js";
import "../index.js";

describe("BT16-038", () => {
  it("reduces the cost of its own Gargomon or Rapidmon digivolution", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "YourTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldDigivolve",
          actions: [{ kind: "Replacement", event: "wouldDigivolve", mode: "reduceCost", amount: 1 }],
        },
      ],
    });
  });

  it("grants inherited Piercing to Gargomon or Rapidmon", () => {
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "YourTurn",
      isInherited: true,
      actions: [{ kind: "Aura", effect: { kind: "keyword", keyword: { keyword: "Piercing" } } }],
    });
  });

  it("grants Piercing to a live Gargomon while retaining the inherited source", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT17-046", as: "gargomon", under: ["BT16-038"] }] } });
    await s.engine.recomputeContinuousEffects();

    expect(observe(s.engine).hasPierce(s.perm("gargomon"))).toBe(true);
  });
});
