import { describe, expect, it } from "vitest";
import { compiled } from "./EX7-051.js";

describe("EX7-051", () => {
  it("draws 1 by placing a Three Musketeers Option from hand or trash under a Digimon", () => expect(compiled.effects?.find((entry) => entry.trigger === "StartOfYourMainPhase")?.actions[0]).toMatchObject({ kind: "Draw", amount: 1, optional: true, cost: { kind: "place", destination: "digivolutionStack", position: "bottom" } }));
  it("inherits Retaliation", () => expect(compiled.effects?.find((entry) => entry.isInherited)?.keywords).toContainEqual({ keyword: "Retaliation", raw: "＜Retaliation＞" }));
});
