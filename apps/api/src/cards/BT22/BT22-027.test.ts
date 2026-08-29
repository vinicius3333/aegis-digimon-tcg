import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { settle, setupEngine } from "../../engine/testkit/harness.js";
import { observe } from "../../engine/testkit/observe.js";
import { compiled } from "./BT22-027.js";

describe("BT22-027 Ryugumon", () => {
  it("requires the bottom-stack placement cost and reacts once per turn to added digivolution cards", () => {
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "Static",
        keywords: [{ keyword: "Decode", raw: "＜Decode (Lv.5 w/[Aqua]/[Sea Animal] in any trait)＞" }],
      }),
    );
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "AllTurns",
        actions: [
          {
            kind: "Replacement",
            event: "wouldLeavePlay",
            leaveCause: "otherThanBattle",
            sourceFilter: { isSelfRef: true },
            actions: [
              {
                kind: "PlayWithoutCost",
                fromOwnDigivolutionStack: true,
                payCost: false,
                playedByDecode: true,
                optional: true,
                target: {
                  filter: {
                    controller: "mine",
                    kind: ["Digimon"],
                    levelComparison: { op: "eq", value: 5 },
                    nameOrTrait: [{ tokens: ["Aqua", "Sea Animal"], match: "traitContains" }],
                  },
                  count: 1,
                },
              },
            ],
          },
        ],
      }),
    );
    for (const trigger of ["OnPlay", "WhenDigivolving"]) {
      const effect = compiled.effects.find((entry) => entry.trigger === trigger);
      expect(effect?.actions[0]).toMatchObject({
        kind: "Restrict",
        restriction: "suspend",
        duration: "untilOpponentTurnEnd",
        optional: true,
        abortOnDecline: true,
        target: { filter: { controller: "opponent", kind: ["Digimon", "Tamer"] }, count: 1 },
        cost: { kind: "place", destination: "digivolutionStack", position: "bottom", host: "self" },
      });
    }
    const allTurns = compiled.effects.find((entry) => entry.trigger === "AllTurns");
    expect(allTurns).toMatchObject({ frequency: "OncePerTurn" });
    expect(allTurns?.actions[0]).toMatchObject({
      kind: "SubTrigger",
      event: "onAddDigivolutionCards",
      sourceFilter: { isSelfRef: true },
      actions: [
        {
          kind: "Return",
          to: "deckBottom",
          target: {
            filter: { controller: "opponent", kind: ["Digimon"], levelComparison: { op: "lte", value: 5 } },
            count: 1,
          },
        },
      ],
    });
  });

  it("pays with an Aquatic level 5, restricts a Tamer, and returns one level-5 Digimon when the source is added", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT22-027", as: "ryugumon" }],
          hand: [
            { card: "BT22-024", as: "aquaticCost" },
            { card: "BT22-027", as: "invalidLevel6" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT22-085", as: "tamer" },
            { card: "BT22-023", as: "firstLevel5" },
            { card: "BT22-023", as: "secondLevel5" },
          ],
          deck: ["BT1-001"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const tamerId = s.perm("tamer").permanentId;

    await advance(s.engine).fire(EffectTiming.OnPlay, s.perm("ryugumon"));
    await settle(() => observe(s.engine).isRestricted(tamerId, "suspend"));

    expect(s.perm("ryugumon").stack[0]?.cardId).toBe("BT22-024");
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("invalidLevel6").instanceId]);
    expect(observe(s.engine).isRestricted(tamerId, "suspend")).toBe(true);
    expect(s.state.players[1]!.deck.at(-1)?.cardId).toBe("BT22-023");
    expect(s.state.players[1]!.battleArea.filter((permanent) => permanent.topCard?.cardId === "BT22-023")).toHaveLength(
      1,
    );
  });

  it("does nothing when no level-5-or-lower Aqua or Sea Animal hand card can pay the cost", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT22-027", as: "ryugumon" }],
          hand: [{ card: "BT22-027", as: "invalidLevel6" }],
        },
        1: { battleArea: [{ card: "BT22-085", as: "tamer" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const tamerId = s.perm("tamer").permanentId;

    await advance(s.engine).fire(EffectTiming.WhenDigivolving, s.perm("ryugumon"));

    expect(s.perm("ryugumon").stack).toHaveLength(0);
    expect(observe(s.engine).isRestricted(tamerId, "suspend")).toBe(false);
  });

  it("returns at most one opposing level-5 Digimon per turn for repeated source additions", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "BT22-027", as: "ryugumon" }],
          hand: [
            { card: "BT22-021", as: "firstSource" },
            { card: "BT22-021", as: "secondSource" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT22-023", as: "firstTarget" },
            { card: "BT22-023", as: "secondTarget" },
          ],
        },
      },
      { autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).verb.placeUnder(s.perm("ryugumon").permanentId, [s.inst("firstSource").instanceId]);
    await settle(() => s.state.players[1]!.battleArea.length === 1);
    await advance(s.engine).verb.placeUnder(s.perm("ryugumon").permanentId, [s.inst("secondSource").instanceId]);
    await settle();

    expect(s.state.players[1]!.battleArea).toHaveLength(1);
    expect(s.state.players[1]!.deck).toHaveLength(1);
  });

  it("executes Decode from its own stack on a non-battle leave", async () => {
    const s = setupEngine(
      { 0: { battleArea: [{ card: "BT22-027", under: ["BT22-024"], as: "host" }] } },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    expect(await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId], "byEffect")).toBe(1);
    await settle(() => s.state.players[0]!.battleArea.some((permanent) => permanent.topCard?.cardId === "BT22-024"));

    expect(s.state.players[0]!.battleArea.map((permanent) => permanent.topCard?.cardId)).toEqual(["BT22-024"]);
  });
});
