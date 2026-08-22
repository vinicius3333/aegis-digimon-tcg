import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./P-161.js";

describe("P-161 Bishop Device", () => {
  it("restricts an opponent Digimon or Tamer after being trashed from the battle area", () => {
    const compiled = runtimeCompiledCard("P-161")!;
    expect(compiled.effects).toEqual(expect.arrayContaining([
      expect.objectContaining({ trigger: "whenTrashedFromBattleArea", actions: [{ kind: "Restrict", restriction: "suspend", duration: "untilOpponentTurnEnd", target: { filter: { controller: "opponent", kind: ["Digimon", "Tamer"] }, count: 1 } }] }),
    ]));
  });

  it("encodes Main placement and Security level-5-or-lower deck bottoming", () => {
    const compiled = runtimeCompiledCard("P-161")!;
    expect(compiled.effects.find((effect) => effect.trigger === "Main")).toMatchObject({
      actions: [
        { kind: "Restrict", restriction: "suspend", duration: "untilOpponentTurnEnd" },
        { kind: "PlaceInBattleAreaSelf" },
      ],
    });
    expect(compiled.effects.find((effect) => effect.trigger === "Security")).toMatchObject({
      isSecurity: true,
      actions: [{ kind: "Return", to: "deckBottom", target: { filter: { controller: "opponent", kind: ["Digimon"], levelComparison: { op: "lte", value: 5 } }, count: 1 } }, { kind: "AddToHandSelf" }],
    });
  });
});
