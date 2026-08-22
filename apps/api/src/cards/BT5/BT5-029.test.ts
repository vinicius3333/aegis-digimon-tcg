import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import "./BT5-029.js";

describe("BT5-029 WereGarurumon: Sagittarius Mode", () => {
  it("has Jamming with a WereGarurumon source and grants its Garurumon host +1000 DP", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT5-029", as: "sagittarius", under: ["BT1-040"] }, { card: "BT4-114", as: "host", under: ["BT5-029"] }] } });
    await s.engine.recomputeContinuousEffects();

    expect(observe(s.engine).hasKeyword(s.perm("sagittarius"), "Jamming")).toBe(true);
    expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP + 1000);
  });

  it("does not gain Jamming without a WereGarurumon source", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT5-029", as: "sagittarius" }] } });
    await s.engine.recomputeContinuousEffects();
    expect(observe(s.engine).hasKeyword(s.perm("sagittarius"), "Jamming")).toBe(false);
  });
});
