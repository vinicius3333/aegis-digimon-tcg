import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import "./BT10-047.js";
describe("BT10-047 RedVegiemon", () =>
  it("has printed vanilla data", () => {
    const d = getCardDefinition("BT10-047")!;
    expect([d.colors, d.level, d.playCost, d.dp, d.effectText]).toEqual([["Green"], 4, 3, 3000, undefined]);
  }));
