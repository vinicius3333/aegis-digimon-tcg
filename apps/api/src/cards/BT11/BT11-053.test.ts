import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { getEffectModule } from "../../engine/effects/registry.js";
import { compiled } from "./BT11-053.js";
describe("BT11-053 Digitamamon", () => {
  it("maps and registers the effectless green ultimate", () => {
    expect(getCardDefinition("BT11-053")).toMatchObject({ cardId: "BT11-053", colors: ["Green"], level: 5, playCost: 7, dp: 10000, types: ["Perfect"] });
    expect(compiled).toEqual({ effects: [], coverage: "full", residual: [] });
    expect(getEffectModule("BT11-053")).toBeDefined();
  });
});
