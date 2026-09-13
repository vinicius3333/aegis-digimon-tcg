import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import { advance } from "../../engine/testkit/advance.js";
import { compiled } from "./BT11-004.js";

describe("BT11-004 Tanemon", () => {
  it("matches the catalog and carries the complete inherited contract", () => {
    expect(getCardDefinition("BT11-004")).toMatchObject({
      cardId: "BT11-004",
      nameEn: "Tanemon",
      colors: ["Green"],
      kinds: ["DigiEgg"],
      level: 2,
      forms: ["In-Training"],
      types: ["Bulb"],
      inheritedEffectText:
        "[Your Turn][Once Per Turn] When you play a green Tamer, ＜Draw 1＞. (Draw 1 card from your deck.)",
    });
    expect(compiled).toEqual({
      effects: [
        {
          trigger: "YourTurn",
          actions: [
            {
              kind: "SubTrigger",
              event: "whenPlayed",
              sourceFilter: { controllerDefault: "mine", kind: ["Tamer"], colors: ["Green"] },
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

  it("draws for the first green Tamer played in the turn only", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT1-064", as: "host", under: ["BT11-004"] }, "BT1-013"],
        hand: [
          { card: "BT1-088", as: "izzy" },
          { card: "BT3-094", as: "ken" },
          { card: "BT1-088", as: "izzy2" },
        ],
        deck: ["BT1-009", "BT1-010", "BT1-011"],
      },
      1: { deck: Array.from({ length: 10 }, () => "BT1-009"), security: ["BT1-009", "BT1-009"] },
    });
    s.state.memory = 10;
    const firstTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);

    for (const tamer of ["izzy", "ken"] as const) {
      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst(tamer).instanceId })).toEqual({ ok: true });
      await settle(() => s.state.pendingDecision === undefined);
    }

    expect(s.state.players[0]!.deck).toHaveLength(2);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT1-088", "BT1-009"]);

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
    expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("izzy2").instanceId })).toEqual({ ok: true });
    await settle(() => s.state.pendingDecision === undefined);
    expect(s.state.players[0]!.deck).toHaveLength(0);
    expect(s.state.players[0]!.hand.map(({ cardId }) => cardId)).toEqual(["BT1-009", "BT1-010", "BT1-011"]);
    advance(s.engine).endMainPhaseIfOpen(0);
    await nextTurn;
  });

  for (const [label, cardId] of [
    ["green Digimon", "BT1-064"],
    ["off-color Tamer", "BT1-085"],
  ] as const) {
    it(`does not draw for a ${label}`, async () => {
      const s = setupEngine({
        0: {
          battleArea: [{ card: "BT1-064", as: "host", under: ["BT11-004"] }],
          hand: [{ card: cardId, as: "played" }],
          deck: ["BT1-009"],
        },
      });
      s.state.memory = 20;

      expect(s.engine.applyIntent(0, { type: "playCard", instanceId: s.inst("played").instanceId })).toEqual({
        ok: true,
      });
      await settle(() => s.state.pendingDecision === undefined);

      expect(s.state.players[0]!.hand).toHaveLength(0);
      expect(s.state.players[0]!.deck).toHaveLength(1);
    });
  }
});
