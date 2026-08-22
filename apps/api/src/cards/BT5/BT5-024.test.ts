import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT5-024.js";

describe("BT5-024 Garurumon", () => {
  it("gains 1 memory when digivolving with Gabumon in its sources", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT5-020", as: "base" }], hand: [{ card: "BT5-024", as: "evolving" }] } });
    s.state.memory = 2;

    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("evolving").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.memory === 1);

    expect(s.state.memory).toBe(1);
  });

  it("grants its Garurumon or Omnimon host +1000 DP as an inherited effect", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT5-086", as: "host", under: ["BT5-024"] }] } });

    await s.engine.recomputeContinuousEffects();

    expect(s.perm("host").currentDP).toBe(s.perm("host").baseDP + 1000);
  });

  it("does not gain memory without a Gabumon source", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT5-021", as: "base" }], hand: [{ card: "BT5-024", as: "evolving" }] } });
    s.state.memory = 2;
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("evolving").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.memory === 0);
    expect(s.state.memory).toBe(0);
  });
});
