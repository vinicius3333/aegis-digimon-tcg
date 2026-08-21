import { describe, expect, it } from "vitest";
import { compiled } from "./BT20-020.js";

describe("BT20-020 Imperialdramon: Fighter Mode", () => {
  it("restricts opponent effect plays, conditionally trashes security, and deletes within source DP", () => {
    expect(compiled.effects.find((entry) => entry.trigger === "WhenDigivolving")).toMatchObject({
      actions: [
        { kind: "RestrictPlay", seat: "opponent", filter: { kind: ["Digimon", "Tamer"] }, mode: "play", byEffectOnly: true, duration: "untilOpponentTurnEnd" },
        { kind: "SecurityManipulation", op: "trashTop", controller: "opponent", amount: 1, condition: { kind: "selfDigivolutionStackHasTrait" } },
      ],
    });
    expect(compiled.effects.find((entry) => entry.trigger === "AllTurns")).toMatchObject({ frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "whenSecurityRemoved", actions: [{ kind: "Delete", target: { filter: { controller: "opponent", dp: { op: "lte", relativeToSource: true } } } }] }] });
    expect(compiled.effects.filter((entry) => entry.keywords?.length)).toEqual(expect.arrayContaining([
      expect.objectContaining({ keywords: [expect.objectContaining({ keyword: "Raid" })] }),
      expect.objectContaining({ keywords: [expect.objectContaining({ keyword: "Piercing" })] }),
    ]));
  });
});
