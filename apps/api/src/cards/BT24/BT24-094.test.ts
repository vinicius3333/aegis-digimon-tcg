import { describe, expect, it } from "vitest";
import { compiled } from "./BT24-094.js";

describe("BT24-094 Central Town: Throne Room", () => {
  it("encodes color waiver, face-up security static effects, main security exchange, and Security play", () => {
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects[0]).toMatchObject({ trigger: "Static", actions: [{ kind: "WaiveColorRequirement", condition: { kind: "youHaveNone", filter: { zone: "security", faceUp: true } } }] });
    expect(compiled.effects[1]).toMatchObject({ trigger: "AllTurns", isSecurity: true, actions: [{ kind: "ModifyDP", amount: 2000, duration: "permanent" }, { kind: "Aura", effect: { kind: "keyword", keyword: { keyword: "Alliance" } } }] });
    expect(compiled.effects[2]).toMatchObject({ trigger: "Main", actions: [{ kind: "SecurityManipulation", op: "toHand", toTop: false }, { kind: "SecurityManipulation", op: "placeAsSecurity", toTop: false, faceUp: true }, { kind: "PlayWithoutCost", from: ["hand"], payCost: true, reduceCostBy: 3 }] });
    expect(compiled.effects[3]).toMatchObject({ trigger: "Security", isSecurity: true, actions: [{ kind: "PlayWithoutCost", from: ["hand", "trash"], payCost: false, optional: true }] });
  });
});
