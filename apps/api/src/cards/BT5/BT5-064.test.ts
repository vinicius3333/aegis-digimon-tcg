import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT5-064.js";
import "./BT5-068.js";

describe("BT5-064 BlackGaogamon", () => {
  it("gives Jamming to its host while it has Reboot", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT5-068", as: "host", under: ["BT5-064"] }] } });
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Reboot")).toBe(true);
    expect(observe(s.engine).hasKeyword(s.perm("host"), "Jamming")).toBe(true);
  });
});
