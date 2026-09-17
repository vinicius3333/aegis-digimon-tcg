import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function birdramonBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 5;
  state.turnSeat = 0;
  state.memory = 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const boosted = effect === "player-attack" || effect === "q996-blocked";
  const attacker = permanent("demo-birdramon-bt2", "BT2-012", 0, boosted ? 7000 : 3000);
  attacker.isSuspended = effect !== null;
  you.battleArea.push(attacker);
  if (effect === "q996-blocked") {
    opponent.trash.push(card("demo-birdramon-bt2-blocker", "BT1-031", 1));
    opponent.securityCount = 5;
  } else if (effect === "digimon-attack") {
    opponent.trash.push(card("demo-birdramon-bt2-target", "BT1-003", 1));
  } else {
    opponent.securityCount = effect === "player-attack" ? 4 : 5;
  }
  state.players.push(you, opponent);

  if (effect === null) return { state };
  const descriptions: Record<string, string> = {
    "player-attack": "Birdramon attacked the player and gained +4000 DP for the turn.",
    "q996-blocked":
      "Birdramon's declared player attack was blocked, but it kept the +4000 DP, won the battle, and checked no security (Q996).",
    "digimon-attack": "Birdramon attacked an opposing Digimon instead of the player, so it received no DP bonus.",
  };
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT2-012",
        effectKey: "BT2-012/player-attack-dp",
        description: descriptions[effect] ?? "BT2-012 Birdramon resolved.",
        timing: "When Attacking",
      },
    ],
  };
}
