import { describe, expect, it } from "vitest";
import { compiled } from "./BT23-003.js";

describe("BT23-003 Motimon", () => {
  it("once per turn may attack when a friendly CS Option enters the battle area", () => {
    const effect = compiled.effects.find((entry) => entry.isInherited);

    expect(effect).toMatchObject({
      trigger: "YourTurn",
      frequency: "OncePerTurn",
      isInherited: true,
    });
    expect(effect?.actions).toEqual([
      {
        kind: "SubTrigger",
        event: "whenOptionPlayed",
        sourceFilter: {
          controller: "mine",
          kind: ["Option"],
          nameOrTrait: [{ tokens: ["CS"], match: "trait" }],
        },
        actions: [
          {
            kind: "Attack",
            target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
            withoutSuspending: false,
            optional: true,
          },
        ],
      },
    ]);
  });
});
