import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function greymonBt3Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 7;
  state.turnSeat = 1;
  state.memory = 0;
  const you = player(0, "Security owner", "card-effects-viewer");
  const opponent = player(1, "Attacker", "card-effects-opponent");
  const greymon = permanent("demo-bt3-011-greymon", "BT3-011", 0, 4000);
  const attacker = permanent("demo-bt3-011-attacker", "BT1-057", 1, 5000);
  if (effect === "resolved") {
    you.battleArea.push(greymon);
    you.trash.push(card("demo-bt3-011-security-trash", "BT3-011", 0));
  } else {
    you.securityCount = 0;
    opponent.battleArea.push(attacker);
  }
  state.players.push(you, opponent);
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT3-011",
        effectKey: "BT3-011/security",
        description:
          "Greymon was played from Security without paying its memory cost at the end of the security battle.",
        timing: "Security",
      },
    ],
  };
}
