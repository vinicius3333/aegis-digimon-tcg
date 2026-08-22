import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT26-044.js";
import "../index.js";

describe("BT26-044 Lilamon", () => {
  it("encodes the optional suspend, independent lock, reactive reduced-cost evolution, and leave replacement", () => {
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "OnPlay", actions: [{ kind: "Suspend", optional: true }, { kind: "Restrict", restriction: "unsuspend" }] });
    expect(compiled.effects?.[1]).toMatchObject({ trigger: "WhenDigivolving" });
    expect(compiled.effects?.[2]).toMatchObject({ trigger: "YourTurn", frequency: "OncePerTurn", actions: [
      { kind: "SubTrigger", event: "whenSuspended", actions: [{ kind: "Digivolve", from: ["hand"], reduceCost: 1 }] },
      { kind: "SubTrigger", event: "whenDigivolutionTrashed" },
    ] });
    expect(compiled.effects?.[3]).toMatchObject({ trigger: "AllTurns", isInherited: true, actions: [{ kind: "Replacement", event: "wouldLeavePlay" }] });
  });

  it("resolves the public On Play suspend and unsuspend lock", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "BT26-044", as: "lilamon" }] },
      1: { battleArea: [{ card: "BT1-085", as: "target" }] },
    }, { autoSelectCards: true, autoAcceptOptional: true });
    s.state.memory = 7;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("lilamon").instanceId })).toEqual({ ok: true });
    await settle(() => observe(s.engine).isRestricted(s.perm("target"), "unsuspend"));
    expect(s.perm("target").isSuspended).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("target"), "unsuspend")).toBe(true);
  });
});
