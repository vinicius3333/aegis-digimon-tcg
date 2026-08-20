import { describe, expect, it } from "vitest";
import { compiled } from "./BT17-014.js";

describe("BT17-014", () => {
  it("digivolves a Takuya Kanbara into itself for 3 by placing Agunimon and BurningGreymon", () => {
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "Main", isFromHand: true, actions: [{ kind: "Digivolve", costOverride: 3, asLevel: 4, asColors: ["Red"], ignoreRequirements: true, additionalCosts: [{ kind: "place" }] }] });
  });

  it("deletes an opposing Digimon at 6000 DP or less", () => {
    expect(compiled.effects?.[1]).toMatchObject({ trigger: "WhenDigivolving", actions: [{ kind: "Delete", target: { filter: { dp: { op: "lte", value: 6000 } } } }] });
  });

  it("prevents security option effects as inherited for Hybrid or Ten Warriors", () => {
    expect(compiled.effects?.[2]).toMatchObject({ trigger: "YourTurn", isInherited: true, actions: [{ kind: "GrantStatic", grant: "noSecurityOptionEffects", duration: "permanent", condition: { kind: "selfHasTrait" } }] });
  });
});
