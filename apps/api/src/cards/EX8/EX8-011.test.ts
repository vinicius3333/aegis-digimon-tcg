import { describe, expect, it } from "vitest";
import { compiled } from "./EX8-011.js";

describe("EX8-011", () => {
  it("plays itself from security and gains +3000 DP at the start of the main phase and when digivolving", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "Security")?.actions[0]).toMatchObject({ kind: "PlayWithoutCost", payCost: false });
    expect(compiled.effects?.find((entry) => entry.trigger === "StartOfYourMainPhase")?.actions[0]).toMatchObject({ kind: "ModifyDP", amount: 3000, duration: "untilOpponentTurnEnd" });
    expect(compiled.effects?.find((entry) => entry.trigger === "WhenDigivolving")?.actions[0]).toMatchObject({ kind: "ModifyDP", amount: 3000, duration: "untilOpponentTurnEnd" });
  });
  it("inherits +2000 DP during your turn", () => expect(compiled.effects?.find((entry) => entry.isInherited)?.actions[0]).toMatchObject({ kind: "ModifyDP", amount: 2000, duration: "permanent" }));
});
