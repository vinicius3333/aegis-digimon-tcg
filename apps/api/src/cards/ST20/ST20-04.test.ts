import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./ST20-04.js";

describe("ST20-04 Garudamon", () => {
  it("grants Security Attack +1 and +2000 DP per two Tamer colors on play", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "ST20-07", as: "target" },
            { card: "ST20-12", as: "twoColorTamer" },
            { card: "BT21-102", as: "oneColorTamer" },
          ],
          hand: [{ card: "ST20-04", as: "garudamon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("garudamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack") === 1);
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("target").currentDP).toBe(s.perm("target").baseDP + 2000);
    expect(observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack")).toBe(1);
  });

  it("does not scale DP when no Tamer colors are present, while still granting Security Attack", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "ST20-07", as: "target" }],
          hand: [{ card: "ST20-04", as: "garudamon" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("garudamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => observe(s.engine).keywordAmount(s.perm("target"), "SecurityAttack") === 1);
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("target").currentDP).toBe(s.perm("target").baseDP);
  });
});
