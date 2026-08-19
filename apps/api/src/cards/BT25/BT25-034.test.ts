import { describe, expect, it } from "vitest";
import { compiled as BT25_034 } from "./BT25-034.js";
import "../index.js";

describe("BT25-034 Angemon", () => {
  it("only plays an eligible Angel or Iliad Digimon from hand when trashed from security by an effect", () => {
    const effect = BT25_034.effects?.find((entry) => entry.trigger === "OnDiscardSecurity");
    expect(effect).toBeDefined();
    expect(effect?.actions?.[0]).toMatchObject({
      kind: "PlayWithoutCost",
      optional: true,
      payCost: false,
      target: {
        filter: {
          controller: "mine",
          zone: "hand",
          levelComparison: { op: "lte", value: 4 },
          nameOrTrait: [{ tokens: ["Angel", "Iliad"], match: "trait" }],
        },
        count: 1,
      },
    });
  });

  it("keeps Ascension and inherited Barrier as keyword-only entries", () => {
    expect(BT25_034.effects).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ trigger: "Static", keywords: [{ keyword: "Ascension", raw: "＜Ascension＞" }] }),
        expect.objectContaining({
          trigger: "Static",
          isInherited: true,
          keywords: [{ keyword: "Barrier", raw: "＜Barrier＞" }],
        }),
      ]),
    );
  });
});
