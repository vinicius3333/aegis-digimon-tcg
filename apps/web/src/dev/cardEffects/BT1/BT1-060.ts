import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function magnaAngemonDemo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 5;
  state.turnSeat = 0;
  state.memory = effect === "recovered" ? 0 : 7;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  you.securityCount = effect === "recovered" ? 5 : 4;
  you.deckCount = effect === "recovered" ? 35 : 36;
  if (effect === "recovered") {
    you.battleArea.push(permanent("demo-magna-angemon", "BT1-060", 0, 6000));
  } else {
    you.hand.push(card("demo-magna-angemon-card", "BT1-060", 0));
    you.handCount = 1;
  }
  opponent.handCount = 5;
  state.players.push(you, opponent);

  if (effect !== "recovered") return { state };
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT1-060",
        effectKey: "BT1-060/recovery",
        description: "MagnaAngemon placed the top card of the deck on top of security.",
        timing: "OnPlay",
      },
    ],
  };
}
