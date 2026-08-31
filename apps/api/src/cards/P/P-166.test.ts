import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "./P-166.js";

describe("P-166 Galemon", () => {
  it("encodes optional suspension, conditional Bird/Avian digivolution, and suspended-Digimon cost scaling", () => {
    const compiled = runtimeCompiledCard("P-166")!;
    for (const trigger of ["OnPlay", "WhenDigivolving"] as const) {
      const effect = compiled.effects.find((entry) => entry.trigger === trigger)!;
      expect(effect.actions[0]).toMatchObject({
        kind: "Suspend",
        optional: true,
        target: { filter: { controllerDefault: "any", kind: ["Digimon"] }, count: 1 },
      });
      expect(effect.actions[1]).toMatchObject({
        kind: "Digivolve",
        optional: true,
        from: ["hand"],
        condition: { kind: "isYourTurn" },
        into: { kind: ["Digimon"], nameOrTrait: [{ tokens: ["Bird", "Avian"], match: "trait" }] },
      });
      expect(effect.actions[2]).toMatchObject({
        kind: "Replacement",
        event: "wouldDigivolve",
        mode: "reduceCost",
        amount: 1,
        scaling: {
          per: 1,
          unit: "cards",
          filter: { controllerDefault: "mine", excludeSelf: true, suspended: true, kind: ["Digimon"] },
        },
      });
    }
  });

  it("encodes inherited Your Turn +2000 DP", () => {
    expect(runtimeCompiledCard("P-166")!.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          trigger: "YourTurn",
          isInherited: true,
          actions: [expect.objectContaining({ kind: "ModifyDP", amount: 2000, duration: "permanent" })],
        }),
      ]),
    );
  });

  it("suspends one Digimon on play when the optional first clause is accepted", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "P-166", as: "galemon" }] },
        1: { battleArea: [{ card: "BT1-009", as: "target" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true, preferInstanceIds: preferred },
    );
    preferred.push(s.perm("target").topCard!.instanceId);
    await s.ready();
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("galemon"));
    await settle();
    expect(s.perm("target").isSuspended).toBe(true);
  });
});
