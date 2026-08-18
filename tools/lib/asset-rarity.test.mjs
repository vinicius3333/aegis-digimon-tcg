import assert from "node:assert/strict";
import test from "node:test";
import { LEGACY_SECRET_RARE_CARD_IDS, normalizeAssetRarity } from "./asset-rarity.mjs";

test("maps the 24 official SEC cards through BT10/EX2 without conflating UR", () => {
  assert.equal(LEGACY_SECRET_RARE_CARD_IDS.size, 24);
  assert.equal(normalizeAssetRarity("BT1-114", "UR"), "SEC");
  assert.equal(normalizeAssetRarity("BT10-112", "UR"), "SEC");
  assert.equal(normalizeAssetRarity("EX1-073", "UR"), "SEC");
  assert.equal(normalizeAssetRarity("EX2-074", "UR"), "SEC");
});

test("keeps modern UR and SEC values distinct", () => {
  assert.equal(normalizeAssetRarity("BT25-043", "UR"), "UR");
  assert.equal(normalizeAssetRarity("BT25-103", "SEC"), "SEC");
});

test("maps the audited promo cutoff to promo rarity only", () => {
  assert.equal(normalizeAssetRarity("P-001", "SEC"), "P");
  assert.equal(normalizeAssetRarity("P-077", "SEC"), "P");
  assert.equal(normalizeAssetRarity("P-078", "SEC"), "P");
});
