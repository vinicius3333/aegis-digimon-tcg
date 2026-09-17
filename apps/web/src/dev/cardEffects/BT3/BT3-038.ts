import { GameState, Phase } from "@aegis/shared";
import { permanent, player, type CardEffectsFixture } from "../fixture";

export function antylamonBt3Demo(_effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 7;
  state.turnSeat = 0;
  state.memory = 0;
  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  you.battleArea.push(permanent("demo-bt3-038-antylamon", "BT3-038", 0, 8000));
  state.players.push(you, opponent);
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT3-038",
        effectKey: "BT3-038/vanilla",
        description: "BT3-038 Antylamon has no printed effect: the 8000 DP Digimon remains unchanged.",
        timing: "OnPlay",
      },
    ],
  };
}
