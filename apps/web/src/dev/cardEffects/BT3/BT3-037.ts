import { GameState, Phase } from "@aegis/shared";
import { permanent, player, type CardEffectsFixture } from "../fixture";

export function turuiemonBt3Demo(_effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 7;
  state.turnSeat = 0;
  state.memory = 0;
  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  you.battleArea.push(permanent("demo-bt3-037-turuiemon", "BT3-037", 0, 6000));
  state.players.push(you, opponent);
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT3-037",
        effectKey: "BT3-037/vanilla",
        description: "BT3-037 Turuiemon has no printed effect: the 6000 DP Digimon remains unchanged.",
        timing: "OnPlay",
      },
    ],
  };
}
