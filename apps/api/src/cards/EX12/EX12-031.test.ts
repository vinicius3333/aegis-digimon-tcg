import { assemblyRequirementFor } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { registeredCompiledCards } from "../../engine/effects/interpreter/compiledCards.js";
import "../index.js";

const cardId = "EX12-031";

describe("EX12-031 MarineBullmon", () => {
  it("matches the catalog's Decode, Rule trait, evolution, Assembly, and placement clauses", () => {
    const compiled = registeredCompiledCards.get(cardId)!;
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.digivolutionRequirement).toEqual([
      { level: 4, traits: ["Aquatic", "Shambala"], cost: 3, isAlternate: true },
    ]);
    expect(assemblyRequirementFor(cardId)).toEqual([
      {
        materials: [
          {
            count: 1,
            nameOrTrait: [
              { tokens: ["Aqua", "Sea Animal"], match: "trait" },
              { tokens: ["TB"], match: "trait" },
            ],
            levelMax: 4,
          },
        ],
        reduceCost: 2,
      },
    ]);
    expect(compiled.assemblyRequirement).toEqual(assemblyRequirementFor(cardId));
    expect(compiled.effects.find((entry) => entry.trigger === "Rule")).toMatchObject({
      actions: [{ kind: "GrantStatic", grant: "trait", tokens: ["Aquatic"] }],
    });
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(compiled.effects.find((entry) => entry.trigger === trigger)).toMatchObject({
        actions: [
          {
            kind: "Return",
            to: "hand",
            target: { count: 1, filter: { controller: "opponent", kind: ["Digimon"], digivolutionCardsAtMost: 1 } },
            cost: {
              kind: "place",
              destination: "digivolutionStack",
              position: "bottom",
              host: "self",
              target: {
                filter: {
                  controller: "mine",
                  levelComparison: { op: "lte", value: 6 },
                  nameOrTrait: [
                    { tokens: ["Aqua", "Sea Animal"], match: "trait" },
                    { tokens: ["TB"], match: "trait" },
                  ],
                },
                count: 1,
                from: ["hand"],
              },
            },
          },
        ],
      });
    }
  });

  it("assembles with a level-4-or-lower TB card, places the required bottom source, and returns an eligible Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          hand: [
            { card: cardId, as: "source" },
            { card: "EX12-026", as: "effectMaterial" },
          ],
          trash: [{ card: "EX12-011", as: "assemblyMaterial" }],
        },
        1: { battleArea: [{ card: "BT1-011", as: "opponent" }] },
      },
      { autoSelectCards: true },
    );
    s.state.memory = 5;

    expect(
      s.engine.applyIntent(0, {
        type: "playCard",
        instanceId: s.inst("source").instanceId,
        assembly: { materialInstanceIds: [s.inst("assemblyMaterial").instanceId] },
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[1]!.battleArea.length === 0);
    await s.ready();

    const played = s.state.players[0]!.battleArea.find((permanent) => permanent.topCard.cardId === cardId)!;
    expect(s.state.memory).toBe(0);
    expect(played.stack.map((card) => card.cardId)).toEqual(expect.arrayContaining(["EX12-011", "EX12-026"]));
    expect(s.state.players[1]!.battleArea).toHaveLength(0);
  });

  it("grants its printed Rule trait Aquatic", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: cardId, as: "source" }] } });
    await s.ready();
    expect(observe(s.engine).hasEffectiveTrait(s.perm("source"), "Aquatic")).toBe(true);
  });
});
