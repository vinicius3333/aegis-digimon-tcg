import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { getEffectModule } from "../../engine/effects/registry.js";
import { compiled } from "./BT11-051.js";
describe("BT11-051 Ogremon", () => {
  it("maps and registers the effectless green champion", () => {
    expect(getCardDefinition("BT11-051")).toMatchObject({ cardId: "BT11-051", colors: ["Green"], level: 4, playCost: 5, dp: 7000, types: ["Demon"] });
    expect(compiled).toEqual({ effects: [], coverage: "full", residual: [] });
    expect(getEffectModule("BT11-051")).toBeDefined();
  });
});
