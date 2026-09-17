import { GameState, Phase } from "@aegis/shared";
import { permanent, player, type CardEffectsFixture } from "../fixture";

export function veedramonBt1Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 5;
  state.turnSeat = effect === "all-turns-opponent" ? 1 : 0;
  state.memory = 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  if (effect === "q992-two-blue" || effect === "all-turns-opponent") {
    you.battleArea.push(
      permanent("demo-veedramon-host", "BT1-032", 0, 6000, [
        { instanceId: "demo-veedramon-source", cardId: "BT1-115" },
      ]),
      permanent("demo-veedramon-blue-tamer-1", "BT1-086", 0, 0),
      permanent("demo-veedramon-blue-tamer-2", "BT1-086", 0, 0),
    );
  } else {
    const veedramon = permanent("demo-veedramon", "BT1-115", 0, 6000);
    veedramon.isSuspended = effect === "second-attack" || effect === "no-tamer";
    you.battleArea.push(veedramon);
    if (effect !== "no-tamer") you.battleArea.push(permanent("demo-veedramon-red-tamer", "BT1-085", 0, 0));
  }
  opponent.securityCount = effect === "q991-red-tamer" ? 4 : 5;
  state.players.push(you, opponent);

  if (effect === null) return { state };
  const descriptions: Record<string, string> = {
    "q991-red-tamer":
      "Veedramon unsuspended after attacking because any Tamer qualifies; the controlled Tamer was red, not blue (Q991).",
    "second-attack": "Veedramon's Once Per Turn effect was already used, so its second attack left it suspended.",
    "no-tamer": "Without a Tamer in play, Veedramon's When Attacking effect did not unsuspend it.",
    "q992-two-blue": "Two blue Tamers still granted only +1000 DP through Veedramon's inherited effect (Q992).",
    "all-turns-opponent":
      "The inherited +1000 DP remained active during the opponent's turn because it is an All Turns effect.",
  };
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT1-115",
        effectKey:
          effect === "q992-two-blue" || effect === "all-turns-opponent" ? "BT1-115/blue-tamer-dp" : "BT1-115/unsuspend",
        description: descriptions[effect] ?? "BT1-115 Veedramon resolved.",
        timing: effect === "q992-two-blue" || effect === "all-turns-opponent" ? "All Turns" : "When Attacking",
      },
    ],
  };
}
