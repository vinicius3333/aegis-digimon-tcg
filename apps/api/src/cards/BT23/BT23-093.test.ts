import { describe, expect, it } from "vitest";
import { compiled } from "./BT23-093.js";

describe("BT23-093 Big Bang Punch", () => {
  it("links an Appmon card from hand to the suspending Appmon Digimon", () => {
    const delay = compiled.effects.find((effect) =>
      effect.keywords?.some((keyword) => keyword.keyword === "Delay"),
    ) as any;
    const link = delay.actions[0].actions[0];
    expect(link).toMatchObject({ kind: "Link", from: ["hand"], optional: true });
    expect(link.target.filter.nameOrTrait).toEqual([{ tokens: ["Appmon"], match: "trait" }]);
    expect(link.recipient).toMatchObject({ filter: { isTriggerSource: true }, isSelf: true });
    expect(link.linkCardFilter).toBeUndefined();
  });
});
