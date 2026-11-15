import { expect, it } from "vitest";
import { drawSealedPool } from "#api/sealed/drawSealedPool";
import { getSealedConfiguration } from "@aegis/shared/sealed/getSealedConfiguration";
import { listSealedProducts } from "@aegis/shared/sealed/listSealedProducts";
import { getBoosterProductPool } from "@aegis/shared/packOpening/getBoosterProductPool";
import { getCardDefinition } from "@aegis/shared/cards/registry";
import { CardKind } from "@aegis/shared/schema/enums";

it.each(listSealedProducts({ asOf: "2026-11-01" }))(
  "draws six complete implemented $value packs with injected randomness",
  (product) => {
    const configuration = getSealedConfiguration({ setId: product.value });
    const cards = getBoosterProductPool(product);
    let seed = 107;
    function random() {
      seed = (seed * 16807) % 2147483647;
      return (seed - 1) / 2147483646;
    }
    const packs = drawSealedPool({ configuration, random });
    seed = 107;
    expect(drawSealedPool({ configuration, random })).toEqual(packs);
    expect(packs.map((pack) => pack.length)).toEqual([12, 12, 12, 12, 12, 12]);
    expect(packs.flat().every((pull) => cards.some((card) => card.cardId === pull.cardId))).toBe(true);
    expect(
      packs.flat().filter((pull) => !getCardDefinition(pull.cardId)!.kinds.includes(CardKind.DigiEgg)).length,
    ).toBeGreaterThanOrEqual(40);
  },
);

it.each(["BT27", "unknown", "constructor"])("rejects forged %s configurations before generating", (setId) => {
  expect(() => drawSealedPool({ configuration: { ...getSealedConfiguration({ setId: "BT4" }), setId } })).toThrow(
    "sealed_configuration_invalid",
  );
});

it("refuses an unusable random draw without adding cards or rerolling", () => {
  let calls = 0;
  expect(() =>
    drawSealedPool({
      configuration: getSealedConfiguration({ setId: "BT26" }),
      random: () => {
        calls++;
        return 0;
      },
    }),
  ).toThrow("sealed_pool_insufficient_main");
  expect(calls).toBe(78);
});
