import { describe, expect, it } from "vitest";
import { compiled } from "./BT16-009.js";

describe("BT16-009", () => {
  it("has Raid and Armor Purge and gives an opposing Digimon -3000 DP when digivolving", () => {
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "Static", keywords: [{ keyword: "Raid" }, { keyword: "Armor Purge" }] });
    expect(compiled.effects?.[1]).toMatchObject({ trigger: "WhenDigivolving", actions: [{ kind: "ModifyDP", amount: -3000, duration: "forTheTurn" }] });
  });
});
