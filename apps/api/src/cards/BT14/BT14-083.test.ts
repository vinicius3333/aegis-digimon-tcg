import { describe, expect, it } from "vitest";
import { compiled } from "./BT14-083.js";

describe("BT14-083", () => {
  it("registers on-play trashing, opponent-source response, and security play", () => {
    expect(compiled.effects[0]?.actions[0]).toMatchObject({ kind: "TrashDigivolution", amount: 1 });
    expect(compiled.effects[1]?.actions[0]).toMatchObject({ kind: "SubTrigger", event: "onDigivolutionCardDiscarded" });
    expect(compiled.effects[2]).toMatchObject({
      isSecurity: true,
      actions: [{ kind: "PlayWithoutCost", payCost: false }],
    });
  });
});
