import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { getEffectModule } from "../../engine/effects/registry.js";
import { compiled } from "./BT11-048.js";
describe("BT11-048 ModokiBetamon", () => {
  it("maps and registers the effectless green rookie", () => {
    expect(getCardDefinition("BT11-048")).toMatchObject({ cardId: "BT11-048", colors: ["Green"], level: 3, playCost: 3, dp: 4000, types: ["Amphibian"] });
    expect(compiled).toEqual({ effects: [], coverage: "full", residual: [] });
    expect(getEffectModule("BT11-048")).toBeDefined();
  });
});
