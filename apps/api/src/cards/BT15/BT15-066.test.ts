import { describe, expect, it } from "vitest";
import { compiled } from "./BT15-066.js";

describe("BT15-066", () => {
  it("de-digivolves an opposing Digimon by two to level 3 on play and when attacking", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "OnPlay",
      actions: [{ kind: "DeDigivolve", amount: 2, stopAtLevel: 3 }],
    });
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "WhenAttacking",
      actions: [{ kind: "DeDigivolve", amount: 2, stopAtLevel: 3 }],
    });
  });
  it("deletes itself to play a non-Machinedramon Dark Masters and unsuspends as inherited", () => {
    expect(compiled.effects?.[3]).toMatchObject({
      trigger: "EndOfOpponentsTurn",
      actions: [{ kind: "Delete" }, { kind: "PlayWithoutCost", from: ["hand"], payCost: false, optional: true }],
    });
    expect(compiled.effects?.[4]).toMatchObject({
      trigger: "Static",
      isInherited: true,
      actions: [{ kind: "Unsuspend" }],
    });
  });
});
