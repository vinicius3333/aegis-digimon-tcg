import { describe, expect, it } from "vitest";
import { compiled as BT24_068 } from "./BT24-068.js";
import "../index.js";

describe("BT24-068 DemiDevimon", () => {
  it("reveals both printed trait categories, bottoms the rest, then trashes a hand card", () => {
    const onPlay = BT24_068.effects?.find((entry) => entry.trigger === "OnPlay");
    expect(onPlay?.actions?.[0]).toMatchObject({
      kind: "RevealAdd",
      revealCount: 3,
      add: [
        { filter: { nameOrTrait: [{ tokens: ["Evil", "Fallen Angel"], match: "trait" }] }, count: 1, to: "hand" },
        { filter: { nameOrTrait: [{ tokens: ["Seven Great Demon Lords"], match: "trait" }] }, count: 1, to: "hand" },
      ],
      rest: "deckBottom",
    });
    expect(onPlay?.actions?.[1]).toMatchObject({
      kind: "Trash",
      target: { filter: { controller: "mine", zone: "hand" }, count: 1 },
    });
  });
});
