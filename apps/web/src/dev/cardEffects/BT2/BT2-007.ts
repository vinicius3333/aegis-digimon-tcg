import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function pagumonBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 5;
  state.turnSeat = 0;
  state.memory = 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const attacker = permanent("demo-pagumon-host", "BT2-009", 0, 3000, [
    { instanceId: "demo-pagumon-source", cardId: "BT2-007" },
  ]);
  attacker.isSuspended = effect !== null;
  you.battleArea.push(attacker);
  opponent.securityCount = effect === "trashed-top" ? 4 : 5;
  if (effect === "trashed-top") {
    you.trash.push(card("demo-pagumon-trashed-top", "BT1-010", 0));
    you.deckCount = 1;
  } else if (effect === null) {
    you.deckCount = 2;
  } else {
    you.deckCount = 0;
  }
  state.players.push(you, opponent);

  if (effect === null) return { state };
  const descriptions: Record<string, string> = {
    "trashed-top": "When its host attacked, Pagumon trashed exactly the top card of its owner's deck.",
    "empty-deck": "Pagumon's mandatory When Attacking effect resolved harmlessly because its owner's deck was empty.",
  };
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT2-007",
        effectKey: "BT2-007/trash-top-deck",
        description: descriptions[effect] ?? "BT2-007 Pagumon resolved.",
        timing: "When Attacking",
      },
    ],
  };
}
