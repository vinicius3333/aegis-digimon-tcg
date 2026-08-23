import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import { compiled } from "./BT1-103.js";

describe("BT1-103 Testament", () => {
  it("matches the catalog and compiles both printed effects", () => {
    expect(getCardDefinition("BT1-103")).toMatchObject({ nameEn: "Testament", playCost: 3 });
    expect(compiled).toMatchObject({ coverage: "full", residual: [] });
    expect(compiled.effects).toEqual([
      {
        trigger: "Main",
        actions: [
          {
            kind: "GainKeyword",
            target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
            keyword: { keyword: "Blocker" },
            duration: "untilOpponentTurnEnd",
          },
        ],
      },
      { trigger: "Security", actions: [{ kind: "Draw", controller: "mine", amount: 1 }, { kind: "AddToHandSelf" }] },
    ]);
  });
});
