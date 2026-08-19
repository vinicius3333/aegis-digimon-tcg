import { describe, expect, it } from "vitest";
import { compiled } from "./BT22-053.js";

describe("BT22-053 Keramon", () => {
  it("reveals three cards and adds Arata plus an Unidentified or CS card", () => {
    const onPlay = compiled.effects.find((entry) => entry.trigger === "OnPlay");
    expect(onPlay?.actions[0]).toMatchObject({
      kind: "RevealAdd",
      revealCount: 3,
      add: [
        { filter: { nameOrTrait: [{ tokens: ["Arata Sanada"], match: "name" }] }, count: 1, to: "hand" },
        { filter: { nameOrTrait: [{ tokens: ["Unidentified", "CS"], match: "trait" }] }, count: 1, to: "hand" },
      ],
      rest: "deckBottom",
    });
  });

  it("anchors inherited leave prevention to this Digimon and deletes another Diaboromon", () => {
    const inherited = compiled.effects.find((entry) => entry.isInherited);
    expect(inherited).toMatchObject({
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          sourceFilter: { isSelfRef: true },
          actions: [
            {
              kind: "Prevent",
              mode: "leavePlay",
              cost: {
                kind: "deleteOwn",
                target: {
                  filter: {
                    controller: "mine",
                    excludeSelf: true,
                    nameOrTrait: [{ tokens: ["Diaboromon"], match: "name" }],
                  },
                  count: 1,
                },
              },
            },
          ],
        },
      ],
    });
  });
});
