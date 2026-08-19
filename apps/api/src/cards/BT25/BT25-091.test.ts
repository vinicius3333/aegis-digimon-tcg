import { describe, expect, it } from "vitest";
import { setupEngine, settle, type EngineSetup } from "../../engine/testkit/harness.js";
import type { Primitives } from "../../engine/effects/EffectContext.js";
import "../index.js";

function primitivesOf(s: EngineSetup): Primitives {
  return (s.engine as unknown as { primitives: Primitives }).primitives;
}

describe("BT25-091 Monica Simmons", () => {
  it("reacts only to a real TS Option use and suspends to restrict an opponent Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT25-091", as: "monica" }],
          trash: [{ card: "BT25-094", as: "tsOption" }],
        },
        1: { battleArea: [{ card: "AD1-001", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const target = s.perm("target");
    const continuous = (s.engine as unknown as {
      continuous: { hasRestriction(id: string, restriction: string): boolean };
    }).continuous;

    await primitivesOf(s).fireOptionUsed(s.inst("tsOption").instanceId, 3);
    await settle(() => continuous.hasRestriction(target.permanentId, "attack"));

    expect(s.perm("monica").isSuspended).toBe(true);
    expect(continuous.hasRestriction(target.permanentId, "attack")).toBe(true);
  });
});
