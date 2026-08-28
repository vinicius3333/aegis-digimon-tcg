import { EffectTiming, requireCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./BT6-103.js";

describe("BT6-103 Blasted Disaster", () => {
  it("suspends all opponent Digimon and gains 1 memory for each suspended opponent Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: ["BT6-045"], hand: [{ card: "BT6-103", as: "option" }] },
        1: {
          battleArea: [
            { card: "BT6-046", as: "first" },
            { card: "BT6-047", as: "second", suspended: true },
          ],
        },
      },
      { autoSelectCards: true },
    );
    const initialMemory = 10;
    const expectedMemory = initialMemory - requireCardDefinition("BT6-103").playCost + 2;
    s.state.memory = initialMemory;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.memory === expectedMemory);

    expect(s.perm("second").isSuspended).toBe(true);
    expect(s.state.memory).toBe(expectedMemory);
  });

  it("suspends 1 opponent Digimon from security", async () => {
    const s = setupEngine(
      {
        0: { security: [{ card: "BT6-103", as: "securityOption", faceUp: true }] },
        1: { battleArea: [{ card: "BT6-046", as: "target" }] },
      },
      { autoSelectCards: true },
    );

    await advance(s.engine).fireForInstance(EffectTiming.SecuritySkill, s.inst("securityOption"));

    expect(s.perm("target").isSuspended).toBe(true);
  });
});
