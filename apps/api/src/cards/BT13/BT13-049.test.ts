import { describe, expect, it } from "vitest";
import { compiled } from "./BT13-049.js";
import { setupEngine } from "../../engine/testkit/harness.js";

describe("BT13-049 Lalamon", () => {
  it("searches the green trait/Yoshino pair and installs the conditional reduction", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "OnPlay",
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 3,
          rest: "deckBottom",
          add: [
            {
              count: 1,
              to: "hand",
              filter: {
                kind: ["Digimon"],
                nameOrTrait: [
                  { match: "trait", tokens: ["Vegetation", "Plant"] },
                  { match: "trait", tokens: ["Fairy"] },
                ],
              },
            },
            { count: 1, to: "hand", filter: { nameOrTrait: [{ match: "name", tokens: ["Yoshino Fujieda"] }] } },
          ],
        },
      ],
    });
    expect(compiled.effects[1]).toMatchObject({
      trigger: "YourTurn",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldDigivolve",
          sourceFilter: { isSelfRef: true },
          actions: [
            {
              mode: "reduceCost",
              amount: 1,
              condition: { kind: "youHave", filter: { kind: ["Tamer"], colors: ["Green"] } },
            },
          ],
        },
      ],
    });
  });

  it("loads the compiled Lalamon implementation into a live permanent", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT13-049", as: "lalamon" }] } });
    await s.ready();
    expect(s.perm("lalamon").topCard?.cardId).toBe("BT13-049");
  });
});
