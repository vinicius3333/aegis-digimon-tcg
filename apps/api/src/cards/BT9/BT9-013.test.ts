import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import "./BT9-013.js";

describe("BT9-013 OmniShoutmon (X Antibody)", () => {
  it("gains Blitz when digivolving", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "AD1-001", as: "base" }], hand: [{ card: "BT9-013", as: "evolving" }] } });
    s.state.memory = 0;
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("evolving").instanceId })).toEqual({ ok: true });
    await settle(() => observe(s.engine).hasKeyword(s.perm("base"), "Blitz"));
    expect(observe(s.engine).hasKeyword(s.perm("base"), "Blitz")).toBe(true);
  });

  it("can attack an opponent's unsuspended Digimon with OmniShoutmon in its sources", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT9-013", as: "omni", under: ["BT5-014"] }] }, 1: { battleArea: [{ card: "BT1-028", as: "target" }] } });
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "attack", attackerPermanentId: s.perm("omni").permanentId, target: { kind: "permanent", permanentId: s.perm("target").permanentId } })).toEqual({ ok: true });
  });
});
