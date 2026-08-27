import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { compiled } from "./BT1-108.js";

describe("BT1-108 Horn Buster", () => {
  it("matches the catalog and compiles both printed effects", () => {
    expect(getCardDefinition("BT1-108")).toMatchObject({ nameEn: "Horn Buster", playCost: 1 });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects).toEqual([
      {
        trigger: "Main",
        actions: [
          {
            kind: "ModifyDP",
            target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
            amount: 3000,
            duration: "forTheTurn",
          },
        ],
      },
      {
        trigger: "Security",
        actions: [
          { kind: "Suspend", target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 } },
          { kind: "AddToHandSelf" },
        ],
      },
    ]);
  });
});
