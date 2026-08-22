import { describe, expect, it } from "vitest";
import { getCardDefinition } from "@aegis/shared";
import "./BT10-079.js";
describe("BT10-079 Sandiramon", () =>
  it("has printed vanilla data", () => {
    const d = getCardDefinition("BT10-079")!;
    expect([d.colors, d.level, d.playCost, d.dp, d.effectText]).toEqual([["Purple"], 5, 5, 6000, undefined]);
  }));
