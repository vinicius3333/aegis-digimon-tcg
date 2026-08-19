import { describe, expect, it } from "vitest";
import { compiled } from "./BT23-010.js";

describe("BT23-010 GeoGreymon", () => {
  it("plays itself at the end of the security battle", () => {
    const security = compiled.effects.find((entry) => entry.trigger === "Security") as any;
    expect(security).toMatchObject({
      timing: "endOfBattle",
      actions: [
        { kind: "PlayWithoutCost", target: { filter: { isSelfRef: true }, count: 1, isSelf: true }, payCost: false },
      ],
    });
  });

  it("declares Raid and Blocker without an inherited duplicate", () => {
    const statics = compiled.effects.filter((entry) => entry.trigger === "Static");
    expect(statics.map((entry) => (entry as any).keywords[0].keyword)).toEqual(["Raid", "Blocker"]);
    expect(compiled.effects.some((entry) => entry.isInherited)).toBe(false);
  });
});
