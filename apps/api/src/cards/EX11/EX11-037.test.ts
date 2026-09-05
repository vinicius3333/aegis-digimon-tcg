import { digivolutionRequirementsFor, EffectTiming, getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { assertNoLoudGap, setupEngine } from "../../engine/testkit/harness.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";

const cardId = "EX11-037";

describe("EX11-037 Espimon", () => {
  it("preserves printed stats, Kapurimon evolution, failed-flip fallback, and inherited Jamming", () => {
    expect(getCardDefinition(cardId)).toMatchObject({
      nameEn: "Espimon",
      colors: ["Black", "Blue"],
      level: 3,
      playCost: 3,
      dp: 1000,
      evoCosts: [
        { color: "Black", level: 2, memoryCost: 1 },
        { color: "Blue", level: 2, memoryCost: 1 },
      ],
      types: ["Cyborg", "LIBERATOR"],
    });
    const compiled = runtimeCompiledCard(cardId)!;
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.digivolutionRequirement).toEqual([{ namesExact: ["Kapurimon"], cost: 0, isAlternate: true }]);
    expect(digivolutionRequirementsFor(cardId)).toEqual(compiled.digivolutionRequirement);
    for (const trigger of ["WhenMoving", "OnPlay"]) {
      const effect = compiled.effects.find((candidate) => candidate.trigger === trigger)!;
      expect(effect.actions[0]).toMatchObject({
        kind: "SecurityManipulation",
        op: "flipFaceUp",
        controller: "opponent",
      });
      expect(effect.actions[1]).toMatchObject({
        kind: "ConditionalBranch",
        condition: { kind: "ifThisEffectDidNotAct" },
        ifTrue: [
          { kind: "Draw", controller: "mine", amount: 1 },
          { kind: "GainMemory", amount: 1 },
        ],
      });
    }
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "Static",
        isInherited: true,
        keywords: [expect.objectContaining({ keyword: "Jamming" })],
      }),
    );
  });

  it("flips the opponent's top face-down security without granting the fallback", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: cardId, as: "source" }], deck: ["BT1-001"] },
      1: { security: [{ card: "BT1-009", faceUp: false }] },
    });
    s.state.memory = 0;
    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));
    expect(s.state.players[1]!.security[0]).toMatchObject({ faceUp: true });
    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.memory).toBe(0);
    assertNoLoudGap(s);
  });

  it("draws 1 and gains 1 memory when no face-down security can be flipped", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: cardId, as: "source" }], deck: [{ card: "BT1-001", as: "drawn" }] },
      1: { security: [{ card: "BT1-009", faceUp: true }] },
    });
    s.state.memory = 0;
    await advance(s.engine).fire(EffectTiming.WhenMoving, s.perm("source"));
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("drawn").instanceId]);
    expect(s.state.memory).toBe(1);
    expect(s.state.players[1]!.security[0]).toMatchObject({ faceUp: true });
    assertNoLoudGap(s);
  });
});
