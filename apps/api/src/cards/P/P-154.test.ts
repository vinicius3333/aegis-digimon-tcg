import { describe, expect, it } from "vitest";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "./P-154.js";

describe("P-154 Maildramon", () => {
  it("encodes the opponent-effect leave replacement for other Knightmon-text Digimon", () => {
    const replacement = runtimeCompiledCard("P-154")!.effects[0]!;
    expect(replacement).toMatchObject({
      trigger: "AllTurns",
      actions: [{
        kind: "Replacement",
        event: "wouldLeavePlay",
        sourceFilter: { controller: "mine", excludeSelf: true, kind: ["Digimon"], nameOrTrait: [{ tokens: ["Knightmon"], match: "text" }] },
        causeFilter: { byOpponentEffect: true },
        cost: { kind: "place", target: { filter: { isSelfRef: true }, count: 1, isSelf: true } },
      }],
    });
  });

  it("encodes inherited Blocker", () => {
    expect(runtimeCompiledCard("P-154")!.effects).toEqual(expect.arrayContaining([
      expect.objectContaining({ trigger: "Static", isInherited: true, keywords: [{ keyword: "Blocker", raw: "＜Blocker＞" }] }),
    ]));
  });
});
