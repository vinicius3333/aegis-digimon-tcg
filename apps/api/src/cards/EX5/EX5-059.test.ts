import { describe, expect, it } from "vitest";
import { compiled } from "./EX5-059.js";

describe("EX5-059 Dobermon", () => {
  it("grants Retaliation to one of your Digimon until the opponent's turn ends", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({ kind: "GainKeyword", keyword: { keyword: "Retaliation" }, duration: "untilOpponentTurnEnd", target: { count: 1, filter: { controller: "mine", kind: ["Digimon"] } } });
  });
  it("draws and trashes on digivolving, then reactivates its On Play effect for Dobermon/X Antibody", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions).toMatchObject([{ kind: "Draw", amount: 1 }, { kind: "Trash" }, { kind: "ReactivateEffect", fromTrigger: "OnPlay", count: 1, condition: { kind: "selfDigivolutionStackHasTrait" } }]);
  });
});
