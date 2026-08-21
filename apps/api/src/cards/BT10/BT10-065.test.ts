import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import "./BT10-065.js";
describe("BT10-065 Assaultmon", () =>
  it("has printed vanilla data", () => {
    const d = getCardDefinition("BT10-065")!;
    expect([d.colors, d.level, d.playCost, d.dp, d.effectText]).toEqual([["Black"], 5, 7, 10000, undefined]);
  }));
