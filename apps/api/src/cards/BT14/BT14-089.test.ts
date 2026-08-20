import { describe, expect, it } from "vitest";
import { compiled } from "./BT14-089.js";

describe("BT14-089", () => {
  it("deletes a 6000 DP or lower Digimon without Greymon, otherwise the lowest DP Digimon", () => {
    expect(compiled.effects?.[0]).toMatchObject({ trigger: "Main", actions: [{ kind: "Delete" }, { kind: "Delete" }] });
    expect(compiled.effects?.[0]?.actions[0]).toMatchObject({ target: { filter: { dp: { op: "lte", value: 6000 } } } });
    expect(compiled.effects?.[0]?.actions[1]).toMatchObject({ target: { filter: { superlative: "lowestDP" } } });
  });

  it("activates the main effect in security", () => {
    expect(compiled.effects?.[1]).toMatchObject({ trigger: "Security", isSecurity: true, actions: [{ kind: "ActivateMain" }] });
  });
});
