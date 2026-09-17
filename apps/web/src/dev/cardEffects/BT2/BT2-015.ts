import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function garudamonBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 5;
  state.turnSeat = 0;
  state.memory = 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const attacker = permanent("demo-garudamon-bt2", "BT2-015", 0, 7000);
  attacker.isSuspended = effect !== null;
  you.battleArea.push(attacker);
  if (effect === "player-attack" || effect === "q997-blocked") {
    you.hand.push(card("demo-garudamon-bt2-drawn", "BT1-010", 0));
    you.handCount = 1;
  }
  if (effect === "q997-blocked") {
    opponent.trash.push(card("demo-garudamon-bt2-blocker", "BT1-031", 1));
    opponent.securityCount = 5;
  } else if (effect === "digimon-attack") {
    opponent.trash.push(card("demo-garudamon-bt2-target", "BT1-003", 1));
    you.deckCount = 1;
  } else {
    opponent.securityCount = effect === "player-attack" ? 4 : 5;
  }
  state.players.push(you, opponent);

  if (effect === null) return { state };
  const descriptions: Record<string, string> = {
    "player-attack": "Garudamon attacked the player and drew 1 card.",
    "q997-blocked":
      "Garudamon drew 1 after declaring a player attack; the later block redirected combat but did not undo the draw (Q997).",
    "digimon-attack": "Garudamon attacked an opposing Digimon instead of the player, so it did not draw.",
  };
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT2-015",
        effectKey: "BT2-015/player-attack-draw",
        description: descriptions[effect] ?? "BT2-015 Garudamon resolved.",
        timing: "When Attacking",
      },
    ],
  };
}
