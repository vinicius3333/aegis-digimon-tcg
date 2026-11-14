import { describe, expect, it } from "vitest";
import { allCards } from "#shared/cards/registry";
import { drawBoosterPack } from "#shared/packOpening/drawBoosterPack";
import { getSealedConfiguration } from "#shared/sealed/getSealedConfiguration";
import { isSealedConfiguration } from "#shared/sealed/isSealedConfiguration";

describe("sealed product configuration", () => {
  it("accepts only the versioned six-pack audited product", () => {
    expect(isSealedConfiguration(getSealedConfiguration({ setId: "BT4" }))).toBe(true);
    for (const config of [
      { setId: "BT1" },
      { setId: "BT27" },
      { packs: 7 },
      { rulesVersion: "future" },
      { buildMinutes: 0 },
      { sideboardSeconds: 0 },
    ]) {
      expect(isSealedConfiguration({ ...getSealedConfiguration({ setId: "BT4" }), ...config })).toBe(false);
    }
  });
  it("collates twelve real distinct printings with deterministic injected randomness", () => {
    const cards = allCards().filter((card) => card.set === "BT4");
    const params = { setId: "BT4", cards, random: () => 0.5 };
    const pack = drawBoosterPack(params);
    expect(pack).toHaveLength(12);
    expect(pack).toEqual(drawBoosterPack(params));
    expect(new Set(pack.map((card) => card.artId ?? card.cardId)).size).toBe(12);
  });
});

describe("released English booster selection", () => {
  it.each(["EX13", "BT26", "BT25", "EX12", "BT4"])("accepts the complete released %s product", (setId) => {
    expect(isSealedConfiguration(getSealedConfiguration({ setId }))).toBe(true);
  });
  it.each(["BT27", "unknown", "constructor", "BT1"])(
    "refuses unsupported product %s at configuration construction",
    (setId) => {
      expect(() => getSealedConfiguration({ setId })).toThrow("sealed_product_unavailable");
    },
  );
});
