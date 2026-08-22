import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT26-043.js";
import "../index.js";

describe("BT26-043 Piximon", () => {
  it("encodes mandatory suspend, deck-top face-down payment, scaled locks, and inherited watcher", () => {
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "OnPlay", actions: [
      { kind: "Suspend" }, { kind: "PlaceUnder", from: ["deck"], faceDown: true, position: "bottom" },
      { kind: "Restrict", restriction: "unsuspend", scaling: { unit: "faceDownDigivolutionCards", per: 1 } },
    ] });
    expect(compiled.effects?.[1]).toMatchObject({ trigger: "WhenDigivolving" });
    expect(compiled.effects?.[2]).toMatchObject({ trigger: "AllTurns", isInherited: true, frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "whenPlayed" }] });
  });

  it("plays through the public engine seam and applies the printed lock", async () => {
    const s = setupEngine({
      0: { hand: [{ card: "BT26-043", as: "piximon" }], deck: ["BT1-009"] },
      1: { battleArea: [{ card: "BT1-085", as: "target" }] },
    }, { autoSelectCards: true, autoAcceptOptional: true });
    s.state.memory = 7;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("piximon").instanceId })).toEqual({ ok: true });
    await settle(() => observe(s.engine).isRestricted(s.perm("target"), "unsuspend"));
    expect(s.perm("target").isSuspended).toBe(true);
    expect(observe(s.engine).isRestricted(s.perm("target"), "unsuspend")).toBe(true);
  });
});
