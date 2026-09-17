import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function volcanicdramonBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 5;
  state.turnSeat = 0;
  state.memory = effect === null ? 11 : 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  if (effect === null) {
    you.hand.push(card("demo-volcanicdramon-bt2-hand", "BT2-018", 0));
    you.handCount = 1;
  } else {
    const volcanicdramon = permanent("demo-volcanicdramon-bt2", "BT2-018", 0, 10000);
    volcanicdramon.isSuspended = effect === "security-attack";
    you.battleArea.push(volcanicdramon);
  }
  if (effect === "on-play-delete") {
    opponent.battleArea.push(permanent("demo-volcanicdramon-bt2-survivor", "BT1-074", 1, 4001));
    opponent.trash.push(
      card("demo-volcanicdramon-bt2-deleted-a", "BT1-029", 1),
      card("demo-volcanicdramon-bt2-deleted-b", "BT1-070", 1),
    );
  } else if (effect === "security-attack") {
    opponent.securityCount = 1;
    opponent.trash.push(
      card("demo-volcanicdramon-bt2-check-a", "BT1-009", 1),
      card("demo-volcanicdramon-bt2-check-b", "BT1-010", 1),
    );
  } else if (effect === "digivolved") {
    opponent.battleArea.push(permanent("demo-volcanicdramon-bt2-undeleted", "BT1-029", 1, 2000));
  }
  state.players.push(you, opponent);

  if (effect === null) return { state };
  const descriptions: Record<string, string> = {
    "on-play-delete":
      "Volcanicdramon deleted all opposing Digimon with 4000 DP or less on play; the 4001 DP Digimon survived.",
    "security-attack": "Volcanicdramon's Security Attack +1 produced exactly 2 security checks.",
    digivolved: "Volcanicdramon entered by digivolution, so its On Play deletion did not activate.",
  };
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT2-018",
        effectKey: effect === "security-attack" ? "BT2-018/security-attack" : "BT2-018/on-play-delete",
        description: descriptions[effect] ?? "BT2-018 Volcanicdramon resolved.",
        timing: effect === "security-attack" ? "Static" : effect === "digivolved" ? "When Digivolving" : "On Play",
      },
    ],
  };
}
