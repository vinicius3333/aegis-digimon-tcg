import { GameState, Phase } from "@aegis/shared";
import { permanent, player, type CardEffectsFixture } from "../fixture";

export function goldramonBt3Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 7;
  state.turnSeat = 0;
  state.memory = 0;
  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const goldramon = permanent("demo-bt3-029-goldramon", "BT3-029", 0, 11000);
  goldramon.isSuspended = effect === "once-limit";
  you.battleArea.push(goldramon);
  state.players.push(you, opponent);
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT3-029",
        effectKey: `BT3-029/${effect ?? "resolved"}`,
        description:
          effect === "once-limit"
            ? "Goldramon did not unsuspend a second time this turn because its effect is Once Per Turn."
            : "During your turn, playing another Digimon unsuspended Goldramon.",
        timing: "YourTurn",
      },
    ],
  };
}
