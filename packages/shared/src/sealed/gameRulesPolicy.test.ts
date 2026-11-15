import { expect, it } from "vitest";
import { $numFields } from "@colyseus/schema";
import { GameState } from "#shared/schema/GameState";
import { GameRulesPolicy } from "#shared/sealed/GameRulesPolicy";
import { validateSealedDeckShape } from "#shared/sealed/validateSealedDeckShape";

it("appends the policy after existing synchronized fields without changing their wire indices", () => {
  const metadata = (GameState as unknown as Record<symbol, Record<PropertyKey, unknown>>)[Symbol.metadata]!;
  const last = metadata[$numFields as unknown as PropertyKey] as number;
  expect(metadata[last]).toMatchObject({ name: "rulesPolicy" });
  expect(metadata[last - 1]).toMatchObject({ name: "guestApproval" });
});

it("defaults policy-absent state hydration to constructed and preserves explicit sealed policy", () => {
  expect(Object.assign(new GameState(), { format: "standard" }).rulesPolicy).toBe(GameRulesPolicy.CONSTRUCTED.value);
  expect(Object.assign(new GameState(), { rulesPolicy: GameRulesPolicy.SEALED.value }).rulesPolicy).toBe("sealed-v1");
});

it("validates forty-card sealed shape without constructed copy limits or product dependencies", () => {
  const deck = { mainDeck: Array<string>(40).fill("BT1-009"), eggDeck: [] as string[] };
  expect(validateSealedDeckShape(deck)).toEqual({ ok: true });
  expect(validateSealedDeckShape({ ...deck, mainDeck: deck.mainDeck.slice(1) })).toMatchObject({ ok: false });
  expect(validateSealedDeckShape({ ...deck, eggDeck: Array<string>(6).fill("BT1-001") })).toMatchObject({ ok: false });
  expect(validateSealedDeckShape({ ...deck, eggDeck: ["BT1-009"] })).toMatchObject({ ok: false });
  expect(validateSealedDeckShape({ ...deck, mainDeck: Array<string>(40).fill("BT1-001") })).toMatchObject({
    ok: false,
  });
  expect(validateSealedDeckShape({ ...deck, mainDeck: Array<string>(40).fill("missing-card") })).toMatchObject({
    ok: false,
  });
});
