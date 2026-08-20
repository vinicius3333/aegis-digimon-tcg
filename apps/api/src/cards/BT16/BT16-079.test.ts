import { describe, expect, it } from "vitest";
import { compiled } from "./BT16-079.js";

describe("BT16-079", () => {
  it("models Alliance", () => {
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "Static", keywords: [{ keyword: "Alliance" }] });
  });

  it("once per turn plays a yellow or green level 4 or lower from hand or trash at both timings", () => {
    expect(compiled.effects?.[1]).toMatchObject({ trigger: "WhenDigivolving", frequency: "OncePerTurn", sharedUseKey: "ir-shared-0", actions: [{ kind: "PlayWithoutCost", from: ["hand", "trash"], payCost: false, optional: true }] });
    expect(compiled.effects?.[2]).toMatchObject({ trigger: "WhenAttacking", frequency: "OncePerTurn", sharedUseKey: "ir-shared-0" });
  });

  it("deletes an opposing level 4 or lower Digimon per other Digimon when Cherubimon or X Antibody is underneath", () => {
    expect(compiled.effects?.[3]).toMatchObject({ trigger: "EndOfYourTurn", frequency: "OncePerTurn", actions: [{ kind: "Delete", optional: true, condition: { kind: "selfDigivolutionStackHasTrait" }, target: { filter: { levelComparison: { op: "lte", value: 4, scaling: { unit: "cards" } } } } }] });
  });
});
