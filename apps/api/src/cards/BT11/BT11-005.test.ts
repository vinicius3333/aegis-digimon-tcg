import { getCardDefinition } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import { advance } from "../../engine/testkit/advance.js";
import { setupEngine, settle } from "../../engine/testkit/harness.js";
import "../ST6/ST6-15.js";
import { compiled } from "./BT11-005.js";

describe("BT11-005 Koromon", () => {
  it("matches the catalog, ruling guard, and complete inherited contract", () => {
    expect(getCardDefinition("BT11-005")).toMatchObject({
      cardId: "BT11-005",
      nameEn: "Koromon",
      colors: ["Black"],
      kinds: ["DigiEgg"],
      level: 2,
      forms: ["In-Training"],
      types: ["Lesser"],
      inheritedEffectText:
        "[Opponent's Turn][Once Per Turn] When an opponent's Digimon is deleted, if this Digimon has [Greymon] in its name, ＜Draw 1＞. (Draw 1 card from your deck.)",
    });
    expect(compiled).toEqual({
      effects: [
        {
          trigger: "OpponentsTurn",
          actions: [
            {
              kind: "SubTrigger",
              event: "onDeletionOf",
              notSimultaneous: true,
              sourceFilter: { controller: "opponent", kind: ["Digimon"] },
              actions: [
                {
                  kind: "Draw",
                  controller: "mine",
                  amount: 1,
                  condition: {
                    kind: "selfHasNameContaining",
                    names: ["Greymon"],
                    raw: "this Digimon has [Greymon] in its name",
                  },
                },
              ],
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

  it("draws when an opponent's Digimon is deleted on their turn and its host is Greymon", async () => {
    const preferred: string[] = [];
    const s = setupEngine(
      {
        0: {
          battleArea: [
            { card: "BT2-057", as: "host", under: ["BT11-005", "BT2-052"] },
            { card: "BT1-009", as: "victim-one" },
            { card: "BT1-009", as: "victim-two" },
            { card: "BT1-009", as: "victim-three" },
          ],
          deck: [
            { card: "BT1-009", as: "draw-one" },
            { card: "BT1-010", as: "draw-two" },
            { card: "BT1-011", as: "draw-three" },
            { card: "BT1-012", as: "draw-four" },
            { card: "BT1-013", as: "draw-five" },
          ],
        },
        1: {
          battleArea: [
            { card: "BT11-075", as: "provider" },
            { card: "BT11-075", as: "sacrifice-one" },
            { card: "BT11-075", as: "sacrifice-two" },
            { card: "BT11-075", as: "sacrifice-three" },
          ],
          hand: [
            { card: "ST6-15", as: "option-one" },
            { card: "ST6-15", as: "option-two" },
            { card: "ST6-15", as: "option-three" },
          ],
          deck: ["BT1-014", "BT1-015", "BT1-016", "BT1-017", "BT1-018"],
        },
      },
      { autoAcceptOptional: true, autoSelectCards: true, autoOrderTriggers: true, preferInstanceIds: preferred },
    );
    s.state.isFirstPlayersFirstTurn = false;
    const sacrificeOneId = s.perm("sacrifice-one").topCard!.instanceId;
    const sacrificeTwoId = s.perm("sacrifice-two").topCard!.instanceId;
    const sacrificeThreeId = s.perm("sacrifice-three").topCard!.instanceId;
    const victimOneId = s.perm("victim-one").topCard!.instanceId;
    const victimTwoId = s.perm("victim-two").topCard!.instanceId;
    const victimThreeId = s.perm("victim-three").topCard!.instanceId;
    preferred.push(sacrificeOneId, victimOneId);
    s.state.turnSeat = 1;
    s.state.memory = 10;
    const firstTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("option-one").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision === undefined && s.state.players[0]!.deck.length === 4);
    expect(s.state.memory).toBe(9);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("draw-one").instanceId]);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(victimOneId);
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toEqual([
      sacrificeOneId,
      s.inst("option-one").instanceId,
    ]);

    preferred.splice(0, preferred.length, sacrificeTwoId, victimTwoId);
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("option-two").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision === undefined && s.state.players[0]!.battleArea.length === 3);
    expect(s.state.memory).toBe(8);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([s.inst("draw-one").instanceId]);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(victimTwoId);
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toEqual([
      sacrificeOneId,
      s.inst("option-one").instanceId,
      sacrificeTwoId,
      s.inst("option-two").instanceId,
    ]);
    advance(s.engine).endMainPhaseIfOpen(1);
    await firstTurn;

    s.state.turnSeat = 0;
    s.state.memory = 3;
    const ownTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(0);
    await settle(() => s.state.players[0]!.deck.length === 3);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("draw-one").instanceId,
      s.inst("draw-two").instanceId,
    ]);
    advance(s.engine).endMainPhaseIfOpen(0);
    await ownTurn;

    preferred.splice(0, preferred.length, sacrificeThreeId, victimThreeId);
    s.state.turnSeat = 1;
    s.state.memory = 3;
    const nextOpponentTurn = s.engine.runOneTurn();
    await advance(s.engine).waitForMainPhase(1);
    expect(s.engine.applyIntent(1, { type: "playCard", instanceId: s.inst("option-three").instanceId })).toEqual({
      ok: true,
    });
    await settle(() => s.state.pendingDecision === undefined && s.state.players[0]!.deck.length === 2);
    expect(s.state.memory).toBe(2);
    expect(s.state.players[0]!.hand.map(({ instanceId }) => instanceId)).toEqual([
      s.inst("draw-one").instanceId,
      s.inst("draw-two").instanceId,
      s.inst("draw-three").instanceId,
    ]);
    expect(s.state.players[0]!.trash.map(({ instanceId }) => instanceId)).toContain(victimThreeId);
    expect(s.state.players[1]!.trash.map(({ instanceId }) => instanceId)).toEqual([
      sacrificeOneId,
      s.inst("option-one").instanceId,
      sacrificeTwoId,
      s.inst("option-two").instanceId,
      sacrificeThreeId,
      s.inst("option-three").instanceId,
    ]);
    advance(s.engine).endMainPhaseIfOpen(1);
    await nextOpponentTurn;
  });

  it("does not draw if the Greymon host is deleted in the same batch (Q2046)", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT2-057", as: "host", under: ["BT11-005"] }],
        deck: ["BT1-009"],
      },
      1: { battleArea: [{ card: "BT1-009", as: "victim" }] },
    });
    s.state.turnSeat = 1;

    await advance(s.engine).verb.deletePermanent([s.perm("host").permanentId, s.perm("victim").permanentId]);

    expect(s.state.players[0]!.hand).toHaveLength(0);
  });

  it("draws only once for two separate opponent Digimon deletions in the turn", async () => {
    const s = setupEngine({
      0: {
        battleArea: [{ card: "BT2-057", as: "host", under: ["BT11-005"] }],
        deck: ["BT1-009", "BT1-010"],
      },
      1: {
        battleArea: [
          { card: "BT1-009", as: "first" },
          { card: "BT1-010", as: "second" },
        ],
      },
    });
    s.state.turnSeat = 1;

    await advance(s.engine).verb.deletePermanent([s.perm("first").permanentId]);
    await settle(() => s.state.players[0]!.hand.length === 1);
    await advance(s.engine).verb.deletePermanent([s.perm("second").permanentId]);

    expect(s.state.players[0]!.hand).toHaveLength(1);
    expect(s.state.players[0]!.deck).toHaveLength(1);
  });

  it("does not draw on its controller's turn or from a non-Greymon host", async () => {
    for (const { host, turnSeat } of [
      { host: "BT2-057", turnSeat: 0 as const },
      { host: "BT1-009", turnSeat: 1 as const },
    ]) {
      const s = setupEngine({
        0: {
          battleArea: [{ card: host, as: "host", under: ["BT11-005"] }],
          deck: ["BT1-010"],
        },
        1: { battleArea: [{ card: "BT1-009", as: "victim" }] },
      });
      s.state.turnSeat = turnSeat;

      await advance(s.engine).verb.deletePermanent([s.perm("victim").permanentId]);

      expect(s.state.players[0]!.hand).toHaveLength(0);
      expect(s.state.players[0]!.deck).toHaveLength(1);
    }
  });
});
