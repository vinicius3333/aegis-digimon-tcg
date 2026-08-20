import { describe, expect, it } from "vitest";
import { compiled } from "./BT16-040.js";

describe("BT16-040", () => {
  it("digivolves from trash into an Insectoid or Free level 4 at both timings", () => {
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "StartOfYourMainPhase", actions: [{ kind: "Digivolve", from: ["trash"], reduceCost: 1, optional: true }] });
    expect(compiled.effects?.[1]).toMatchObject({ trigger: "OnPlay", actions: [{ kind: "Digivolve", from: ["trash"], reduceCost: 1, optional: true }] });
  });

  it("suspends an opposing Digimon as inherited once per turn", () => {
    expect(compiled.effects?.[2]).toMatchObject({ trigger: "WhenAttacking", isInherited: true, frequency: "OncePerTurn", actions: [{ kind: "Suspend" }] });
  });
});
