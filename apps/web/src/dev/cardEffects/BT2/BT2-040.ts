import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function ophanimonBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 5;
  state.turnSeat = effect === "q1013-security-battle" ? 1 : 0;
  state.memory = 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  if (effect === null) {
    you.battleArea.push(permanent("demo-ophanimon-bt2", "BT2-040", 0, 11000));
  } else if (effect === "placed-in-security") {
    you.securityCount = 1;
  } else if (effect === "q1013-security-battle") {
    you.trash.push(card("demo-ophanimon-bt2-checked", "BT2-040", 0));
    opponent.trash.push(card("demo-ophanimon-bt2-defeated-attacker", "BT2-039", 1));
  }
  opponent.securityCount = 5;
  state.players.push(you, opponent);

  if (effect === null) return { state };
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT2-040",
        effectKey: effect === "q1013-security-battle" ? "BT2-040/security-battle" : "BT2-040/on-deletion",
        description:
          effect === "q1013-security-battle"
            ? "Q1013: Ophanimon was checked as an 11000 DP Security Digimon and deleted the 10000 DP attacker in battle."
            : "Deleted Ophanimon placed only its top card face down on top of its controller's security stack.",
        timing: effect === "q1013-security-battle" ? "Security" : "On Deletion",
      },
    ],
  };
}
