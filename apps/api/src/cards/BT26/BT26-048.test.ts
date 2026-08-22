import { describe, expect, it } from "vitest";
import { compiled } from "./BT26-048.js";

describe("BT26-048 BloomLordmon", () => {
  it("encodes Alliance/Vortex, the face-down stack cost and batch trash reaction", () => {
    expect(compiled.effects?.[0]?.keywords).toEqual(expect.arrayContaining([
      expect.objectContaining({ keyword: "Alliance" }), expect.objectContaining({ keyword: "Vortex" }),
    ]));
    for (const trigger of ["WhenDigivolving", "WhenAttacking"]) expect(compiled.effects?.find((e) => e.trigger === trigger)).toMatchObject({ actions: [{ kind: "TrashDigivolution" }, { kind: "PlayWithoutCost", payCost: false }] });
    expect(compiled.effects?.[3]).toMatchObject({ trigger: "AllTurns", actions: [{ kind: "SubTrigger", event: "onDigivolutionCardsDiscardedBatch", actions: [{ kind: "ModifyDP", amount: -6000 }] }] });
  });
});
