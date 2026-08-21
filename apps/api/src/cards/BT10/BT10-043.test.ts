import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import "./BT10-043.js";
describe("BT10-043 Mushroomon", () =>
  it("has printed vanilla data", () => {
    const d = getCardDefinition("BT10-043")!;
    expect([d.colors, d.level, d.playCost, d.dp, d.effectText]).toEqual([["Green"], 3, 2, 3000, undefined]);
  }));
