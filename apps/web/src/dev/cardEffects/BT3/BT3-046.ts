import { GameState, Phase } from "@aegis/shared";
import { permanent, player, type CardEffectsFixture } from "../fixture";

export function terriermonBt3Demo(_effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 7;
  state.turnSeat = 1;
  state.memory = 0;
  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  you.battleArea.push(permanent("demo-bt3-046-terriermon", "BT3-046", 0, 2000));
  opponent.battleArea.push(permanent("demo-bt3-046-attacker", "BT1-019", 1, 4000));
  state.players.push(you, opponent);
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT3-046",
        effectKey: "BT3-046/restrict-memory",
        description: "Terriermon prevents the opponent from gaining memory except through Tamer effects.",
        timing: "AllTurns",
      },
    ],
  };
}
