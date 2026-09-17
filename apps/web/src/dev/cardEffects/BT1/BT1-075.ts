import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function digitamamonDemo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = effect === "delayed-paid" ? Phase.Active : Phase.Main;
  state.turnCount = effect === "delayed-paid" ? 6 : 5;
  state.turnSeat = effect === "delayed-paid" ? 1 : 0;
  state.memory = effect === "delayed-paid" ? 6 : effect === "memory-gained" ? 3 : 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  if (effect !== "delayed-paid") {
    const attacker = permanent("demo-digitamamon", "BT1-075", 0, 7000);
    attacker.isSuspended = effect === "memory-gained";
    you.battleArea.push(attacker);
  } else {
    you.trash.push(card("demo-digitamamon-deleted", "BT1-075", 0));
  }
  opponent.handCount = 5;
  state.players.push(you, opponent);

  if (effect !== "memory-gained" && effect !== "delayed-paid") return { state };
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT1-075",
        effectKey: "BT1-075/memory-loan",
        description:
          effect === "memory-gained"
            ? "Digitamamon gained 3 memory when attacking."
            : "At end of turn, Digitamamon's delayed effect lost 3 memory even after it left play.",
        timing: effect === "memory-gained" ? "When Attacking" : "End of Turn",
      },
    ],
  };
}
