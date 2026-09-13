import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import { compiled } from "./BT11-003.js";
import "../BT1/BT1-060.js";

const HOST_CARD = "BT1-045";

describe("BT11-003 Tokomon", () => {
  it("matches the catalog and carries the complete inherited contract", () => {
    expect(getCardDefinition("BT11-003")).toMatchObject({
      cardId: "BT11-003",
      nameEn: "Tokomon",
      colors: ["Yellow"],
      kinds: ["DigiEgg"],
      level: 2,
      forms: ["In-Training"],
      types: ["Lesser"],
      inheritedEffectText:
        "[Your Turn][Once Per Turn] When you play a Digimon with [Angel], [Archangel], or [Fallen Angel] in its traits, ＜Draw 1＞. (Draw 1 card from your deck.)",
    });
    expect(compiled).toEqual({
      effects: [
        {
          trigger: "YourTurn",
          actions: [
            {
              kind: "SubTrigger",
              event: "whenPlayed",
              sourceFilter: {
                controllerDefault: "mine",
                kind: ["Digimon"],
                nameOrTrait: [{ tokens: ["Angel", "Archangel", "Fallen Angel", "FallenAngel"], match: "trait" }],
              },
              actions: [{ kind: "Draw", controller: "mine", amount: 1 }],
            },
          ],
          isInherited: true,
          frequency: "OncePerTurn",
        },
      ],
      coverage: "full",
      residual: [],
    });
  });

  for (const [trait, cardId] of [
    ["Angel", "BT1-053"],
    ["Archangel", "BT1-060"],
    ["Fallen Angel", "BT11-080"],
  ] as const) {
    it(`draws for an exact ${trait} trait Digimon`, async () => {
      const s = setupEngine({
        0: {
          battleArea: [{ card: HOST_CARD, as: "host", under: ["BT11-003"] }],
          hand: [{ card: cardId, as: "played" }],
          // MagnaAngemon (the Archangel fixture) has [On Play] Recovery +1.
          // Keep a second card so this inherited draw is observable with the
          // complete card registry loaded, as it is in a real match.
          deck: cardId === "BT1-060" ? ["BT1-009", "BT1-009"] : ["BT1-009"],
        },
      });
      s.state.memory = 20;

      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("played").instanceId })).toEqual({
        ok: true,
      });
      await settle(() => s.state.players[0]!.deck.length === 0);

      expect(s.state.players[0]!.hand.map(({ cardId: id }) => id)).toEqual(["BT1-009"]);
    });
  }

  it("draws only once when two matching Digimon are played in the turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: HOST_CARD, as: "host", under: ["BT11-003"] }],
        hand: [
          { card: "BT1-053", as: "angel" },
          { card: "BT1-053", as: "angel2" },
          { card: "BT1-053", as: "angel3" },
          { card: "BT1-013", as: "spare" },
        ],
        deck: ["BT1-009", "BT1-010", "BT1-011", "BT1-012"],
      },
      1: { deck: Array.from({ length: 10 }, () => "BT1-009"), security: ["BT1-009", "BT1-009"] },
    });
    s.state.memory = 10;
    const firstTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);

    for (const card of ["angel", "angel2"] as const) {
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst(card).instanceId })).toEqual({ ok: true });
      await settle(() => s.state.pendingDecision === undefined);
    }

    expect(s.state.players[0]!.deck).toHaveLength(3);
    advance(s.engine).endMainPhaseIfOpen(0);
    await firstTurn;
    s.state.turnSeat = 1;
    s.state.memory = 3;
    const opponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    advance(s.engine).endMainPhaseIfOpen(1);
    await opponentTurn;
    s.state.turnSeat = 0;
    s.state.memory = 10;
    const nextTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    expect(s.state.players[0]!.deck).toHaveLength(2);
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("angel3").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.state.players[0]!.deck).toHaveLength(1);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT1-013", "BT1-009", "BT1-010", "BT1-011"]);
    advance(s.engine).endMainPhaseIfOpen(0);
    await nextTurn;
  });

  it("rejects a near-trait nonmatch", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: HOST_CARD, as: "host", under: ["BT11-003"] }],
        hand: [{ card: "BT1-009", as: "nonAngel" }],
        deck: ["BT1-009"],
      },
    });
    s.state.memory = 20;

    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("nonAngel").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision === undefined);

    expect(s.state.players[0]!.hand).toHaveLength(0);
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });
});
