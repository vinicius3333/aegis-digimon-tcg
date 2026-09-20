import { GameState, Phase, PlayerState } from "@aegis/shared";
import { describe, expect, it } from "vitest";
import "../cards/index.js";
import { createEvaluationPolicy } from "../bot/policy.js";
import { buildBotView } from "../bot/view.js";
import { layDevScenario } from "./devScenario.js";
import { GameEngine, type GameEngineHooks } from "./GameEngine.js";
import { BLUE_DECK, RED_DECK } from "./testDecks.js";

describe("arena-ex5-attack-priority dev scenario", () => {
  it("stages Shoutmon EX6 and an Alliance ally against MetalEtemon over EX5 Etemon", () => {
    const state = new GameState();
    state.players.push(new PlayerState(), new PlayerState());

    layDevScenario("arena-ex5-attack-priority", state, [BLUE_DECK, RED_DECK]);

    const human = state.players[0] as PlayerState;
    const bot = state.players[1] as PlayerState;
    expect(state.turnSeat).toBe(1);
    expect(
      human.battleArea.map(({ permanentId, topCard, stack }) => ({
        permanentId,
        cardId: topCard.cardId,
        stack: stack.map(({ cardId }) => cardId),
      })),
    ).toEqual([
      {
        permanentId: "you-ex5-metal-etemon",
        cardId: "EX5-054",
        stack: ["BT12-067", "EX5-048"],
      },
    ]);
    expect(human.hand.some(({ cardId }) => cardId === "BT11-040")).toBe(true);
    expect(human.deck.slice(0, 3).map(({ cardId }) => cardId)).toEqual(["BT11-040", "BT1-010", "BT1-012"]);
    expect(bot.battleArea.map(({ permanentId, topCard }) => ({ permanentId, cardId: topCard.cardId }))).toEqual([
      { permanentId: "opponent-shoutmon-ex6", cardId: "BT19-014" },
      { permanentId: "opponent-alliance-ally", cardId: "BT1-012" },
    ]);
  });

  it("makes the bot attack with Shoutmon EX6 while MetalEtemon remains above its printed DP", async () => {
    const state = new GameState();
    state.players.push(new PlayerState(), new PlayerState());
    layDevScenario("arena-ex5-attack-priority", state, [BLUE_DECK, RED_DECK]);
    state.turnCount = 1;
    state.phase = Phase.Main;

    const hooks: GameEngineHooks = { seed: 1, emit: () => {}, requestDecision: () => {} };
    const engine = new GameEngine(state, hooks);
    await engine.recomputeContinuousEffects();

    expect(state.players[0]!.battleArea[0]!.currentDP).toBe(13_000);
    const botView = buildBotView(state, 1);
    expect(botView).toBeDefined();
    expect(createEvaluationPolicy({ seed: 1 }).chooseMainAction(botView!)).toEqual({
      type: "attack",
      attackerPermanentId: "opponent-shoutmon-ex6",
      target: { kind: "player" },
    });
  });
});
