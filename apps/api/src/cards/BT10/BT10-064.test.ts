import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import "./BT10-064.js";
describe("BT10-064 Gogmamon", () =>
  it("has printed vanilla data", () => {
    const d = getCardDefinition("BT10-064")!;
    expect([d.colors, d.level, d.playCost, d.dp, d.effectText]).toEqual([["Black"], 5, 5, 8000, undefined]);
  }));
