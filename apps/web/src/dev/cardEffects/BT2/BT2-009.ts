import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function guilmonBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 5;
  state.turnSeat = effect === "opponent-turn" ? 1 : 0;
  state.memory = 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const active = effect === "threshold-five";
  you.battleArea.push(
    permanent("demo-guilmon-bt2-host", "BT2-013", 0, active ? 5000 : 4000, [
      { instanceId: "demo-guilmon-bt2-source", cardId: "BT2-009" },
    ]),
  );
  const opponentTrashCount = effect === "below-threshold" ? 4 : effect === "own-trash-only" ? 0 : 5;
  for (let index = 0; index < opponentTrashCount; index += 1) {
    opponent.trash.push(card(`demo-guilmon-bt2-opponent-trash-${index}`, "BT1-010", 1));
  }
  if (effect === "own-trash-only") {
    for (let index = 0; index < 5; index += 1) {
      you.trash.push(card(`demo-guilmon-bt2-own-trash-${index}`, "BT1-010", 0));
    }
  }
  state.players.push(you, opponent);

  if (effect === null) return { state };
  const descriptions: Record<string, string> = {
    "threshold-five":
      "With exactly 5 cards in the opponent's trash during its owner's turn, Guilmon granted its host +1000 DP.",
    "below-threshold": "With only 4 cards in the opponent's trash, Guilmon's inherited DP bonus stayed inactive.",
    "own-trash-only": "Five cards in its owner's trash did not satisfy Guilmon's opponent-trash requirement.",
    "opponent-turn":
      "Despite 5 cards in the opponent's trash, Guilmon's Your Turn bonus stayed inactive on their turn.",
  };
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT2-009",
        effectKey: "BT2-009/opponent-trash-threshold",
        description: descriptions[effect] ?? "BT2-009 Guilmon resolved.",
        timing: "Your Turn",
      },
    ],
  };
}
