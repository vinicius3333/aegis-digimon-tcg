import { GameState, Phase } from "@aegis/shared";
import { card, player, type CardEffectsFixture } from "../fixture";

export function wormmonBt3Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 7;
  state.turnSeat = 0;
  state.memory = 0;
  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  if (effect === "resolved") you.hand.push(card("demo-bt3-047-added", "BT3-040", 0));
  else
    you.deck.push(
      card("demo-bt3-047-deck-1", "BT3-040", 0),
      card("demo-bt3-047-deck-2", "BT1-010", 0),
      card("demo-bt3-047-deck-3", "BT1-011", 0),
    );
  state.players.push(you, opponent);
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT3-047",
        effectKey: `BT3-047/${effect ?? "resolved"}`,
        description:
          "On Deletion, Wormmon revealed 3 cards, added an eligible level 4 or 5 Digimon, and placed the rest at the bottom of the deck.",
        timing: "OnDeletion",
      },
    ],
  };
}
