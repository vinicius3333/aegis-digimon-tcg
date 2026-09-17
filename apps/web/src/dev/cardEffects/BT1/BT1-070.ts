import { GameState, Phase } from "@aegis/shared";
import { permanent, player, type CardEffectsFixture } from "../fixture";

export function kuwagamonDemo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 5;
  state.turnSeat = 0;
  state.memory = -4;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  you.battleArea.push(permanent("demo-kuwagamon", "BT1-070", 0, 4000));
  const target = permanent("demo-kuwagamon-target", "BT1-029", 1, 2000);
  target.isSuspended = effect === "suspend";
  opponent.battleArea.push(target);
  opponent.handCount = 5;
  state.players.push(you, opponent);

  if (effect !== "suspend") return { state };
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT1-070",
        effectKey: "BT1-070/suspend",
        description: "Kuwagamon's On Play effect suspends 1 opposing Digimon.",
        timing: "On Play",
      },
    ],
  };
}
