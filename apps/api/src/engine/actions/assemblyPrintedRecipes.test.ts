import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { playByAssembly } from "../testkit/assembly.js";
import "../../cards/index.js";

interface PrintedRecipe {
  cardId: string;
  printed: string;
  /** Play cost after the Assembly reduction; staged as exact memory so a valid play ends at 0. */
  reducedCost: number;
  valid: string[][];
  invalid: [label: string, materials: string[]][];
}

/** Assembly lines printed on the official images but missing from the catalog sources. */
const RECIPES: PrintedRecipe[] = [
  {
    cardId: "AD1-009",
    printed: "[Assembly -4] [MetalGreymon: Alterous Mode]×[Greymon]",
    reducedCost: 8,
    valid: [["BT5-015", "AD1-001"]],
    invalid: [["two [Greymon]", ["AD1-001", "BT1-015"]]],
  },
  {
    cardId: "AD1-012",
    printed: "[Assembly -4] [WereGarurumon: Sagittarius Mode]×[Garurumon]",
    reducedCost: 8,
    valid: [["BT5-029", "AD1-010"]],
    invalid: [["[Greymon] instead of [Garurumon]", ["BT5-029", "AD1-001"]]],
  },
  {
    cardId: "AD1-025",
    printed: "[Assembly -6] [WarGreymon]×[MetalGarurumon]",
    reducedCost: 9,
    valid: [["AD1-004", "AD1-014"]],
    invalid: [["two [WarGreymon]", ["AD1-004", "BT1-025"]]],
  },
  {
    cardId: "EX9-047",
    printed: "[Assembly -3] 4 [Eyesmon: Scatter Mode]",
    reducedCost: 4,
    valid: [["BT7-069", "EX7-053", "EX9-048", "BT7-069"]],
    invalid: [["three copies only", ["BT7-069", "EX7-053", "EX9-048"]]],
  },
  {
    cardId: "EX9-073",
    printed: "[Assembly -6] 4 level 5 [Cyborg] trait Digimon cards w/different names",
    reducedCost: 6,
    valid: [["AD1-003", "BT1-021", "BT1-024", "BT10-065"]],
    invalid: [["a repeated name", ["AD1-003", "BT1-021", "BT1-024", "BT1-021"]]],
  },
  {
    cardId: "BT22-078",
    printed: "[Assembly -6] 5 [Flame] trait Digimon cards w/different card numbers",
    reducedCost: 6,
    valid: [["BT11-084", "BT15-009", "BT15-015", "BT15-069", "BT18-030"]],
    invalid: [["a repeated card number", ["BT11-084", "BT15-009", "BT15-015", "BT15-069", "BT15-069"]]],
  },
  {
    cardId: "BT24-062",
    printed: "[Assembly -2] [Blimpmon]/Tamer card w/[TS] trait",
    reducedCost: 5,
    valid: [["BT20-049"], ["BT24-083"]],
    invalid: [["a [TS] Digimon instead of a Tamer", ["BT24-009"]]],
  },
];

describe.each(RECIPES)("$cardId printed Assembly recipe", ({ cardId, printed, reducedCost, valid, invalid }) => {
  it("prints the Assembly line in the catalog", () => {
    expect(getCardDefinition(cardId)!.effectText).toContain(printed);
  });

  it.each(valid.map((materials) => [materials.join(" + "), materials] as const))(
    "plays by Assembly with %s",
    async (_label, materials) => {
      const { s, result } = await playByAssembly(cardId, materials, reducedCost);
      expect(result).toEqual({ ok: true });
      expect(s.state.memory).toBe(0);
    },
  );

  it.each(invalid)("rejects %s", async (_label, materials) => {
    const { result } = await playByAssembly(cardId, materials, reducedCost);
    expect(result).toEqual({ ok: false, reason: "invalid-material" });
  });
});
