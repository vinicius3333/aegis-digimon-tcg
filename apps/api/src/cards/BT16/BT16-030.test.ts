import { describe, expect, it } from "vitest";
import { compiled } from "./BT16-030.js";

describe("BT16-030", () => {
  it("digivolves from trash at the start of the main phase or on play", () => {
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "StartOfYourMainPhase", actions: [{ kind: "Digivolve", from: ["trash"], reduceCost: 1, optional: true }] });
    expect(compiled.effects?.[1]).toMatchObject({ trigger: "OnPlay", actions: [{ kind: "Digivolve", from: ["trash"], reduceCost: 1, optional: true }] });
  });

  it("reduces opposing security DP by 3000 as inherited", () => {
    expect(compiled.effects?.[2]).toMatchObject({ trigger: "YourTurn", isInherited: true, actions: [{ kind: "ModifySecurityDP", amount: -3000, duration: "forTheTurn" }] });
  });
});
