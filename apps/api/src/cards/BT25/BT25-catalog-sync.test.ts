import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { CompiledEffects } from "@aegis/shared";
import { compiled as bt25099 } from "./BT25-099.js";
import { compiled as bt25102 } from "./BT25-102.js";

const effectsPath = fileURLToPath(
  new URL("../../../../../packages/shared/src/effects/effects.json", import.meta.url),
);
const catalog = JSON.parse(readFileSync(effectsPath, "utf8")) as CompiledEffects;

describe("BT25 persisted IR", () => {
  it.each([
    ["BT25-099", bt25099],
    ["BT25-102", bt25102],
  ] as const)("keeps %s synchronized with its authoritative module", (cardId, compiled) => {
    expect(catalog[cardId]).toEqual(compiled);
    expect(catalog[cardId]?.coverage).toBe("full");
    expect(catalog[cardId]?.residual).toEqual([]);
  });
});
