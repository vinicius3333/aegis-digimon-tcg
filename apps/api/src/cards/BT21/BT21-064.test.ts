import { describe, expect, it } from "vitest";
import { compiled } from "./BT21-064.js";

describe("BT21-064 Guilmon", () => {
  it("draws two after the printed Guilmon-family or Hero hand-trash cost", () => {
    const action = compiled.effects.find((entry) => entry.trigger === "OnPlay")?.actions[0] as
      | { cost?: unknown }
      | undefined;

    expect(action).toMatchObject({ kind: "Draw", controller: "mine", amount: 2, optional: true, abortOnDecline: true });
    expect(action?.cost).toMatchObject({
      kind: "trash",
      target: {
        filter: {
          zone: "hand",
          controller: "mine",
          nameOrTrait: [
            { tokens: ["Guilmon", "Growlmon", "Gallantmon", "Megidramon"], match: "name" },
            { tokens: ["Hero"], match: "trait" },
          ],
        },
        count: 1,
      },
    });
    expect(compiled.effects).toContainEqual({
      trigger: "OnDeletion",
      actions: [{ kind: "GainMemory", amount: 1 }],
      isInherited: true,
    });
  });
});
