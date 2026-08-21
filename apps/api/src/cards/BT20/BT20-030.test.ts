import { describe, expect, it } from "vitest";
import { compiled } from "./BT20-030.js";

describe("BT20-030 Liollmon", () => {
  it("reveals three and independently adds one qualifying Digimon and one ACCEL Option", () => {
    expect(compiled.effects.find((entry) => entry.trigger === "OnPlay")).toMatchObject({ actions: [{ kind: "RevealAdd", revealCount: 3, add: [{ filter: { kind: ["Digimon"], nameOrTrait: [{ tokens: ["Chaosmon"], match: "name" }, { tokens: ["ACCEL"], match: "trait" }] }, count: 1, to: "hand" }, { filter: { kind: ["Option"], nameOrTrait: [{ tokens: ["ACCEL"], match: "trait" }] }, count: 1, to: "hand" }], rest: "deckBottom" }] });
    expect(compiled.effects.find((entry) => entry.isInherited)?.keywords).toEqual([{ keyword: "Barrier", raw: "＜Barrier＞" }]);
    expect(compiled.digivolutionRequirement).toEqual([{ names: ["Frimon"], cost: 0, isAlternate: true }, { level: 2, traits: ["ACCEL"], cost: 0, isAlternate: true }]);
  });
});
