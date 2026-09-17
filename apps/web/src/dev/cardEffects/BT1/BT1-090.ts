import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function gravityCrushDemo(effect: string | null): CardEffectsFixture {
  const effectText = "[Main] Gain 2 memory. At end of turn, lose 2 memory.";
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase =
    effect === "end-loss" || effect === "blocked-loss" || effect === "stacked-loss" ? Phase.End : Phase.Main;
  state.turnCount = 5;
  state.turnSeat = 0;
  state.memory =
    effect === "memory-gained"
      ? 2
      : effect === "end-loss" || effect === "blocked-loss"
        ? -5
        : effect === "stacked-loss"
          ? -7
          : 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const option = card("demo-gravity-crush", "BT1-090", 0);
  if (effect === null) {
    you.hand.push(option);
    you.handCount = 1;
  } else {
    you.trash.push(option);
    if (effect === "stacked-loss") you.trash.push(card("demo-gravity-crush-second", "BT1-090", 0));
  }
  if (effect === "blocked-loss") opponent.battleArea.push(permanent("demo-gravity-terriermon", "BT3-046", 1, 2000));
  opponent.handCount = 5;
  state.players.push(you, opponent);

  if (effect === null) return { state };
  const descriptions: Record<string, string> = {
    "memory-gained": "Gravity Crush gained 2 memory immediately and scheduled a 2-memory loss for end of turn.",
    "end-loss": "At end of turn, Gravity Crush's delayed effect lost 2 memory after the turn marker passed.",
    "blocked-loss": "Terriermon prevented the initial gain, but Gravity Crush still lost 2 memory at end of turn.",
    "stacked-loss": "Two Gravity Crush effects each lost 2 memory at end of turn.",
  };
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT1-090",
        effectKey: effect === "memory-gained" ? "BT1-090/memory-loan" : "BT1-090/end-loss",
        description: descriptions[effect] ?? effectText,
        timing: effect === "memory-gained" ? "Main" : "End of Turn",
      },
    ],
  };
}
