import { describe, expect, it } from "vitest";
import { compiled } from "./EX6-004.js";

describe("EX6-004 Kokomon", () => {
  it("inherits a once-per-turn effect-suspension trigger that gives one of your Digimon +2000 DP", () => {
    expect(compiled.effects?.[0]).toMatchObject({
      trigger: "YourTurn",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "SubTrigger",
          event: "whenEffectSuspends",
          sourceFilter: { kind: ["Digimon"] },
          bySourceController: "mine",
          actions: [
            {
              kind: "ModifyDP",
              amount: 2000,
              duration: "forTheTurn",
              target: { count: 1, isSelf: true, filter: { isSelfRef: true } },
            },
          ],
        },
      ],
    });
  });
});
