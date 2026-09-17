import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function gigaBlasterDemo(effect: string | null): CardEffectsFixture {
  const effectText = "[Main] Suspend 1 opposing Digimon or exactly 2 opposing Digimon with 5000 DP or less.";
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 5;
  state.turnSeat = 0;
  state.memory = effect === null ? 3 : 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  you.battleArea.push(permanent("demo-giga-color", "BT1-067", 0, 1000));
  const first = permanent("demo-giga-first", "BT1-010", 1, 2000);
  const second = permanent("demo-giga-second", "BT1-015", 1, 4000);
  const large = permanent("demo-giga-large", "BT1-016", 1, 9000);
  if (effect === "mode-one") large.isSuspended = true;
  if (effect === "mode-two" || effect === "security-mode-two") {
    first.isSuspended = true;
    second.isSuspended = true;
  }
  if (effect === "q983-fallback") first.isSuspended = true;
  opponent.battleArea.push(first);
  if (effect !== "q983-fallback") opponent.battleArea.push(second);
  opponent.battleArea.push(large);
  if (effect === null) {
    you.hand.push(card("demo-giga-option", "BT1-111", 0));
    you.handCount = 1;
  } else {
    you.trash.push(card("demo-giga-option", "BT1-111", 0));
    if (effect === "security-mode-two") you.securityCount = 4;
  }
  opponent.handCount = 5;
  state.players.push(you, opponent);

  if (effect === null) return { state };
  if (effect === "choice") {
    return {
      state,
      decision: {
        decisionId: "demo-giga-mode",
        seat: 0,
        kind: "chooseOption",
        promptText: "Choose exactly 1 Giga Blaster mode",
        sourceCardId: "BT1-111",
        options: {
          choices: ["Suspend 1 opposing Digimon", "Suspend exactly 2 opposing Digimon with 5000 DP or less"],
          timing: "Main",
          effectText,
        },
      },
    };
  }
  const descriptions: Record<string, string> = {
    "mode-one":
      "Giga Blaster chose only its first mode and suspended exactly 1 opposing Digimon regardless of DP (Q982).",
    "mode-two":
      "Giga Blaster chose only its second mode and suspended exactly 2 opposing Digimon with 5000 DP or less (Q982).",
    "q983-fallback":
      "With only 1 low-DP Digimon available, Giga Blaster used the 1-Digimon mode; the unavailable 2-target mode was not offered (Q983).",
    "security-mode-two":
      "Security Giga Blaster activated Main and suspended exactly 2 opposing Digimon with 5000 DP or less.",
  };
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT1-111",
        effectKey: effect === "security-mode-two" ? "BT1-111/security" : "BT1-111/main",
        description: descriptions[effect] ?? effectText,
        timing: effect === "security-mode-two" ? "Security" : "Main",
      },
    ],
  };
}
