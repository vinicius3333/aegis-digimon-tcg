import { GameState, Phase } from "@aegis/shared";
import { permanent, player, type CardEffectsFixture } from "../fixture";

export function airdramonBt3Demo(_effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 7;
  state.turnSeat = 1;
  state.memory = 0;
  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  you.battleArea.push(permanent("demo-bt3-024-airdramon", "BT3-024", 0, 4000));
  opponent.battleArea.push(permanent("demo-bt3-024-attacker", "BT1-057", 1, 5000));
  state.players.push(you, opponent);
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT3-024",
        effectKey: "BT3-024/security",
        description: "Airdramon was played from Security without paying its memory cost at the end of battle.",
        timing: "Security",
      },
    ],
  };
}
