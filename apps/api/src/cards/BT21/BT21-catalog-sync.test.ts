import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, it } from "vitest";
import type { CompiledEffects } from "@aegis/shared";
import { compiled as bt21093 } from "./BT21-093.js";
import { compiled as bt21094 } from "./BT21-094.js";
import { compiled as bt21097 } from "./BT21-097.js";

const effectsPath = fileURLToPath(new URL("../../../../../packages/shared/src/effects/effects.json", import.meta.url));
const catalog = JSON.parse(readFileSync(effectsPath, "utf8")) as CompiledEffects;

describe("BT21 persisted IR", () => {
  it.each([
    ["BT21-093", bt21093],
    ["BT21-094", bt21094],
    ["BT21-097", bt21097],
  ] as const)("keeps %s synchronized with its authoritative module", (cardId, compiled) => {
    expect(catalog[cardId]).toEqual(compiled);
    expect(catalog[cardId]?.coverage).toBe("full");
    expect(catalog[cardId]?.residual).toEqual([]);
  });
});
