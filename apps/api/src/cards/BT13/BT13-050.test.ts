import { describe, expect, it } from "vitest";
import { compiled } from "./BT13-050.js";
import { setupEngine } from "../../engine/testkit/harness.js";

describe("BT13-050 Sunflowmon", () => {
  it("charges suspension for the Fairy digivolution and reduces its cost by two", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "Main",
      actions: [
        {
          kind: "Digivolve",
          from: ["hand"],
          optional: true,
          abortOnDecline: true,
          target: { filter: { controller: "mine", kind: ["Digimon"] }, count: 1 },
          into: { controllerDefault: "mine", kind: ["Digimon"], nameOrTrait: [{ match: "trait", tokens: ["Fairy"] }] },
          cost: { kind: "suspend", target: { filter: { isSelfRef: true }, count: 1, isSelf: true } },
        },
        {
          kind: "Replacement",
          event: "wouldDigivolve",
          sourceFilter: { isSelfRef: true },
          actions: [{ mode: "reduceCost", amount: 2 }],
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

  it("loads the compiled Sunflowmon implementation into a live permanent", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT13-050", as: "sunflow" }] } });
    await s.ready();
    expect(s.perm("sunflow").topCard?.cardId).toBe("BT13-050");
  });
});
