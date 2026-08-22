import { describe, expect, it } from "vitest";
import { EffectTiming, getCompiledCard } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT8-088.js";

describe("BT8-088 Davis Motomiya & Ken Ichijoji", () => {
  it("suspends to unsuspend a Digimon that digivolves into a multicolor Digimon", async () => {
    const s = setupEngine({ 0: {
      battleArea: [
        { card: "BT8-088", as: "tamer" },
        { card: "BT8-010", as: "base", suspended: true },
        { card: "BT8-010", as: "decoy", suspended: true },
      ],
      hand: [{ card: "BT8-015", as: "evolving" }],
    } }, { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: [] });
    s.state.memory = 5;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "digivolve", permanentId: s.perm("base").permanentId, instanceId: s.inst("evolving").instanceId })).toEqual({ ok: true });
    await settle(() => !s.perm("base").isSuspended);
    expect(s.perm("tamer").isSuspended).toBe(true);
    expect(s.perm("decoy").isSuspended).toBe(true);
  });

  it("gains 2 memory when one Digimon is both blue and green", async () => {
    const s = setupEngine({ 0: {
      battleArea: [{ card: "BT8-088", as: "tamer" }, { card: "BT8-053", as: "multicolor" }],
    } });
    s.state.memory = 0;

    await advance(s.engine).fire(EffectTiming.OnStartMainPhase, s.perm("tamer"));

    expect(s.state.memory).toBe(2);
  });

  it("plays itself from security without paying its memory cost", () => {
    expect(getCompiledCard("BT8-088")?.effects).toContainEqual(expect.objectContaining({
      trigger: "Security",
      isSecurity: true,
      actions: [expect.objectContaining({ kind: "PlayWithoutCost", payCost: false })],
    }));
  });
});
