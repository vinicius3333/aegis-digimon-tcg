import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { compiled } from "./BT26-035.js";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine } from "../../engine/testkit/harness.js";

describe("BT26-035 Morphomon", () => {
  it("models both printed suspend windows", () => {
    expect(compiled.digivolutionRequirement).toEqual([{ level: 2, traits: ["NSp"], cost: 0, isAlternate: true }]);
    expect(compiled.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          trigger: "OnPlay",
          actions: [
            { kind: "Suspend", optional: true, target: { filter: { controller: "any", kind: ["Digimon"] }, count: 1 } },
          ],
        }),
        expect.objectContaining({ trigger: "WhenMoving" }),
      ]),
    );
  });

  it("suspends one Digimon through the public On Play window", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT26-035", as: "morphomon" }] },
        1: { battleArea: [{ card: "BT1-009", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("opponent").topCard.instanceId);

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("morphomon"));

    expect(s.perm("opponent").isSuspended).toBe(true);
  });
});
