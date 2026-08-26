import { describe, expect, it } from "vitest";
import { compiled } from "./BT15-090.js";

describe("BT15-090", () => {
  it("uses exactly one return branch, replacing the level gate with lowest level when qualified", () => {
    expect(compiled.effects?.[0]?.actions[0]).toMatchObject({
      kind: "ConditionalBranch",
      condition: { kind: "youHave" },
      ifTrue: [{ kind: "Return", target: { filter: { superlative: "lowestLevel" } } }],
      ifFalse: [{ kind: "Return", target: { filter: { levelComparison: { op: "lte", value: 4 } } } }],
    });
  });
  it("activates its main effect in security", () =>
    expect(compiled.effects?.[1]).toMatchObject({
      trigger: "Security",
      isSecurity: true,
      actions: [{ kind: "ActivateMain" }],
    }));
});
