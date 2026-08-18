import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT11-067.js";

describe("BT11-067 Gigadramon", () => {
  it("has Jamming and grants inherited Reboot", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT11-067", as: "gigadramon" },
          { card: "BT11-068", as: "host", under: ["BT11-067"] },
        ],
      },
    });
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).hasKeyword(s.perm("gigadramon"), "Jamming")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Reboot")).toBe(true);
  });
});
