import { describe, expect, it } from "vitest";
import { compiled } from "./EX9-026.js";

describe("EX9-026", () => {
  it("has Training and its play/digivolve effects give an opposing Digimon -3000 DP for the opponent's turn", () => {
    expect(compiled.effects?.find((entry) => !entry.isInherited)?.keywords).toContainEqual({ keyword: "Training", raw: "＜Training＞" });
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      expect(compiled.effects?.find((entry) => entry.trigger === trigger)).toMatchObject({ actions: [{ kind: "ModifyDP", amount: -3000, duration: "untilOpponentTurnEnd", cost: { kind: "place", faceDown: true, destination: "digivolutionStack" } }] });
    }
  });
  it("adds the top deck card to security on deletion at three or fewer security", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "OnDeletion")).toMatchObject({ actions: [{ kind: "SecurityManipulation", op: "addTop", amount: 1, condition: { kind: "zoneCount", value: 3 } }] });
  });
  it("inherits the same security recovery effect", () => expect(compiled.effects?.find((entry) => entry.isInherited)?.actions).toContainEqual(expect.objectContaining({ kind: "SecurityManipulation", op: "addTop" })));
});
