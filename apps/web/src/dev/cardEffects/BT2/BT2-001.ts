import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function gigimonBt2Demo(effect: string | null): CardEffectsFixture {
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
    permanent("demo-gigimon-host", "BT2-009", 0, active ? 4000 : 3000, [
      { instanceId: "demo-gigimon-source", cardId: "BT2-001" },
    ]),
  );
  const trashCount = effect === "below-threshold" ? 4 : 5;
  for (let index = 0; index < trashCount; index += 1) {
    opponent.trash.push(card(`demo-gigimon-trash-${index}`, "BT1-010", 1));
  }
  state.players.push(you, opponent);

  if (effect === null) return { state };
  const descriptions: Record<string, string> = {
    "threshold-five":
      "With exactly 5 cards in the opponent's trash during its owner's turn, Gigimon granted its host +1000 DP.",
    "below-threshold": "With only 4 cards in the opponent's trash, Gigimon's inherited DP bonus stayed inactive.",
    "opponent-turn": "Despite 5 cards in the opponent's trash, Gigimon's Your Turn bonus was inactive on their turn.",
  };
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT2-001",
        effectKey: "BT2-001/your-turn-trash-threshold",
        description: descriptions[effect] ?? "BT2-001 Gigimon resolved.",
        timing: "Your Turn",
      },
    ],
  };
}
