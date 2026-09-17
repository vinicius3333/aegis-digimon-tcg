import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function granKuwagamonDemo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 5;
  state.turnSeat = effect === "opponent-turn" ? 1 : 0;
  state.memory = 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const granKuwagamon = permanent("demo-gran-kuwagamon", "BT1-083", 0, effect === "opponent-turn" ? 11000 : 15000);
  granKuwagamon.keywords.push("Piercing");
  granKuwagamon.isSuspended = effect === "piercing";
  you.battleArea.push(granKuwagamon);
  opponent.handCount = 5;
  if (effect === "piercing") {
    opponent.securityCount = 4;
    opponent.trash.push(card("demo-gran-kuwagamon-defender", "BT1-016", 1));
  }
  state.players.push(you, opponent);

  if (effect === "opponent-turn") return { state };
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT1-083",
        effectKey: effect === "piercing" ? "BT1-083/piercing" : "BT1-083/dp",
        description:
          effect === "piercing"
            ? "Piercing performed a security check after GranKuwagamon won the battle and survived."
            : "During its controller's turn, GranKuwagamon gets +4000 DP and reaches 15000 DP.",
        timing: effect === "piercing" ? "After Battle" : "Your Turn",
      },
    ],
  };
}
