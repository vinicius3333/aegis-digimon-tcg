import { describe, expect, it } from "vitest";
import { getCompiledCard } from "@aegis/shared";
import "./BT26-102.js";

describe("BT26-102 compiled fidelity", () => {
  it("keeps the Seven Code waiver and complete Security clause while exposing the mixed placement seam", () => {
    const card = getCompiledCard("BT26-102");
    expect(card?.coverage).toBe("partial");
    expect(card?.residual).toEqual(["The six-card mixed battle-area/link/trash placement cost and its recipient-bound free Dantemon evolution require a combined selection and permanent-relocation seam not present in the current IR."]);
    expect(card?.effects?.[0]?.actions).toMatchObject([{ kind: "WaiveColorRequirement" }]);
    expect(card?.effects?.[1]?.actions).toMatchObject([{ kind: "RawUnparsed" }]);
    expect(card?.effects?.[2]?.actions).toMatchObject([{ kind: "PlayWithoutCost", from: ["hand", "trash"], payCost: false }, { kind: "AddToHandSelf" }]);
  });
});
