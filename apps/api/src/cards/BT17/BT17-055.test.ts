import { describe, expect, it } from "vitest";
import { compiled } from "./BT17-055.js";

describe("BT17-055 Infermon", () => {
  it("de-digivolves any opposing Digimon, then restricts an opposing cost-8-or-lower Digimon from attacking players", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "WhenDigivolving");
    expect(effect?.actions[0]).toMatchObject({ kind: "DeDigivolve", amount: 1, stopAtLevel: 3, target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 } });
    expect(effect?.actions[1]).toMatchObject({ kind: "Restrict", restriction: "attackPlayers", duration: "untilOpponentTurnEnd", target: { filter: { controller: "opponent", playCostLte: 8 }, count: 1 } });
  });

  it("triggers once per turn only when another named Diaboromon is played", () => {
    const effect = compiled.effects.find((entry) => entry.isInherited);
    expect(effect).toMatchObject({ trigger: "AllTurns", frequency: "OncePerTurn", actions: [{ event: "whenPlayed", sourceFilter: { controller: "mine", excludeSelf: true, kind: ["Digimon"], nameOrTrait: [{ tokens: ["Diaboromon"], match: "name" }] } }] });
  });
});
