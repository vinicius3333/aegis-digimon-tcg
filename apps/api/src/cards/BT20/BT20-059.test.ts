import { describe, expect, it } from "vitest";
import { compiled } from "./BT20-059.js";

describe("BT20-059 Gankoomon (X Antibody)", () => {
  it("de-digivolves one opposing Digimon and conditionally protects all own Digimon", () => {
    expect(compiled.effects.find((effect) => effect.trigger === "WhenDigivolving")).toMatchObject({ actions: [{ kind: "DeDigivolve", amount: 2, target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 } }, { kind: "GrantStatic", grant: "immuneToOpponentDigimonEffects", duration: "untilOpponentTurnEnd", target: { filter: { controller: "mine", kind: ["Digimon"] }, count: "all" }, condition: { kind: "selfDigivolutionStackHasTrait" } }] });
  });

  it("grants Reboot and Blocker to own Sistermon/Huckmon or Royal Knight Digimon during the opponent's turn", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "OpponentsTurn" && !entry.isInherited);
    expect(effect?.actions).toMatchObject([{ kind: "GainKeyword", keyword: { keyword: "Reboot" }, duration: "untilOpponentTurnEnd", target: { count: "all", filter: { nameOrTrait: [{ tokens: ["Sistermon", "Huckmon"], match: "name" }, { tokens: ["Royal Knight"], match: "trait" }] } } }, { kind: "GainKeyword", keyword: { keyword: "Blocker" }, duration: "untilOpponentTurnEnd" }]);
  });

  it("gives all own Digimon Reboot and Blocker when the inherited host is Jesmon GX", () => {
    const effect = compiled.effects.find((entry) => entry.isInherited);
    expect(effect).toMatchObject({ trigger: "OpponentsTurn", actions: [{ kind: "GainKeyword", keyword: { keyword: "Reboot" }, condition: { kind: "selfTopHasText", filter: { nameOrTrait: [{ tokens: ["Jesmon GX"], match: "name" }] } } }, { kind: "GainKeyword", keyword: { keyword: "Blocker" }, condition: { kind: "selfTopHasText" } }] });
  });
});
