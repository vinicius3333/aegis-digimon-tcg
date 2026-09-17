import { GameState, Phase } from "@aegis/shared";
import { permanent, player, type CardEffectsFixture } from "../fixture";

export function angemonDemo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 5;
  state.turnSeat = 0;
  state.memory = effect === "dp-reduced" ? 0 : 5;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  you.battleArea.push(permanent("demo-angemon", "BT1-055", 0, 3000));
  opponent.battleArea.push(permanent("demo-angemon-target", "BT1-070", 1, effect === "dp-reduced" ? 3000 : 6000));
  opponent.handCount = 5;
  state.players.push(you, opponent);

  if (effect !== "dp-reduced") return { state };
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT1-055",
        effectKey: "BT1-055/dp-minus",
        description: "Angemon gave one opposing Digimon -3000 DP for the turn.",
        timing: "OnPlay",
      },
    ],
  };
}
