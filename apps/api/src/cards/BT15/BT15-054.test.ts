import { describe, expect, it } from "vitest";
import { compiled } from "./BT15-054.js";

describe("BT15-054", () => {
  it("suspends an opposing Digimon and Tamer and restricts their unsuspension", () => {
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "WhenDigivolving", actions: [{ kind: "Suspend" }, { kind: "Suspend" }, { kind: "Restrict", restriction: "unsuspend", duration: "untilOpponentTurnEnd" }] });
  });
  it("once per turn reacts to an opponent Digimon play or breeding move", () => {
    expect(compiled.effects?.[1]).toMatchObject({ trigger: "OpponentsTurn", frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "whenPlayed" }] });
    expect(compiled.effects?.[2]).toMatchObject({ trigger: "OpponentsTurn", frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "whenOpponentMovedFromBreeding", actions: [{ condition: { kind: "selfDigivolutionStackHasTrait" } }] }] });
  });
});
