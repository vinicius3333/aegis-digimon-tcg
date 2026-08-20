import { describe, expect, it } from "vitest";
import { compiled } from "./BT15-040.js";

describe("BT15-040", () => {
  it("may play a Numemon or level 3 Digimon when the stack has Monzaemon/X Antibody", () => expect(compiled.effects?.[0]).toMatchObject({ trigger: "WhenDigivolving", actions: [{ kind: "PlayWithoutCost", from: ["hand"], payCost: false, condition: { kind: "selfDigivolutionStackHasTrait" }, optional: true }] }));
  it("once per turn gives an opposing Digimon -2000 DP when another Digimon is played, scaled by your Digimon count", () => expect(compiled.effects?.[1]).toMatchObject({ trigger: "AllTurns", frequency: "OncePerTurn", actions: [{ kind: "SubTrigger", event: "whenPlayed", scaling: { per: 1, unit: "cards" }, actions: [{ kind: "ModifyDP", amount: -2000 }] }] }));
});
