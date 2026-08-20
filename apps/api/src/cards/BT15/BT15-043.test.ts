import { describe, expect, it } from "vitest";
import { compiled } from "./BT15-043.js";

describe("BT15-043", () => {
  it("may suspend one Digimon to give an Insectoid +3000 DP", () => expect(compiled.effects?.[0]).toMatchObject({ trigger: "StartOfYourMainPhase", actions: [{ kind: "ModifyDP", amount: 3000, duration: "untilOpponentTurnEnd", cost: { kind: "suspend" }, optional: true }] }));
  it("gains 1 memory once per turn when an inherited Digimon deletes in battle", () => expect(compiled.effects?.[1]).toMatchObject({ trigger: "AllTurns", isInherited: true, frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "whenDeletesInBattle", actions: [{ kind: "GainMemory", amount: 1 }] }] }));
});
