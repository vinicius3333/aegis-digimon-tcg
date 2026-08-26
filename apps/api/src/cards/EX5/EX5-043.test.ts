import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { getEffectModule } from "../../engine/effects/registry.js";
import { compiled } from "./EX5-043.js";
import "./EX5-043.js";

describe("EX5-043 Leopardmon (X Antibody)", () => {
  it("registers once-per-turn When Digivolving and Main play effects plus the play-triggered bounce effect", () => {
    const source = {
      instanceId: "source",
      cardId: "EX5-043",
      ownerSeat: 0,
      definition: {},
      permanent: () => undefined,
      isOnBattleArea: () => true,
      isOwnersTurn: () => true,
      hasColor: () => true,
    } as never;
    const module = getEffectModule("EX5-043")!;
    expect(module.effectsForTiming(EffectTiming.WhenDigivolving, source)[0]?.maxPerTurn).toBe(1);
    expect(module.effectsForTiming(EffectTiming.OnDeclaration, source)[0]?.maxPerTurn).toBe(1);
    const watcher = compiled.effects.find((effect) => effect.trigger === "YourTurn");
    expect(watcher?.actions[0]).toMatchObject({ kind: "SubTrigger", event: "whenPlayed" });
    for (const trigger of ["Main", "WhenDigivolving"] as const) {
      expect(compiled.effects.find((effect) => effect.trigger === trigger)?.actions).toContainEqual(
        expect.objectContaining({
          kind: "PlayWithoutCost",
          reduceCostBy: 4,
          reduceCostByIf: {
            amount: 3,
            condition: expect.objectContaining({
              kind: "selfDigivolutionStackHasTrait",
              filter: {
                nameOrTrait: [
                  { tokens: ["Leopardmon"], match: "name" },
                  { tokens: ["X Antibody"], match: "trait" },
                ],
              },
            }),
          },
        }),
      );
    }
    expect((watcher?.actions[0] as { actions?: unknown[] }).actions).toContainEqual(
      expect.objectContaining({ kind: "Return", dpCeilingScaling: { amount: 3000 } }),
    );
  });
});
