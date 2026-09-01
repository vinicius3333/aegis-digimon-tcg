import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";

describe("BT19-097 Bonds of True Love", () => {
  it("trashes two deck cards and places itself through a public Option play", async () => {
    const s = setupEngine({
      0: {
        hand: [{ card: "BT19-097", as: "option" }],
        deck: ["BT1-009", "BT1-009"],
        battleArea: [{ card: "BT19-067" }],
      },
    });
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT19-097"));
    expect(s.state.players[0]!.trash).toHaveLength(2);
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT19-097")).toBe(true);
  });

  it("preserves direct deck-trash placement, Main mill placement, gated Delay, and Security placement", () => {
    const card = runtimeCompiledCard("BT19-097");

    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.effects).toMatchObject([
      {
        trigger: "AllTurns",
        actions: [
          {
            kind: "SubTrigger",
            event: "whenTrashedFromDeck",
            sourceFilter: { isSelfRef: true },
            actions: [{ kind: "PlaceInBattleAreaSelf" }],
            optional: true,
          },
        ],
      },
      {
        trigger: "Main",
        actions: [{ kind: "TrashTopDeck", controller: "mine", amount: 2 }, { kind: "PlaceInBattleAreaSelf" }],
      },
      {
        trigger: "StartOfYourTurn",
        condition: {
          kind: "youHaveNone",
          filter: { controllerDefault: "mine", kind: ["Digimon"] },
        },
        keywords: [{ keyword: "Delay", raw: "＜Delay＞" }],
        actions: [
          {
            kind: "PlayWithoutCost",
            target: {
              filter: { controller: "mine", nameOrTrait: [{ tokens: ["Impmon"], match: "name" }] },
              count: 1,
            },
            from: ["trash"],
            payCost: false,
            optional: true,
          },
        ],
      },
      {
        trigger: "Security",
        isSecurity: true,
        actions: [{ kind: "PlaceInBattleAreaSelf" }],
      },
    ]);
  });
});
