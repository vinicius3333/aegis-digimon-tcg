import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function veemonBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = effect === "active-phase" ? Phase.Active : Phase.Main;
  state.turnCount = 5;
  state.turnSeat = effect === "opponent-turn" ? 1 : 0;
  state.memory = 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const host = permanent("demo-veemon-bt2-host", "BT2-026", 0, 4000, [
    { instanceId: "demo-veemon-bt2-source", cardId: "BT2-021" },
  ]);
  host.isSuspended = effect === null;
  you.battleArea.push(host);
  if (effect === "main-unsuspend" || effect === "second-unsuspend") {
    you.hand.push(card("demo-veemon-bt2-drawn", "BT1-010", 0));
    you.handCount = 1;
    you.deckCount = effect === "second-unsuspend" ? 1 : 0;
  } else {
    you.deckCount = 1;
  }
  state.players.push(you, opponent);

  if (effect === null) return { state };
  const descriptions: Record<string, string> = {
    "main-unsuspend": "Veemon's host really unsuspended during its owner's main phase and drew 1 card.",
    "q1001-already-active":
      "An unsuspend effect targeted an already active host, so no unsuspend occurred and Veemon did not draw (Q1001).",
    "active-phase": "The host unsuspended during the Active phase, so Veemon's main-phase trigger did not draw.",
    "second-unsuspend":
      "After a second real main-phase unsuspend, Veemon had still drawn only once because it is Once Per Turn.",
    "opponent-turn": "The host unsuspended during the opponent's turn, so Veemon's Your Turn effect did not draw.",
  };
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT2-021",
        effectKey: "BT2-021/main-phase-unsuspend-draw",
        description: descriptions[effect] ?? "BT2-021 Veemon resolved.",
        timing: "Your Turn",
      },
    ],
  };
}
