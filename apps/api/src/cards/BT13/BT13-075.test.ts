import { describe, expect, it } from "vitest";
import { EffectTiming } from "@aegis/shared";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine } from "../../engine/testkit/harness.js";
import { compiled } from "./BT13-075.js";

describe("BT13-075 BT13-075", () => {
  it("has complete compiled coverage and no residual gaps", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    for (const effect of compiled.effects.slice(0, 2)) {
      expect(effect).toMatchObject({
        actions: [
          {
            kind: "Restrict",
            target: { filter: { controller: "opponent", kind: ["Digimon"], playCostGte: 10 }, count: "all" },
            restriction: "attackPlayers",
            duration: "untilOpponentTurnEnd",
            optional: false,
            cost: {
              kind: "place",
              destination: "digivolutionStack",
              position: "bottom",
              host: "self",
              target: {
                filter: {
                  zone: "trash",
                  controller: "mine",
                  kind: ["Digimon"],
                  nameOrTrait: [{ match: "trait", tokens: ["X Antibody", "Royal Knight"] }],
                },
                count: 1,
                from: ["trash"],
              },
            },
          },
        ],
      });
    }
    expect(compiled.effects[0]?.trigger).toBe("OnPlay");
    expect(compiled.effects[1]?.trigger).toBe("WhenDigivolving");
    expect(compiled.effects[2]).toMatchObject({
      trigger: "AllTurns",
      frequency: "OncePerTurn",
      actions: [
        {
          kind: "Replacement",
          event: "wouldLeavePlay",
          mode: "prevent",
          leaveCause: "otherThanYourEffect",
          sourceFilter: { isSelfRef: true },
          actions: [],
          cost: {
            kind: "return",
            to: "deckBottom",
            target: {
              filter: {
                isSelfRef: true,
                zone: "digivolutionCards",
                nameOrTrait: [{ match: "trait", tokens: ["X Antibody", "Royal Knight"] }],
              },
              count: 1,
            },
          },
        },
      ],
    });
  });

  it("loads the compiled implementation into a live permanent", async () => {
    const s = setupEngine({ 0: { battleArea: [{ card: "BT13-075", as: "card" }] } });
    await s.ready();
    expect(s.perm("card").topCard?.cardId).toBe("BT13-075");
  });

  it("places a qualifying trash card and restricts opposing high-cost Digimon", async () => {
    const s = setupEngine(
      {
        0: { battleArea: [{ card: "BT13-075", as: "alphamon" }], trash: ["BT9-055"] },
        1: { battleArea: [{ card: "BT13-077", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    await advance(s.engine).fireForPermanent(EffectTiming.OnPlay, s.perm("alphamon"));

    expect(s.perm("alphamon").stack.map((card) => card.cardId)).toContain("BT9-055");
    expect(observe(s.engine).isRestricted(s.perm("opponent"), "attackPlayers")).toBe(true);
  });

  it("returns a qualifying source to the deck and prevents an opposing effect removal", async () => {
    const s = setupEngine({
      0: { battleArea: [{ card: "BT13-075", as: "alphamon", under: ["BT9-055"] }] },
      1: { deck: ["BT1-001"] },
    });
    await s.ready();
    const hostId = s.perm("alphamon").permanentId;

    advance(s.engine).verb.enterEffectResolution(1, ["Digimon"]);
    try {
      await advance(s.engine).verb.deletePermanent([hostId], "byEffect");
    } finally {
      advance(s.engine).verb.leaveEffectResolution();
    }

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === hostId)).toBe(true);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toContain("BT9-055");
  });
});
