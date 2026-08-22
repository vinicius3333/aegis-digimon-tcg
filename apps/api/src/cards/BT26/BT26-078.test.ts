import { describe, expect, it } from "vitest";
import { compiled } from "./BT26-078.js";

describe("BT26-078 compiled behavior", () => {
  it("proves the TS evolution and delete-to-play effects with the Q7105 text/trait union", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.digivolutionRequirement).toEqual([{ level: 5, traits: ["TS"], cost: 5, isAlternate: true }]);
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(compiled.effects.find((effect) => effect.trigger === trigger)).toMatchObject({
        actions: [{ kind: "PlayWithoutCost", from: ["trash"], payCost: false, optional: true, target: { filter: { playCostLte: 12, nameOrTrait: [
          { tokens: ["Chronomon"], match: "text" },
          { tokens: ["Titan"], match: "trait" },
        ] }, count: 1 }, cost: { kind: "delete", target: { isSelf: true } } }],
      });
    }
  });

  it("restricts the Trash watcher to your turn, opponent memory 5+, and a played matching Digimon", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "Trash")!;
    expect(effect).toMatchObject({ isFromTrash: true, actions: [{ kind: "SubTrigger", event: "whenPlayed", sourceFilter: { controller: "mine", kind: ["Digimon"], nameOrTrait: [
      { tokens: ["Chronomon"], match: "text" },
      { tokens: ["Titan"], match: "trait" },
    ] }, fireCondition: { kind: "allOf", conditions: [{ kind: "isYourTurn" }, { kind: "memoryAtLeast", value: 5, controller: "opponent" }] } }] });
    expect(effect.actions[0].actions).toEqual([
      expect.objectContaining({ kind: "Return", to: "deckBottom", target: { isSelf: true }, optional: true }),
      expect.objectContaining({ kind: "GainKeyword", target: { sourceRef: "triggerSubject" }, keyword: { keyword: "Rush" }, duration: "untilEachTurnEnd" }),
      expect.objectContaining({ kind: "GainKeyword", target: { sourceRef: "triggerSubject" }, keyword: { keyword: "Execute" }, duration: "untilEachTurnEnd" }),
    ]);
  });
});
