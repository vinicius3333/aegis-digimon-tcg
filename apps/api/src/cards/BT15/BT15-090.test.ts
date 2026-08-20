import { describe, expect, it } from "vitest";
import { compiled } from "./BT15-090.js";

describe("BT15-090", () => {
  it("returns an opposing level 4 or lower Digimon and optionally the lowest-level one with Gabumon/Garurumon", () => {
    expect(compiled.effects?.[0]?.actions[0]).toMatchObject({ kind: "Return", to: "hand", target: { filter: { levelComparison: { op: "lte", value: 4 } } } });
    expect(compiled.effects?.[0]?.actions[1]).toMatchObject({ kind: "Return", to: "hand", target: { filter: { superlative: "lowestLevel" } }, condition: { kind: "youHave" } });
  });
  it("activates its main effect in security", () => expect(compiled.effects?.[1]).toMatchObject({ trigger: "Security", isSecurity: true, actions: [{ kind: "ActivateMain" }] }));
});
