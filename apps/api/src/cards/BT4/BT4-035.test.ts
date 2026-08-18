import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT4-035.js";

describe("BT4-035 MirageGaogamon", () => {
  it("gains 1 memory per four cards in the opponent's hand", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "AD1-011", as: "base" }], hand: [{ card: "BT4-035", as: "evolving" }] }, 1: { hand: Array(8).fill("BT1-010") } });
    s.state.memory = 4;
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("evolving").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.memory === 2);
    expect(s.state.memory).toBe(2);
  });

  it("is unblockable during its controller's turn", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT4-035", as: "mirage" }] } });
    await s.ready();
    expect(observe(s.engine).isRestricted(s.perm("mirage"), "cantBeBlocked")).toBe(true);
  });
});
