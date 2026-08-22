import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";

describe("BT19-031 Shoutmon", () => {
  it("preserves Decoy, under-Tamer ShootingStarmon play, trash material placement, and inherited DP reduction", () => {
    const card = runtimeCompiledCard("BT19-031");
    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.effects).toMatchObject([
      { trigger: "Static", keywords: [{ keyword: "Decoy" }] },
      {
        trigger: "OnDeletion",
        actions: [
          {
            kind: "PlayWithoutCost",
            payCost: false,
            optional: true,
            abortOnDecline: true,
            target: {
              filter: {
                zone: "digivolutionCards",
                hostFilter: { kind: ["Tamer"] },
                nameOrTrait: [{ tokens: ["ShootingStarmon"], match: "name" }],
              },
            },
          },
          {
            kind: "PlaceUnder",
            position: "bottom",
            target: {
              filter: { zone: "trash", controller: "mine", nameOrTrait: [{ tokens: ["Starmons"], match: "name" }] },
            },
            underFilter: { controller: "mine", nameOrTrait: [{ tokens: ["ShootingStarmon"], match: "name" }] },
          },
          {
            kind: "PlaceUnder",
            position: "bottom",
            target: {
              filter: { zone: "trash", controller: "mine", nameOrTrait: [{ tokens: ["Pickmons"], match: "name" }] },
            },
          },
        ],
      },
      {
        trigger: "WhenAttacking",
        isInherited: true,
        frequency: "OncePerTurn",
        actions: [{ kind: "ModifyDP", amount: -2000, duration: "forTheTurn", condition: { kind: "selfHasTrait" } }],
      },
    ]);
  });

  it("plays ShootingStarmon from under a Tamer and places available trash materials underneath it", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT19-079", as: "tamer", under: [{ card: "BT19-035", as: "shooting" }] },
            { card: "BT19-031", as: "starmons" },
          ],
          trash: ["BT19-031", "BT19-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );

    await s.ready();
    await advance(s.engine).verb.deletePermanent([s.perm("starmons").permanentId]);
    await settle(() => s.state.players[0]?.battleArea.some((perm) => perm.topCard?.cardId === "BT19-035") ?? false);

    const played = s.state.players[0]?.battleArea.find((perm) => perm.topCard?.cardId === "BT19-035");
    expect(played?.stack.map((card) => card.cardId)).toEqual(["BT19-035", "BT19-031", "BT19-001"]);
    expect(s.state.players[0]?.trash.map((card) => card.cardId)).toEqual([]);
    expect(s.perm("tamer").stack.map((card) => card.cardId)).toEqual(["BT19-079"]);
  });
});
