import { describe, expect, it } from "vitest";
import { compiled } from "./EX8-064.js";

describe("EX8-064", () => {
  it("de-digivolves an opposing Digimon by 3 and gives all opposing Digimon -6000 DP when digivolving", () => {
    const actions = compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions ?? [];
    expect(actions[0]).toMatchObject({ kind: "DeDigivolve", amount: 3 });
    expect(actions[1]).toMatchObject({ kind: "ModifyDP", amount: -6000, duration: "forTheTurn", target: { count: "all" } });
  });
  it("plays NSo cards from trash up to total play cost 10 during DNA digivolving and inherits security trash after another Digimon is deleted", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions[2]).toMatchObject({ kind: "PlayWithoutCost", from: ["trash"], target: { totalPlayCost: 10 }, condition: { kind: "isDnaDigivolving" } });
    expect(compiled.effects?.find((entry) => entry.trigger === "AllTurns")).toMatchObject({ frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "onDeletionOf", actions: [{ kind: "Trash" }] }] });
  });
});
