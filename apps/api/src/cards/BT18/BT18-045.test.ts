import { describe, expect, it } from "vitest";
import { assertNoLoudGap, setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT18-045.js";

describe("BT18-045 Pomumon", () => {
  it("gives every other own Digimon exactly 1000 DP while it is suspended", async () => {
    const suspended = setupEngine({
      0: {
        battleArea: [
          { card: "BT18-045", as: "pomumon", suspended: true },
          { card: "BT1-030", as: "other" },
        ],
      },
      1: { battleArea: [{ card: "BT1-030", as: "opponent" }] },
    });
    await suspended.engine.recomputeContinuousEffects();
    expect(suspended.perm("other").currentDP).toBe(4000);
    expect(suspended.perm("pomumon").currentDP).toBe(2000);
    expect(suspended.perm("opponent").currentDP).toBe(3000);
    assertNoLoudGap(suspended);

    const active = setupEngine({
      0: {
        battleArea: [
          { card: "BT18-045", as: "pomumon" },
          { card: "BT1-030", as: "other" },
        ],
      },
    });
    await active.engine.recomputeContinuousEffects();
    expect(active.perm("other").currentDP).toBe(3000);
    assertNoLoudGap(active);
  });

  it("updates immediately when Pomumon suspends and unsuspends", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT18-045", as: "pomumon" },
          { card: "BT1-030", as: "other" },
        ],
      },
    });
    await s.ready();

    s.perm("pomumon").isSuspended = true;
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("other").currentDP).toBe(4000);

    s.perm("pomumon").isSuspended = false;
    await s.engine.recomputeContinuousEffects();
    expect(s.perm("other").currentDP).toBe(3000);
    assertNoLoudGap(s);
  });

  it("stacks independent auras from two suspended Pomumon", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT18-045", as: "first", suspended: true },
          { card: "BT18-045", as: "second", suspended: true },
          { card: "BT1-030", as: "other" },
        ],
      },
    });
    await s.ready();

    expect(s.perm("first").currentDP).toBe(3000);
    expect(s.perm("second").currentDP).toBe(3000);
    expect(s.perm("other").currentDP).toBe(5000);
    assertNoLoudGap(s);
  });

  it("digivolves from a green level 2 for 0 and preserves the source", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT18-004", as: "base" }],
        hand: [{ card: "BT18-045", as: "pomumon" }],
        deck: ["BT1-009"],
      },
    });
    s.state.memory = 3;

    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("base").permanentId,
        instanceId: s.inst("pomumon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard?.instanceId === s.inst("pomumon").instanceId);

    expect(s.state.memory).toBe(3);
    expect(s.perm("base").stack.map(({ cardId }) => cardId)).toEqual(["BT18-004"]);
    assertNoLoudGap(s);
  });
});
