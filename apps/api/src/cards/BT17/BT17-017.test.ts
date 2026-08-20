import { describe, expect, it } from "vitest";
import { compiled } from "./BT17-017.js";

describe("BT17-017", () => {
  it("models Security Attack +1 and deletes an opposing Digimon at or below this card's DP", () => {
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "Static", keywords: [{ keyword: "SecurityAttack", amount: 1 }] });
    expect(compiled.effects?.[1]).toMatchObject({ trigger: "OnPlay", actions: [{ kind: "Delete", target: { filter: { dp: { op: "lte", relativeToSource: true } } } }] });
    expect(compiled.effects?.[2]).toMatchObject({ trigger: "WhenDigivolving", actions: [{ kind: "Delete" }] });
  });

  it("returns a Tamer and Hybrid Digimon from trash, then plays a Tamer", () => {
    expect(compiled.effects?.[3]).toMatchObject({ trigger: "OnDeletion", actions: [{ kind: "Return", to: "hand", target: { filter: { kind: ["Tamer"] } } }, { kind: "Return", to: "hand", target: { filter: { kind: ["Digimon"] } } }, { kind: "PlayWithoutCost", from: ["hand"], payCost: false, optional: true }] });
  });
});
