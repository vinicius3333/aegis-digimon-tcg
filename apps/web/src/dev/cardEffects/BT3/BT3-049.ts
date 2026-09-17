import { GameState, Phase } from "@aegis/shared";
import { permanent, player, type CardEffectsFixture } from "../fixture";

export function flymonBt3Demo(_effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 7;
  state.turnSeat = 1;
  state.memory = 0;
  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  you.battleArea.push(permanent("demo-bt3-049-flymon", "BT3-049", 0, 4000));
  opponent.battleArea.push(permanent("demo-bt3-049-attacker", "BT1-057", 1, 5000));
  state.players.push(you, opponent);
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT3-049",
        effectKey: "BT3-049/security",
        description: "Flymon was played from Security without paying its memory cost at the end of battle.",
        timing: "Security",
      },
    ],
  };
}
