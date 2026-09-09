import { Phase } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { compiled } from "./BT17-002.js";

describe("BT17-002 Xiaomon", () => {
  it("exports the once-per-turn inherited digivolution-play watcher", () => {
    expect(compiled.effects).toContainEqual(
      expect.objectContaining({
        trigger: "YourTurn",
        isInherited: true,
        frequency: "OncePerTurn",
        actions: [
          expect.objectContaining({
            kind: "SubTrigger",
            event: "whenPlayed",
            sourceFilter: { controller: "mine", kind: ["Digimon"], fromDigivolution: true },
            actions: [{ kind: "Draw", controller: "mine", amount: 1 }],
          }),
        ],
      }),
    );
  });

  it("Q2702: draws only once when two Digimon are played simultaneously from digivolution cards", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          {
            card: "BT6-030",
            under: [{ card: "BT1-010", as: "firstPlayed" }, { card: "BT1-011", as: "secondPlayed" }, "BT17-002"],
            as: "host",
          },
        ],
        deck: ["BT1-012", "BT1-013"],
      },
    });
    await s.ready();

    await advance(s.engine).verb.playInstances([s.inst("firstPlayed").instanceId, s.inst("secondPlayed").instanceId]);
    await settle(() => s.state.players[0]!.hand.length === 1);

    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.players[0]!.battleArea).toHaveLength(3);
    expect(s.perm("host").stack.map((card) => card.cardId)).toEqual(["BT17-002"]);
  });

  it("does not draw when a Digimon is played from the hand", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT6-030", under: ["BT17-002"], as: "host" }],
        hand: [{ card: "BT1-010", as: "played" }],
        deck: ["BT1-011"],
      },
    });
    await s.ready();

    await advance(s.engine).verb.playInstances([s.inst("played").instanceId]);

    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });

  it("does not draw a second time for a later stack play in the same turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          {
            card: "BT6-030",
            under: [{ card: "BT1-010", as: "firstPlayed" }, { card: "BT1-011", as: "secondPlayed" }, "BT17-002"],
            as: "host",
          },
        ],
        deck: ["BT1-012", "BT1-013"],
      },
    });
    await s.ready();

    await advance(s.engine).verb.playInstances([s.inst("firstPlayed").instanceId]);
    await settle(() => s.state.players[0]!.hand.length === 1);
    await advance(s.engine).verb.playInstances([s.inst("secondPlayed").instanceId]);

    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });

  it("does not draw on the opponent's turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          {
            card: "BT6-030",
            under: [{ card: "BT1-010", as: "played" }, "BT17-002"],
            as: "host",
          },
        ],
        deck: ["BT1-011"],
      },
    });
    s.state.turnSeat = 1;
    await s.ready();

    await advance(s.engine).verb.playInstances([s.inst("played").instanceId]);

    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });

  it("draws again on the next own turn after the once-per-turn use is spent", async () => {
    const s = setupEngine({
      0: {
        battleArea: [
          {
            card: "BT6-030",
            under: [
              { card: "BT1-010", as: "firstPlayed" },
              { card: "BT1-011", as: "secondPlayed" },
              { card: "BT1-012", as: "thirdPlayed" },
              "BT17-002",
            ],
            as: "host",
          },
        ],
        deck: ["BT1-013", "BT1-014", "BT1-009", "BT1-010", "BT1-011", "BT1-012"],
      },
      1: { deck: ["BT1-013", "BT1-014", "BT1-009", "BT1-010"], security: ["BT1-009", "BT1-013"] },
    });
    await s.ready();

    await advance(s.engine).verb.playInstances([s.inst("firstPlayed").instanceId]);
    await settle(() => s.state.players[0]!.hand.length === 1);
    await advance(s.engine).verb.playInstances([s.inst("secondPlayed").instanceId]);
    expect(s.state.players[0]!.hand).toHaveLength(1);

    await advance(s.engine).runTurn(0);
    s.state.turnSeat = 1;
    s.state.memory = 3;
    await advance(s.engine).runTurn(1);
    s.state.turnSeat = 0;
    s.state.memory = 3;
    expect(s.state.turnSeat).toBe(0);

    const deckBefore = s.state.players[0]!.deck.length;
    await advance(s.engine).verb.playInstances([s.inst("thirdPlayed").instanceId]);
    await settle(() => s.state.players[0]!.deck.length === deckBefore - 1);
    expect(s.state.players[0]!.deck).toHaveLength(deckBefore - 1);
    expect(s.perm("host").stack.map((card) => card.cardId)).toEqual(["BT17-002"]);
  });

  it("carries the inherited draw through the real Digi-Egg route: hatch -> digivolve -> battle area", async () => {
    // Peer/stack case. Public intents only for every zone change: `hatchEgg` puts BT17-002 in
    // the breeding area, the Blue Lv.3 BT1-028 digivolves onto it there (Lv.2 Blue, cost 0),
    // `moveFromBreeding` carries the stack to the battle area on the next own turn. Only then
    // does the inherited watcher fire, and only for a Digimon: a Tamer played out of the same
    // digivolution cards is the near-miss that must NOT draw.
    const s = setupEngine(
      {
        0: {
          eggDeck: [{ card: "BT17-002", as: "egg" }],
          hand: [
            { card: "BT1-028", as: "elecmon" },
            { card: "BT1-085", as: "peerTamer" },
            { card: "BT1-010", as: "hostFodder" },
          ],
          deck: ["BT1-013", "BT1-014", "BT1-009", "BT1-012", "BT1-013", "BT1-014"],
          security: ["BT1-009", "BT1-013"],
        },
        1: {
          deck: ["BT1-009", "BT1-013", "BT1-014", "BT1-012", "BT1-009"],
          security: ["BT1-013", "BT1-014"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true },
    );
    const loop = s.engine.startTurnLoop();

    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);
    expect(s.engine.applyIntent(0, { type: "hatchEgg" })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.cardId === "BT17-002");
    const eggInstanceId = s.state.players[0]!.breeding!.topCard!.instanceId;
    const eggPermanentId = s.state.players[0]!.breeding!.permanentId;

    await advance(s.engine).waitForMainPhase(0);
    expect(
      s.engine.applyIntent(0, {
        type: "digivolve",
        permanentId: eggPermanentId,
        instanceId: s.inst("elecmon").instanceId,
      }),
    ).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.breeding?.topCard?.cardId === "BT1-028");
    expect(s.state.players[0]!.breeding!.stack.map(({ instanceId }) => instanceId)).toEqual([eggInstanceId]);

    advance(s.engine).endMainPhaseIfOpen(0);
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);

    await settle(() => s.state.phase === Phase.Breeding && s.state.turnSeat === 0);
    expect(s.engine.applyIntent(0, { type: "moveFromBreeding", permanentId: eggPermanentId })).toEqual({ ok: true });
    await settle(() => s.state.players[0]!.battleArea.length === 1);
    const carrier = s.state.players[0]!.battleArea[0]!;
    expect(carrier.topCard!.cardId).toBe("BT1-028");
    expect(carrier.stack.map(({ instanceId }) => instanceId)).toEqual([eggInstanceId]);

    await advance(s.engine).waitForMainPhase(0);
    s.state.memory = 5;

    // Near-miss card kind: a Tamer played out of the same digivolution cards is not "one of
    // your Digimon", so the watcher stays silent.
    await advance(s.engine).verb.placeUnder(carrier.permanentId, [s.inst("peerTamer").instanceId]);
    const deckBeforeTamer = s.state.players[0]!.deck.length;
    await advance(s.engine).verb.playInstances([s.inst("peerTamer").instanceId]);
    expect(s.state.players[0]!.deck).toHaveLength(deckBeforeTamer);

    // A Digimon from the same digivolution cards: the watcher fires from under BT1-028 once.
    await advance(s.engine).verb.placeUnder(carrier.permanentId, [s.inst("hostFodder").instanceId]);
    const deckBeforeHost = s.state.players[0]!.deck.length;
    await advance(s.engine).verb.playInstances([s.inst("hostFodder").instanceId]);
    await settle(() => s.state.players[0]!.deck.length === deckBeforeHost - 1);
    expect(s.state.players[0]!.deck).toHaveLength(deckBeforeHost - 1);
    expect(carrier.stack.map(({ cardId }) => cardId)).toEqual(["BT17-002"]);

    expect(s.state.pendingDecision).toBeUndefined();
    expect(s.engine.applyIntent(0, { type: "surrender" })).toEqual({ ok: true });
    await loop;
  });
});
