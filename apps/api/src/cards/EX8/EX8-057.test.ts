import { describe, expect, it } from "vitest";
import { compiled } from "./EX8-057.js";

describe("EX8-057", () => {
  it("reveals 3 for an NSo and Fallen Angel card", () =>
    expect(compiled.effects?.find((entry) => entry.trigger === "OnPlay")?.actions[0]).toMatchObject({
      kind: "RevealAdd",
      revealCount: 3,
      add: [
        { count: 1, to: "hand" },
        { count: 1, to: "hand" },
      ],
      rest: "deckBottom",
    }));
  it("contains only the printed on-play effect", () => expect(compiled.effects).toHaveLength(1));
});
