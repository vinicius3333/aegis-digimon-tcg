import { describe, expect, it } from "vitest";
import { compiled } from "./BT13-072.js";
import { setupEngine } from "../../engine/testkit/harness.js";

describe("BT13-072 DoruGreymon", () => {
  it("places an X Antibody reveal under itself and grants conditional DP immunity", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    expect(compiled.effects[0]).toMatchObject({
      trigger: "WhenDigivolving",
      actions: [
        {
          kind: "RevealAdd",
          revealCount: 3,
          add: [
            {
              filter: { controllerDefault: "mine", nameOrTrait: [{ match: "trait", tokens: ["X Antibody"] }] },
              count: 1,
              to: "placeUnder",
            },
          ],
          rest: "trash",
        },
        {
          kind: "Restrict",
          target: { filter: { isSelfRef: true }, count: 1, isSelf: true },
          restriction: "dpImmune",
          duration: "untilOpponentTurnEnd",
          condition: { kind: "ifThisEffectActed" },
        },
      ],
    });
    expect(compiled.effects[1]).toMatchObject({
      trigger: "EndOfYourTurn",
      isInherited: true,
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "PlaceUnder",
          target: {
            filter: {
              zone: "hand",
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [{ match: "trait", tokens: ["X Antibody"] }],
            },
            count: 1,
            from: ["hand"],
          },
          optional: true,
        },
      ],
    });
  });

  it("loads the compiled DoruGreymon implementation into a live permanent", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT13-072", as: "doru" }] } });
    await s.ready();
    expect(s.perm("doru").topCard?.cardId).toBe("BT13-072");
  });
});
