import { describe, expect, it } from "vitest";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT3-085.js";

describe("BT3-085 SkullMeramon", () => {
  it("has no card effects", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT3-085", as: "skullMeramon", under: ["BT3-084"] }] } });
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("skullMeramon").currentDP).toBe(s.perm("skullMeramon").baseDP);
  });
});
