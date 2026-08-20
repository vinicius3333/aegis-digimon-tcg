import { describe, expect, it } from "vitest";
import { compiled } from "./BT16-019.js";

describe("BT16-019", () => {
  it("has Blocker and unsuspends one of your level 4 or lower Digimon on play or digivolving", () => {
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "Static", keywords: [{ keyword: "Blocker" }] });
    expect(compiled.effects?.[1]).toMatchObject({ trigger: "OnPlay", actions: [{ kind: "Unsuspend", target: { filter: { levelComparison: { op: "lte", value: 4 } } } }] });
    expect(compiled.effects?.[2]).toMatchObject({ trigger: "WhenDigivolving", actions: [{ kind: "Unsuspend" }] });
  });
  it("trashes one opposing digivolution card when attacking as inherited", () => expect(compiled.effects?.[3]).toMatchObject({ trigger: "WhenAttacking", isInherited: true, actions: [{ kind: "TrashDigivolution", amount: 1, fromTop: true }] }));
});
