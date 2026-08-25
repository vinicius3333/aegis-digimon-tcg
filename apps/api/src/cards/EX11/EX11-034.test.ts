import { digivolutionRequirementsFor, EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine } from "../../engine/testkit/harness.js";
import "../index.js";

const cardId = "EX11-034";

describe("EX11-034 QueenBeemon", () => {
  it("preserves printed stats, Royal Base evolution, and both shared once-per-turn effects", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      nameEn: "QueenBeemon",
      colors: ["Green", "Black"],
      level: 6,
      playCost: 12,
      dp: 12000,
      evoCosts: [
        { color: "Green", level: 5, memoryCost: 4 },
        { color: "Black", level: 5, memoryCost: 4 },
      ],
      types: ["Cyborg", "X Antibody", "Royal Base", "LIBERATOR", "Insectoid"],
    });
    const compiled = runtimeCompiledCard(cardId)!;
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 5, traits: ["Royal Base"], cost: 3, isAlternate: true },
    ]);
    expect(digivolutionRequirementsFor(cardId)).toEqual(compiled.digivolutionRequirement);
    for (const trigger of ["OnPlay", "WhenDigivolving", "WhenAttacking"]) {
      const effects = compiled.effects.filter((effect) => effect.trigger === trigger);
      expect(effects[0]).toMatchObject({
        frequency: "OncePerTurn",
        sharedUseKey: "ir-shared-0",
        actions: [
          {
            kind: "SecurityManipulation",
            op: "addTopOrBottom",
            faceUp: true,
            filter: { nameOrTrait: [{ tokens: ["Royal Base"], match: "trait" }] },
          },
          { kind: "DeleteBudget", budget: 8 },
        ],
      });
    }
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "WhenDigivolving",
        sharedUseKey: "ir-shared-1",
        actions: [
          expect.objectContaining({ kind: "PlayFromZone", costReductionScaling: expect.objectContaining({ per: 1 }) }),
        ],
      }),
    );
  });

  it("places Royal Base face up and uses it to raise the deletion budget to 10", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: cardId, as: "source" }],
          hand: [{ card: "EX11-025", as: "royalBase" }],
        },
        1: { battleArea: [{ card: "BT1-080", as: "cost10" }] },
      },
      {
        autoAcceptOptional: true,
        autoSelectCards: true,
        autoChooseOption: true,
        preferOptionIndex: 0,
      },
    );
    const victimId = s.perm("cost10").permanentId;
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));
    expect(s.state.players[0]!.security[0]).toMatchObject({ cardId: "EX11-025", faceUp: true });
    expect(s.state.players[1]!.battleArea.some(({ permanentId }) => permanentId === victimId)).toBe(false);
    assertNoLoudGap(s);
  });
});
