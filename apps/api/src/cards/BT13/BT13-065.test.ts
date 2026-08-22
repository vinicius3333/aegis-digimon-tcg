import { describe, expect, it } from "vitest";
import { compiled } from "./BT13-065.js";
import { setupEngine } from "../../engine/testkit/harness.js";

describe("BT13-065 PlatinumSukamon", () => {
  it("uses De-Digivolve 1 stopping at level 3 and the inherited deletion replacement", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "OnDeletion",
      actions: [
        {
          kind: "DeDigivolve",
          target: { filter: { controller: "opponent", kind: ["Digimon"] }, count: 1 },
          amount: 1,
          stopAtLevel: 3,
        },
      ],
    });
    expect(compiled.effects[1]).toMatchObject({
      trigger: "AllTurns",
      isInherited: true,
      actions: [
        {
          kind: "Replacement",
          event: "wouldBeDeleted",
          sourceFilter: { isSelfRef: true },
          actions: [
            {
              kind: "Prevent",
              optional: true,
              abortOnDecline: true,
              cost: {
                kind: "deleteOwn",
                target: {
                  filter: {
                    controller: "mine",
                    excludeSelf: true,
                    kind: ["Digimon"],
                    nameOrTrait: [{ match: "name", tokens: ["Sukamon"] }],
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

  it("loads the compiled PlatinumSukamon implementation into a live permanent", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT13-065", as: "platinum" }] } });
    await s.ready();
    expect(s.perm("platinum").topCard?.cardId).toBe("BT13-065");
  });
});
