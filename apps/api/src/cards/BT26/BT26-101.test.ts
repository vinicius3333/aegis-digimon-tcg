import { describe, expect, it } from "vitest";
import { getCompiledCard } from "@aegis/shared";
import "./BT26-101.js";

describe("BT26-101 compiled fidelity", () => {
  it("preserves the TS waiver, conditional grant, modal, and Security play with the DP seam explicit", () => {
    const card = getCompiledCard("BT26-101");
    expect(card?.coverage).toBe("partial");
    expect(card?.residual).toEqual(["The delete modal's live threshold against the greatest DP among your TS Digimon is not expressible by the current filter IR; retained as loud RawUnparsed action."]);
    expect(card?.effects?.[0]?.actions).toMatchObject([{ kind: "WaiveColorRequirement" }]);
    expect(card?.effects?.[1]?.actions).toMatchObject([{ kind: "GainKeyword", keyword: { keyword: "Blocker" } }, { kind: "ModifyDP", amount: 3000 }, { kind: "Modal", choose: 1 }]);
    expect(card?.effects?.[2]?.actions).toMatchObject([{ kind: "PlayWithoutCost", from: ["hand", "trash"], payCost: false, optional: true }]);
  });
});
