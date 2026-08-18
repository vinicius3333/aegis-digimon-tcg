import { describe, expect, it } from "vitest";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT5-058.js";

describe("BT5-058 Argomon", () => {
  it("may suspend one of its Digimon to reduce the digivolution cost by 2", async () => {
    const preferred: string[] = [];
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT5-052", as: "base" },
          { card: "BT5-047", as: "cost" },
        ],
        hand: [{ card: "BT5-058", as: "evolving" }],
      },
    }, { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true, preferInstanceIds: preferred });
    preferred.push(s.perm("cost").permanentId, s.perm("cost").topCard.instanceId);
    s.state.memory = 4;
    await s.ready();

    expect(s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("base").permanentId,
      instanceId: s.inst("evolving").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.state.memory === 2);

    expect(s.perm("cost").isSuspended).toBe(true);
    expect(s.state.memory).toBe(2);
  });

  it("pays the full cost when Digisorption is declined", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          { card: "BT5-052", as: "base" },
          { card: "BT5-047", as: "cost" },
        ],
        hand: [{ card: "BT5-058", as: "evolving" }],
      },
    }, { autoDeclineOptional: true, autoOrderTriggers: true });
    s.state.memory = 4;
    await s.ready();

    expect(s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("base").permanentId,
      instanceId: s.inst("evolving").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.state.memory === 0);

    expect(s.perm("cost").isSuspended).toBe(false);
    expect(s.state.memory).toBe(0);
  });

  it("suspends all opposing Tamers when digivolving", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "AD1-011", as: "base" }], hand: [{ card: "BT5-058", as: "evolving" }] },
      1: { battleArea: [{ card: "BT1-085", as: "a" }, { card: "BT1-086", as: "b" }] },
    }, { autoSelectCards: true, autoAcceptOptional: true });
    s.state.memory = 10;

    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("evolving").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("a").isSuspended && s.perm("b").isSuspended);

    expect(s.perm("a").isSuspended).toBe(true);
    expect(s.perm("b").isSuspended).toBe(true);
  });

  it("prevents all opposing Tamers from unsuspending while it is in play", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT5-058", as: "argomon" }] },
      1: { battleArea: [{ card: "BT1-085", as: "a", suspended: true }, { card: "BT1-086", as: "b", suspended: true }] },
    });

    await s.engine.recomputeContinuousEffects();

    expect(observe(s.engine).isRestricted(s.perm("a"), "unsuspend")).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("b"), "unsuspend")).toBe(true);
    expect(s.perm("a").isSuspended).toBe(true);
    expect(s.perm("b").isSuspended).toBe(true);
  });
});
