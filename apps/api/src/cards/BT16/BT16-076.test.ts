import { describe, expect, it } from "vitest";
import { compiled } from "./BT16-076.js";

describe("BT16-076", () => {
  it("may delete an opposing Digimon at 6000 DP or lower by trashing two hand cards", () => {
    expect(compiled.effects?.[0]?.actions?.[0]).toMatchObject({ kind: "Delete", optional: true, abortOnDecline: true, cost: { kind: "trash", target: { count: 2 } }, target: { filter: { dp: { op: "lte", value: 6000 } } } });
  });

  it("plays a level 4 or lower SoC Digimon from trash if deletion did not happen", () => {
    expect(compiled.effects?.[0]?.actions?.[1]).toMatchObject({ kind: "PlayWithoutCost", from: ["trash"], payCost: false, optional: true, condition: { kind: "ifThisEffectDidNotDelete" } });
  });

  it("digivolves into Fenriloogamon from trash when another SoC Digimon is deleted", () => {
    expect(compiled.effects?.[1]).toMatchObject({ trigger: "AllTurns", actions: [{ kind: "SubTrigger", event: "onDeletionOf", actions: [{ kind: "Digivolve", from: ["trash"], payCost: false, optional: true }] }] });
  });
});
