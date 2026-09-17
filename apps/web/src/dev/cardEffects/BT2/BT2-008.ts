import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function yaamonBt2Demo(effect: string | null): CardEffectsFixture {
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
    permanent("demo-yaamon-host", "BT2-009", 0, active ? 4000 : 3000, [
      { instanceId: "demo-yaamon-source", cardId: "BT2-008" },
    ]),
  );
  const ownTrashCount = effect === "below-threshold" ? 4 : effect === "opponent-trash-only" ? 0 : 5;
  for (let index = 0; index < ownTrashCount; index += 1) {
    you.trash.push(card(`demo-yaamon-own-trash-${index}`, "BT1-010", 0));
  }
  if (effect === "opponent-trash-only") {
    for (let index = 0; index < 5; index += 1) {
      opponent.trash.push(card(`demo-yaamon-opponent-trash-${index}`, "BT1-010", 1));
    }
  }
  state.players.push(you, opponent);

  if (effect === null) return { state };
  const descriptions: Record<string, string> = {
    "threshold-five": "With exactly 5 cards in its owner's trash during their turn, Yaamon granted its host +1000 DP.",
    "below-threshold": "With only 4 cards in its owner's trash, Yaamon's inherited DP bonus stayed inactive.",
    "opponent-trash-only": "Five cards in the opponent's trash did not satisfy Yaamon's own-trash requirement.",
    "opponent-turn":
      "Despite 5 cards in its owner's trash, Yaamon's Your Turn bonus stayed inactive on the opponent's turn.",
  };
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT2-008",
        effectKey: "BT2-008/own-trash-threshold",
        description: descriptions[effect] ?? "BT2-008 Yaamon resolved.",
        timing: "Your Turn",
      },
    ],
  };
}
