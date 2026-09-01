import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { runtimeCompiledCard } from "../../engine/effects/interpreter.js";
import "../index.js";

describe("BT19-099 The Wicked God Descends!", () => {
  it("revives a Composite Digimon from trash through a public Option play", async () => {
    const s = setupEngine(
      { 0: { hand: [{ card: "BT19-099", as: "option" }], trash: ["BT19-070"], battleArea: [{ card: "BT19-067" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    s.state.memory = 10;
    await s.ready();
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("option").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT19-070"));
    expect(s.state.players[0]!.battleArea.some((perm) => perm.topCard?.cardId === "BT19-070")).toBe(true);
  });

  it("preserves Composite revival, single-Millenniummon Delay binding, relative Wicked God cost, and Security placement", () => {
    const card = runtimeCompiledCard("BT19-099");

    expect(card).toMatchObject({ coverage: "full", residual: [] });
    expect(card?.effects).toMatchObject([
      {
        trigger: "Main",
        actions: [
          {
            kind: "PlayFromZone",
            target: {
              filter: {
                controller: "mine",
                kind: ["Digimon"],
                nameOrTrait: [{ tokens: ["Composite"], match: "trait" }],
              },
              count: 1,
            },
            from: ["trash"],
            costReduction: 4,
            optional: true,
          },
          { kind: "PlaceInBattleAreaSelf" },
        ],
      },
      {
        trigger: "AllTurns",
        keywords: [{ keyword: "Delay", raw: "＜Delay＞" }],
        actions: [
          {
            kind: "SubTrigger",
            event: "whenDigimonWouldLeave",
            sourceFilter: {
              controller: "mine",
              kind: ["Digimon"],
              nameOrTrait: [{ tokens: ["Millenniummon"], match: "name" }],
            },
            pickOne: true,
            actions: [
              {
                kind: "PlayFromZone",
                target: {
                  filter: {
                    controller: "mine",
                    kind: ["Digimon"],
                    nameOrTrait: [{ tokens: ["Wicked God"], match: "trait" }],
                    playCost: { op: "eq", relativeToLeavingDigimon: 1 },
                  },
                  count: 1,
                },
                from: ["hand", "trash"],
                payCost: false,
                optional: true,
              },
            ],
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
