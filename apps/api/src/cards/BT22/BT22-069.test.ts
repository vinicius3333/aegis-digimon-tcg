import { describe, expect, it } from "vitest";
import { compiled } from "./BT22-069.js";

describe("BT22-069 Lunamon", () => {
  it("reveals three and adds Night Claw plus Light Fang or Galaxy", () => {
    const onPlay = compiled.effects.find((entry) => entry.trigger === "OnPlay");
    expect(onPlay?.actions[0]).toMatchObject({
      kind: "RevealAdd",
      revealCount: 3,
      add: [
        { filter: { nameOrTrait: [{ tokens: ["Night Claw"], match: "trait" }] }, count: 1, to: "hand" },
        { filter: { nameOrTrait: [{ tokens: ["Light Fang", "Galaxy"], match: "trait" }] }, count: 1, to: "hand" },
      ],
      rest: "deckBottom",
    });
  });

  it("keeps the once-per-turn inherited stack placement draw", () => {
    expect(compiled.effects.find((entry) => entry.isInherited)).toMatchObject({
      trigger: "Main",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Draw",
          amount: 1,
          optional: true,
          cost: {
            kind: "place",
            target: { filter: { nameOrTrait: [{ tokens: ["Night Claw", "Light Fang"], match: "trait" }] } },
          },
        },
      ],
    });
  });
});
