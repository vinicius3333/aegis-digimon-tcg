import { digivolutionRequirementsFor, EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine } from "../../engine/testkit/harness.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";

const cardId = "EX11-041";

describe("EX11-041 Oblivimon", () => {
  it("preserves printed stats, Cyborg evolution, security effects, and attack-target inheritance", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      nameEn: "Oblivimon",
      colors: ["Black", "Blue"],
      level: 5,
      playCost: 7,
      dp: 7000,
      evoCosts: [
        { color: "Black", level: 4, memoryCost: 4 },
        { color: "Blue", level: 4, memoryCost: 4 },
      ],
      types: ["Cyborg", "LIBERATOR"],
    });
    const compiled = runtimeCompiledCard(cardId)!;
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.digivolutionRequirement).toEqual([{ level: 4, traits: ["Cyborg"], cost: 3, isAlternate: true }]);
    expect(digivolutionRequirementsFor(cardId)).toEqual(compiled.digivolutionRequirement);
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const effect = compiled.effects.find((candidate) => candidate.trigger === trigger)!;
      expect(effect.actions[0]).toMatchObject({
        kind: "SecurityManipulation",
        op: "flipUp",
        controller: "opponent",
        amount: 1,
      });
      expect(effect.actions[1]).toMatchObject({
        kind: "DeDigivolve",
        amount: 1,
        target: { filter: { controller: "opponent", kind: ["Digimon"] } },
      });
      expect(effect.actions[2]).toMatchObject({
        kind: "Digivolve",
        from: ["hand"],
        condition: { kind: "isOpponentsTurn" },
      });
    }
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({ trigger: "EndOfOpponentsTurn", isSecurity: true }),
    );
    expect(compiled.effects.find(({ trigger, isInherited }) => trigger === "YourTurn" && !isInherited)).toMatchObject({
      actions: [
        {
          kind: "SubTrigger",
          event: "whenCheckedFaceUpSecurity",
          sourceFilter: { controllerDefault: "mine" },
          actions: [{ kind: "SecurityManipulation", op: "addBottom", faceUp: true, optional: true }],
        },
      ],
    });
    expect(compiled.effects.find(({ isInherited }) => isInherited)?.actions[0]).toMatchObject({
      kind: "Restrict",
      restriction: "attackTargetChange",
    });
  });

  it("flips the next face-down security, de-digivolves, and free-evolves on the opponent's turn", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: cardId, as: "source" }], hand: [{ card: "EX11-043", as: "invisimon" }] },
        1: {
          security: [
            { card: "BT1-001", faceUp: true },
            { card: "BT1-002", faceUp: false },
          ],
          battleArea: [{ card: "BT1-080", as: "opponent", under: ["BT1-009"] }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.turnSeat = 1;
    const opponent = s.perm("opponent");
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));
    expect(s.state.players[1]!.security[0]).toMatchObject({ faceUp: true });
    expect(s.state.players[1]!.security[1]).toMatchObject({ faceUp: true });
    expect(opponent.stack).toHaveLength(0);
    expect(opponent.topCard.cardId).toBe("BT1-009");
    expect(s.perm("source").topCard.cardId).toBe("EX11-043");
    assertNoLoudGap(s);
  });
});
