import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import "./BT10-055.js";
describe("BT10-055 Gryphonmon", () =>
  it("has printed vanilla data", () => {
    const d = getCardDefinition("BT10-055")!;
    expect([d.colors, d.level, d.playCost, d.dp, d.effectText]).toEqual([["Green", "Yellow"], 6, 10, 13000, undefined]);
  }));
