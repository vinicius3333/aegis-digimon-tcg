import { digivolutionRequirementsFor, dnaDigivolutionRequirementsFor, EffectTiming } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import "../index.js";

const cardId = "EX12-032";

describe("EX12-032 WereGarurumon", () => {
  it("matches the catalog's evolution, DNA, restriction, attack, and Decode clauses", () => {
    const compiled = registeredCompiledCards.get(cardId)!;
    const dna = [
      {
        cost: 0,
        materials: [
          { color: "Blue", level: 5 },
          { color: "Purple", level: 5 },
        ],
      },
      {
        cost: 0,
        materials: [
          { color: "Blue", level: 5 },
          { color: "Red", level: 5 },
        ],
      },
      {
        cost: 0,
        materials: [
          { color: "Yellow", level: 5 },
          { color: "Purple", level: 5 },
        ],
      },
      {
        cost: 0,
        materials: [
          { color: "Yellow", level: 5 },
          { color: "Red", level: 5 },
        ],
      },
    ];
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 4, names: ["Garurumon"], cost: 3, isAlternate: true },
      { level: 4, traits: ["NSo", "VB"], cost: 3, isAlternate: true },
    ]);
    expect(digivolutionRequirementsFor(cardId)).toEqual(compiled.digivolutionRequirement);
    expect(compiled.dnaDigivolveRequirement).toEqual(dna);
    expect(dnaDigivolutionRequirementsFor(cardId)).toEqual(dna);
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(compiled.effects.find((effect) => effect.trigger === trigger)).toMatchObject({
        actions: [
          {
            kind: "Restrict",
            restriction: "suspend",
            duration: "untilOpponentTurnEnd",
            target: { count: 1, filter: { controller: "opponent", kind: ["Digimon", "Tamer"] } },
          },
        ],
      });
    }
    expect(compiled.effects.find((effect) => effect.trigger === "WhenAttacking" && !effect.isInherited)).toMatchObject({
      actions: [
        {
          kind: "Digivolve",
          from: ["trash"],
          payCost: true,
          reduceCost: 2,
          optional: true,
          condition: { kind: "stackHasSameLevelCards", count: 2 },
          into: {
            kind: ["Digimon"],
            nameOrTrait: [
              { tokens: ["Garurumon"], match: "name" },
              { tokens: ["NSo", "VB"], match: "trait" },
            ],
          },
        },
      ],
    });
    expect(compiled.effects.find((effect) => effect.isInherited)).toMatchObject({
      keywords: [{ keyword: "Decode" }],
    });
  });

  it("restricts one opposing Digimon from suspending until the opponent's turn ends", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: cardId, as: "source" }] },
        1: { battleArea: [{ card: "BT1-011", as: "opponent" }] },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("source"));
    await settle(() => observe(s.engine).isRestricted(s.perm("opponent"), "suspend"));
    expect(observe(s.engine).isRestricted(s.perm("opponent"), "suspend")).toBe(true);
  });

  it("digivolves from the trash only when its stack has two same-level cards", async () => {
    const valid = setupEngine(
      {
        0: {
          battleArea: [{ card: cardId, as: "host", under: ["BT1-040"] }],
          trash: [{ card: "BT1-044", as: "target" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    valid.state.memory = 2;
    await valid.ready();
    await advance(valid.engine).fire(EffectTiming.OnUseAttack, valid.perm("host"));
    await settle(() => valid.perm("host").topCard.cardId === "BT1-044");
    expect(valid.perm("host").topCard.cardId).toBe("BT1-044");
    expect(valid.state.memory).toBe(1);
    expect(valid.state.players[0]!.trash.some((card) => card.cardId === "BT1-044")).toBe(false);

    const invalid = setupEngine(
      {
        0: {
          battleArea: [{ card: cardId, as: "host", under: ["BT1-009"] }],
          trash: [{ card: "BT1-044", as: "target" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    invalid.state.memory = 2;
    await invalid.ready();
    await advance(invalid.engine).fire(EffectTiming.OnUseAttack, invalid.perm("host"));
    await settle();
    expect(invalid.perm("host").topCard.cardId).toBe(cardId);
    expect(invalid.state.players[0]!.trash.some((card) => card.cardId === "BT1-044")).toBe(true);
  });
});
