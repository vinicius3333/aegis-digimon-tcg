import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { observe } from "../../engine/testkit/observe.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT13-075.js";
import "./BT13-077.js";
import "../ST1/ST1-16.js";
import "./BT13-066.js";
import "./BT13-072.js";

describe("BT13-075 Alphamon", () => {
  it("has complete compiled coverage and no residual gaps", () => {
    expect(compiled.coverage).toBe("full");
    expect(compiled.residual).toEqual([]);
    for (const effect of compiled.effects.slice(0, 2)) {
      expect(effect).toMatchObject({
        actions: [
          {
            kind: "Restrict",
            target: { filter: { controller: "opponent", kind: ["Digimon"], playCostGte: 10 }, count: "all" },
            whileMatchesTargetFilter: true,
            restriction: "attackPlayers",
            duration: "untilOpponentTurnEnd",
            abortOnDecline: true,
            cost: {
              kind: "place",
              destination: "digivolutionStack",
              position: "bottom",
              host: "self",
              optional: true,
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
          leaveCause: "byEffect",
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
        0: { hand: [{ card: "BT13-075", as: "alphamon" }], trash: [{ card: "BT9-055", as: "source" }] },
        1: { battleArea: [{ card: "BT13-077", as: "opponent" }] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();

    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("alphamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard?.instanceId === s.inst("alphamon").instanceId,
      ),
    );
    await settle();
    expect(s.state.memory).toBe(-2);

    expect(s.perm("alphamon").stack.map((card) => card.instanceId)).toContain(s.inst("source").instanceId);
    expect(observe(s.engine).isRestricted(s.perm("opponent"), "attackPlayers")).toBe(true);
  });

  it("does not install the restriction when the optional placement cost is declined", async () => {
    const s = setupEngine(
      {
        0: { hand: [{ card: "BT13-075", as: "alphamon" }], trash: [{ card: "BT9-055", as: "source" }] },
        1: { battleArea: [{ card: "BT13-077", as: "opponent" }] },
      },
      { autoDeclineOptional: true, autoSelectCards: true },
    );
    await s.ready();

    s.state.memory = 10;
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("alphamon").instanceId })).toEqual({
      ok: true,
    });
    await settle(() =>
      s.state.players[0]!.battleArea.some(
        (permanent) => permanent.topCard?.instanceId === s.inst("alphamon").instanceId,
      ),
    );
    await settle();
    expect(s.state.memory).toBe(-2);

    expect(s.perm("alphamon").stack.map((card) => card.instanceId)).not.toContain(s.inst("source").instanceId);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("source").instanceId);
    expect(observe(s.engine).isRestricted(s.perm("opponent"), "attackPlayers")).toBe(false);
  });

  it("keeps a cost-9 opponent restricted after it digivolves into a cost-12 Digimon", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [{ card: "EX8-052", as: "alphamon" }],
          hand: [{ card: "BT13-075", as: "ownEvolution" }],
          trash: [{ card: "BT9-055", as: "placedSource" }],
          deck: [{ card: "BT1-009", as: "bonusDraw" }],
        },
        1: {
          battleArea: [{ card: "EX8-052", as: "lowCost" }],
          hand: [{ card: "BT13-075", as: "highCost" }],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: s.perm("alphamon").permanentId,
        instanceId: s.inst("ownEvolution").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("alphamon").topCard.instanceId === s.inst("ownEvolution").instanceId);
    await settle();
    expect(s.state.memory).toBe(6);
    expect(s.perm("alphamon").stack.map((card) => card.instanceId)).toContain(s.inst("alphamon").instanceId);
    expect(s.perm("alphamon").stack[0]?.instanceId).toBe(s.inst("placedSource").instanceId);
    expect(s.state.players[0]!.hand.map((card) => card.instanceId)).toEqual([s.inst("bonusDraw").instanceId]);
    expect(observe(s.engine).isRestricted(s.perm("lowCost"), "attackPlayers")).toBe(false);

    s.state.turnSeat = 1;
    s.state.memory = 10;
    expect(
      s.engine.applyIntent(1, {
        type: "digivolve",
        permanentId: s.perm("lowCost").permanentId,
        instanceId: s.inst("highCost").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.perm("lowCost").topCard?.cardId === "BT13-075");

    expect(s.perm("lowCost").topCard?.cardId).toBe("BT13-075");
    expect(observe(s.engine).isRestricted(s.perm("lowCost"), "attackPlayers")).toBe(true);
    expect(
      s.engine.applyIntent(1, {
        type: "attack",
        attackerPermanentId: s.perm("lowCost").permanentId,
        target: { kind: "player" },
      }),
    ).toMatchObject({ ok: false });
  });

  it("returns a qualifying source to the deck for a public opposing effect, then suppresses its second attempt", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT13-075",
              as: "alphamon",
              under: [
                { card: "BT13-066", as: "source" },
                { card: "BT13-072", as: "unusedSource" },
              ],
            },
          ],
          deck: ["BT1-009"],
        },
        1: {
          battleArea: [{ card: "BT1-010", as: "redSource" }],
          hand: [
            { card: "ST1-16", as: "firstGaia" },
            { card: "ST1-16", as: "secondGaia" },
          ],
          deck: ["BT1-009"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const hostId = s.perm("alphamon").permanentId;
    const firstGaiaId = s.inst("firstGaia").instanceId;
    const secondGaiaId = s.inst("secondGaia").instanceId;

    s.state.turnSeat = 1;
    s.state.memory = 10;
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: firstGaiaId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === firstGaiaId));
    await settle();

    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === hostId)).toBe(true);
    expect(s.state.players[0]!.deck.map((card) => card.cardId)).toEqual(["BT1-009", "BT13-066"]);
    expect(s.state.players[0]!.deck.at(-1)?.instanceId).toBe(s.inst("source").instanceId);

    expect(s.state.memory).toBe(2);
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: secondGaiaId })).toEqual({
      ok: true,
    });
    await settle(() => !s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === hostId));
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === hostId)).toBe(false);
    expect(s.state.memory).toBe(-6);
    expect(s.state.players[0]!.trash.map((card) => card.instanceId)).toContain(s.inst("unusedSource").instanceId);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).not.toContain(s.inst("unusedSource").instanceId);
    expect(s.state.players[1]!.trash.map((card) => card.instanceId)).toContain(secondGaiaId);
  });

  it("reuses the replacement for the same host on its next turn with another source", async () => {
    const s = setupEngine(
      {
        0: {
          battleArea: [
            {
              card: "BT13-075",
              as: "alphamon",
              under: [
                { card: "BT13-066", as: "firstSource" },
                { card: "BT13-072", as: "secondSource" },
              ],
            },
          ],
          hand: ["BT1-009"],
          deck: Array.from({ length: 8 }, () => "BT1-009"),
        },
        1: {
          battleArea: [{ card: "BT1-010", as: "redSource" }],
          hand: [
            { card: "ST1-16", as: "firstGaia" },
            { card: "ST1-16", as: "secondGaia" },
          ],
          deck: ["BT1-009", "BT1-010", "BT1-012"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await s.ready();
    const hostId = s.perm("alphamon").permanentId;
    const firstGaiaId = s.inst("firstGaia").instanceId;
    const secondGaiaId = s.inst("secondGaia").instanceId;

    s.state.turnSeat = 1;
    s.state.memory = 10;
    const firstOpponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: firstGaiaId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === firstGaiaId));
    await settle();
    expect(s.state.players[0]!.deck.at(-1)?.instanceId).toBe(s.inst("firstSource").instanceId);
    advance(s.engine).endMainPhaseIfOpen(1);
    await firstOpponentTurn;

    s.state.turnSeat = 0;
    s.state.memory = -s.state.memory;
    const ownTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    advance(s.engine).endMainPhaseIfOpen(0);
    await ownTurn;

    s.state.turnSeat = 1;
    s.state.memory = -s.state.memory;
    const beforeSecondDeck = s.state.players[0]!.deck.map((card) => card.instanceId);
    const secondOpponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: secondGaiaId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.players[1]!.trash.some((card) => card.instanceId === secondGaiaId));
    await settle();
    expect(s.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === hostId)).toBe(true);
    expect(s.state.players[0]!.deck.map((card) => card.instanceId)).toEqual([
      ...beforeSecondDeck,
      s.inst("secondSource").instanceId,
    ]);
    expect(s.state.players[0]!.deck.at(-1)?.instanceId).toBe(s.inst("secondSource").instanceId);
    advance(s.engine).endMainPhaseIfOpen(1);
    await secondOpponentTurn;
  });

  it("also prevents an own-effect removal but not a battle deletion", async () => {
    const ownEffect = setupEngine(
      {
        0: { battleArea: [{ card: "BT13-075", as: "alphamon", under: ["BT9-055"] }] },
        1: { deck: ["BT1-009"] },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    await ownEffect.ready();
    const ownHostId = ownEffect.perm("alphamon").permanentId;
    advance(ownEffect.engine).verb.enterEffectResolution(0, ["Digimon"]);
    try {
      await advance(ownEffect.engine).verb.deletePermanent([ownHostId], "byEffect");
    } finally {
      advance(ownEffect.engine).verb.leaveEffectResolution();
    }
    expect(ownEffect.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === ownHostId)).toBe(true);
    expect(ownEffect.state.players[0]!.deck.map((card) => card.cardId)).toContain("BT9-055");

    const battle = setupEngine({
      0: { battleArea: [{ card: "BT13-075", as: "alphamon", under: ["BT9-055"] }] },
      1: { deck: ["BT1-009"] },
    });
    await battle.ready();
    const battleHostId = battle.perm("alphamon").permanentId;
    await advance(battle.engine).verb.deletePermanent([battleHostId], "byBattle");
    expect(battle.state.players[0]!.battleArea.some((permanent) => permanent.permanentId === battleHostId)).toBe(false);
    expect(battle.state.players[0]!.deck.map((card) => card.cardId)).not.toContain("BT9-055");
  });
});
