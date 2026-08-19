import { describe, expect, it } from "vitest";
import { compiled } from "./BT23-007.js";

describe("BT23-007 Musclemon", () => {
  it("plays itself without cost at the end of its security battle", () => {
    const effect = compiled.effects.find((entry) => entry.trigger === "Security");

    expect(effect).toMatchObject({ trigger: "Security", timing: "endOfBattle" });
    expect(effect?.actions).toEqual([
      {
        kind: "PlayWithoutCost",
        target: {
          filter: { isSelfRef: true },
          count: 1,
          isSelf: true,
        },
        payCost: false,
      },
    ]);
  });
});
