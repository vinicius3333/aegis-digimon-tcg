import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function palmonDemo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 5;
  state.turnSeat = 0;
  state.memory = effect === "level-four-added" ? 0 : 3;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  you.battleArea.push(permanent("demo-palmon", "BT1-067", 0, 1000));
  if (effect === "level-four-added") {
    you.hand.push(card("demo-palmon-level-four", "BT1-016", 0));
    you.handCount = 1;
    you.deckCount = 35;
  }
  opponent.handCount = 5;
  state.players.push(you, opponent);

  if (effect !== "level-four-added") return { state };
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT1-067",
        effectKey: "BT1-067/reveal-level-four",
        description: "Palmon added a non-green level 4 Digimon and bottom-decked the rest in the chosen order.",
        timing: "OnPlay",
      },
    ],
  };
}
