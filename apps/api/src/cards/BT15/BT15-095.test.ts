import { describe, expect, it } from "vitest";
import { compiled } from "./BT15-095.js";

describe("BT15-095", () => {
  it("suspends an opposing Digimon and grants its On Deletion security-trash effect with Izzy", () => {
    expect(compiled.effects?.[0]?.actions[0]).toMatchObject({
      kind: "Suspend",
      target: { filter: { controller: "opponent" } },
    });
    expect(compiled.effects?.[0]?.actions[1]).toMatchObject({
      kind: "GainTriggeredEffect",
      gainedTrigger: "onDeletionOf",
      gainedActions: [{ kind: "SecurityManipulation", op: "trashTop", controller: "opponent" }],
      condition: { kind: "youHave" },
      duration: "untilOpponentTurnEnd",
    });
  });
  it("suspends an opposing Digimon and returns itself from security", () =>
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "Security",
      isSecurity: true,
      actions: [{ kind: "Suspend" }, { kind: "AddToHandSelf" }],
    }));
});
