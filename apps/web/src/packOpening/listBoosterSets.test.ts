import { expect, it } from "vitest";
import { listBoosterSets } from "@/packOpening/listBoosterSets";
import { listSealedProducts } from "@aegis/shared/sealed/listSealedProducts";
import { drawBoosterPack } from "@aegis/shared/packOpening/drawBoosterPack";

it("uses the same released product identities and complete pools as sealed", () => {
  const sets = listBoosterSets();
  expect(sets.map((set) => set.setId)).toEqual(listSealedProducts().map((product) => product.value));
  expect(sets[0]?.setId).toBe("EX13");
  expect(sets.find((set) => set.setId === "BT26")?.cards).toHaveLength(104);
  expect(sets.find((set) => set.setId === "EX13")?.cards).toHaveLength(77);
  expect(sets.some((set) => set.setId === "BT27")).toBe(false);
  expect(sets.some((set) => set.setId === "BT1")).toBe(false);
  expect(sets.some((set) => set.setId === "RB1")).toBe(false);
});

it("preserves the product printing and rarity of reprints without cross-product contamination", () => {
  const sets = listBoosterSets();
  const newest = sets.find((set) => set.setId === "BT25")!;
  expect(newest.cards.find((card) => card.cardId === "BT2-047")).toMatchObject({ rarity: "C", artId: "BT2-047_P2" });
  const original = sets.find((set) => set.setId === "BT01-03-V1.5")!;
  expect(original.cards.find((card) => card.cardId === "BT2-047")?.artId).toBeUndefined();
  const pulls = drawBoosterPack({ setId: newest.setId, cards: newest.cards, random: () => 0.5 });
  expect(pulls).toHaveLength(12);
  expect(pulls.every((pull) => newest.cards.some((card) => card.cardId === pull.cardId))).toBe(true);
});

it("uses actual English pack artwork for combined products", () => {
  for (const setId of ["BT01-03-V1", "BT01-03-V1.5", "BT18-19", "BT19-20"]) {
    expect(listBoosterSets().find((product) => product.setId === setId)?.coverUrl).toBe(`/sets/${setId}.png`);
  }
});
