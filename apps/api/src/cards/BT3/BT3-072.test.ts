import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT3-072.js";

describe("BT3-072 BryweLudramon", () => {
  it("grants Blocker to its host", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT2-083", as: "host", under: ["BT3-072"] }] },
    });

    await s.engine.recomputeContinuousEffects();

    expect(observe(s.engine).hasKeyword(s.perm("host"), "Blocker")).toBe(true);
  });
});
