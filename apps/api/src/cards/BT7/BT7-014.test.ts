import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT7-014.js";

describe("BT7-014 Aldamon", () => {
  it("reduces only its own digivolution cost when the base has a Tamer source", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT7-011", as: "base", under: ["BT7-085"] }],
        hand: [{ card: "BT7-014", as: "aldamon" }],
      },
    });
    s.state.memory = 5;
    await s.ready();

    expect(s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("base").permanentId,
      instanceId: s.inst("aldamon").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("aldamon").instanceId);

    expect(s.state.memory).toBe(4); // Printed 3, reduced by 2.
  });

  it("pays the printed cost when its base has no Tamer source", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT7-011", as: "base", under: ["BT7-008"] }],
        hand: [{ card: "BT7-014", as: "aldamon" }],
      },
    });
    s.state.memory = 5;
    await s.ready();

    expect(s.engine.applyIntent(0, {
      type: "digivolve",
      permanentId: s.perm("base").permanentId,
      instanceId: s.inst("aldamon").instanceId,
    })).toEqual({ ok: true });
    await settle(() => s.perm("base").topCard.instanceId === s.inst("aldamon").instanceId);

    expect(s.state.memory).toBe(2);
  });

  it("gets +4000 DP when it has a Hybrid source", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT7-011", as: "base" }], hand: [{ card: "BT7-014", as: "evolving" }] } });
    s.state.memory = 3;
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("evolving").instanceId })).toEqual({ ok: true });
    await settle(() => s.perm("base").currentDP === 12000);
    expect(s.perm("base").currentDP).toBe(12000);
  });

  it("suppresses Option security effects only when the host has Hybrid or Ten Warriors", async () => {
    const matching = setupEngine({
      0: { battleArea: [{ card: "BT7-030", as: "host", under: ["BT7-014"] }] },
    });
    await matching.engine.recomputeContinuousEffects();
    expect(observe(matching.engine).suppressesSecurityEffect(matching.perm("host"), "BT3-101")).toBe(true);

    const other = setupEngine({
      0: { battleArea: [{ card: "BT1-009", as: "host", under: ["BT7-014"] }] },
    });
    await other.engine.recomputeContinuousEffects();
    expect(observe(other.engine).suppressesSecurityEffect(other.perm("host"), "BT3-101")).toBe(false);
  });
});
