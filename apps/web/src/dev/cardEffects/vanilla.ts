import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "./fixture";

export function effectBt3Demo(cardId: string, name: string, dp: number, description: string): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 7;
  state.turnSeat = 0;
  state.memory = 0;
  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  you.battleArea.push(permanent(`demo-${cardId}`, cardId, 0, dp));
  opponent.battleArea.push(permanent(`demo-${cardId}-target`, "BT1-019", 1, 4000));
  state.players.push(you, opponent);
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: cardId,
        effectKey: `${cardId}/resolved`,
        description,
        timing: "Main",
      },
    ],
  };
}

export function vanillaBt3Demo(cardId: string, name: string, dp: number): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 7;
  state.turnSeat = 0;
  state.memory = 0;
  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  you.battleArea.push(permanent(`demo-${cardId}`, cardId, 0, dp));
  state.players.push(you, opponent);
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: cardId,
        effectKey: `${cardId}/no-effect`,
        description: `${name} has no card effects; its printed stats and play state are unchanged.`,
        timing: "Static",
      },
    ],
  };
}

export function vanillaPlayDemo(
  cardId: string,
  dp: number,
  playCost: number,
  effect: string | null,
): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 5;
  state.turnSeat = 0;
  state.memory = effect === "played" ? 0 : playCost;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  opponent.handCount = 5;
  if (effect === "played") {
    you.battleArea.push(permanent("demo-vanilla", cardId, 0, dp));
    state.players.push(you, opponent);
    return {
      state,
      events: [{ kind: "cardsMoved", instanceIds: ["demo-vanilla-top"], from: "hand", to: "battleArea" }],
    };
  }

  you.hand.push(card("demo-vanilla-hand", cardId, 0));
  you.handCount = 1;
  state.players.push(you, opponent);
  return { state };
}
