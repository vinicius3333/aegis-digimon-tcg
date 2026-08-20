import { describe, expect, it } from "vitest";
import { compiled } from "./BT16-047.js";

describe("BT16-047", () => {
  it("suspends and prevents unsuspending an opposing Digimon", () => {
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "WhenDigivolving", actions: [{ kind: "Suspend" }, { kind: "Restrict", restriction: "unsuspend", duration: "untilOpponentTurnEnd" }] });
  });

  it("trashes security or gains memory after a battle deletion", () => {
    expect(compiled.effects?.[1]).toMatchObject({ trigger: "AllTurns", actions: [{ kind: "SubTrigger", event: "whenDeletesInBattle", actions: [{ kind: "SecurityManipulation", op: "trashTop", condition: { kind: "securityAtLeast", value: 3 } }, { kind: "GainMemory", amount: 2, condition: { kind: "securityAtMost", value: 3 } }] }] });
  });
});
