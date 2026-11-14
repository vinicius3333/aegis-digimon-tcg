import { expect, it } from "vitest";
import { getCardArts } from "#shared/cards/arts";
import { CardKind } from "#shared/schema/enums";
import { findBoosterProduct } from "#shared/packOpening/findBoosterProduct";
import { getBoosterProductPool } from "#shared/packOpening/getBoosterProductPool";
import { drawBoosterPack } from "#shared/packOpening/drawBoosterPack";
import { BoxHit } from "#shared/packOpening/BoxHit";
import { validateSealedDeck } from "#shared/sealed/validateSealedDeck";
import arts from "../cards/data/arts.json" with { type: "json" };

it.each([
  { setId: "BT25", cardId: "BT2-047", artId: "BT2-047_P2", rarity: "C", label: "BT-25: BOOSTER DUAL REVOLUTION" },
  { setId: "BT14", cardId: "BT8-112", artId: "BT8-112_P5", rarity: "SEC", label: "BT-14: Booster Blast Ace" },
])(
  "draws and owns the official $setId reprint without substituting its base art",
  ({ setId, cardId, artId, rarity, label }) => {
    const product = findBoosterProduct(setId)!;
    const cards = getBoosterProductPool(product);
    expect(cards).toHaveLength(product.printings.length);
    const candidates = cards.filter((card) => card.rarity === rarity);
    const index = candidates.findIndex((card) => card.cardId === cardId);
    expect(index).toBeGreaterThanOrEqual(0);
    const params = { setId, cards, random: () => (index + 0.5) / candidates.length, hit: BoxHit.SECRET_RARE.value };
    const pack = drawBoosterPack(params);
    expect(pack).toEqual(drawBoosterPack(params));
    expect(pack).toHaveLength(12);
    const target = pack.find((card) => card.cardId === cardId)!;
    expect(target).toMatchObject({ cardId, artId, rarity });
    expect(getCardArts(cardId)).toContainEqual({ artId, imageId: artId, label });
    const filler = pack.filter((card) => card.cardId !== cardId && !card.kinds.includes(CardKind.DigiEgg));
    expect(filler.length).toBeGreaterThan(0);
    const pool = [target, ...Array.from({ length: 39 }, (_, position) => filler[position % filler.length]!)];
    const mainDeck = pool.map((card) => card.artId ?? card.cardId);
    expect(validateSealedDeck({ pool, mainDeck, eggDeck: [] })).toMatchObject({ ok: true, mainDeckArts: mainDeck });
    expect(validateSealedDeck({ pool, mainDeck: [cardId, ...mainDeck.slice(1)], eggDeck: [] })).toEqual({
      ok: false,
      reason: "sealed_card_not_owned",
    });
  },
);

it("preserves existing ordinary-mode art label indexes", () => {
  expect(arts.cards["BT1-084"]).toContainEqual(["_P3", 66]);
  for (const cardId of ["BT14-014", "BT14-026", "BT14-037", "BT14-049"] as const) {
    expect(arts.cards[cardId]).toContainEqual(["_P2", 184]);
  }
  expect(arts.cards["BT3-103"]).toContainEqual(["_P2", 6]);
});
