import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function biyomonBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 5;
  state.turnSeat = effect === "opponent-turn-deletion" ? 1 : 0;
  state.memory = effect === "effect-deletion" || effect === "battle-deletion" ? 1 : 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  if (effect === null) {
    you.battleArea.push(permanent("demo-biyomon-bt2", "BT2-010", 0, 2000));
  } else {
    you.trash.push(card("demo-biyomon-bt2-deleted", "BT2-010", 0));
  }
  if (effect === "battle-deletion") {
    const survivor = permanent("demo-biyomon-bt2-survivor", "BT2-011", 1, 3000);
    survivor.isSuspended = true;
    opponent.battleArea.push(survivor);
  }
  state.players.push(you, opponent);

  if (effect === null) return { state };
  const descriptions: Record<string, string> = {
    "effect-deletion": "Biyomon was deleted by an effect during its owner's turn and gained 1 memory.",
    "battle-deletion": "Biyomon lost a battle during its owner's turn, was deleted, and gained 1 memory.",
    "opponent-turn-deletion":
      "Biyomon was deleted during the opponent's turn, so its conditional memory gain did not occur.",
  };
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT2-010",
        effectKey: "BT2-010/on-deletion-memory",
        description: descriptions[effect] ?? "BT2-010 Biyomon resolved.",
        timing: "On Deletion",
      },
    ],
  };
}
