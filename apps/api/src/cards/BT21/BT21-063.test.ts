import { describe, expect, it } from "vitest";
import { compiled } from "./BT21-063.js";

describe("BT21-063 Gumdramon", () => {
  it("requires trashing a Save-text or Hero card to draw two", () => {
    const onPlay = compiled.effects.find((entry) => entry.trigger === "OnPlay");
    const action = onPlay?.actions[0] as { cost?: unknown } | undefined;

    expect(action).toMatchObject({ kind: "Draw", controller: "mine", amount: 2, optional: true, abortOnDecline: true });
    expect(action?.cost).toMatchObject({
      kind: "trash",
      target: {
        filter: {
          zone: "hand",
          controller: "mine",
          keywords: ["Save"],
          nameOrTrait: [{ tokens: ["Hero"], match: "trait" }],
        },
        count: 1,
      },
    });
    expect(compiled.effects).toContainEqual({
      trigger: "OnDeletion",
      actions: [],
      keywords: [{ keyword: "Save", raw: "＜Save＞" }],
    });
  });
});
