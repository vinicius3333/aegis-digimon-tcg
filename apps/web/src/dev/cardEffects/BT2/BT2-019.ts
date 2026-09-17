import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function phoenixmonBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 5;
  state.turnSeat = 0;
  state.memory = effect === "player-attack" || effect === "q998-blocked" ? 1 : 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const attacker = permanent("demo-phoenixmon-bt2", "BT2-019", 0, 11000);
  attacker.isSuspended = effect !== null;
  you.battleArea.push(attacker);
  if (effect === "q998-blocked") {
    opponent.trash.push(card("demo-phoenixmon-bt2-blocker", "BT1-031", 1));
    opponent.securityCount = 5;
  } else if (effect === "digimon-attack") {
    opponent.trash.push(card("demo-phoenixmon-bt2-target", "BT1-003", 1));
  } else {
    opponent.securityCount = effect === "player-attack" ? 4 : 5;
  }
  state.players.push(you, opponent);

  if (effect === null) return { state };
  const descriptions: Record<string, string> = {
    "player-attack": "Phoenixmon attacked the player and gained 1 memory.",
    "q998-blocked":
      "Phoenixmon gained 1 memory after declaring a player attack; the later block redirected combat but did not undo the gain (Q998).",
    "digimon-attack": "Phoenixmon attacked an opposing Digimon instead of the player, so it gained no memory.",
  };
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT2-019",
        effectKey: "BT2-019/player-attack-memory",
        description: descriptions[effect] ?? "BT2-019 Phoenixmon resolved.",
        timing: "When Attacking",
      },
    ],
  };
}
