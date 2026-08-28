import { describe, expect, it } from "vitest";
import { compiled } from "./EX5-006.js";

describe("EX5-006 Xiaomon", () => {
  it("draws once per turn when one of your Digimon is played", () => {
    expect(compiled.effects?.find((entry) => entry.trigger === "YourTurn")).toMatchObject({
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenPlayed",
          sourceFilter: { controller: "mine", byEffect: true, kind: ["Digimon"] },
          actions: [{ kind: "Draw", controller: "mine", amount: 1 }],
        },
      ],
    });
  });
});
