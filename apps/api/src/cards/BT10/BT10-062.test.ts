import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import "./BT10-062.js";
describe("BT10-062 Golemon", () =>
  it("has printed vanilla data", () => {
    const d = getCardDefinition("BT10-062")!;
    expect([d.colors, d.level, d.playCost, d.dp, d.effectText]).toEqual([["Black"], 4, 5, 5000, undefined]);
  }));
