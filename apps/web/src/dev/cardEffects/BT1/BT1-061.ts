import { GameState, Phase } from "@aegis/shared";
import { permanent, player, type CardEffectsFixture } from "../fixture";

export function mistymonDemo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 5;
  state.turnSeat = 0;
  state.memory = effect === "two-reduced" ? 0 : 7;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  you.battleArea.push(permanent("demo-mistymon", "BT1-061", 0, 7000));
  opponent.battleArea.push(permanent("demo-mistymon-target-a", "BT1-070", 1, effect === "two-reduced" ? 3000 : 6000));
  opponent.battleArea.push(permanent("demo-mistymon-target-b", "BT1-071", 1, effect === "two-reduced" ? 4000 : 7000));
  opponent.handCount = 5;
  state.players.push(you, opponent);

  if (effect !== "two-reduced") return { state };
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT1-061",
        effectKey: "BT1-061/dp-minus",
        description: "Mistymon gave exactly 2 opposing Digimon -3000 DP for the turn.",
        timing: "OnPlay",
      },
    ],
  };
}
