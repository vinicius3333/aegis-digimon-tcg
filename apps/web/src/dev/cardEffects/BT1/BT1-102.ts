import { GameState, Phase } from "@aegis/shared";
import { card, player, type CardEffectsFixture } from "../fixture";

export function bladeOfTheTrueDemo(effect: string | null): CardEffectsFixture {
  const mainText = "[Main] Trigger ＜Draw 1＞ for every 2 security cards you have.";
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 5;
  state.turnSeat = 0;
  state.memory = effect === null ? 2 : 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const securityCount = effect === "q966-zero" ? 0 : effect === "q966-one" ? 1 : effect === "security-drew-two" ? 3 : 4;
  you.securityCount = securityCount;
  if (effect === null) {
    you.hand.push(card("demo-blade-option", "BT1-102", 0));
    you.handCount = 1;
  } else {
    you.trash.push(card("demo-blade-option", "BT1-102", 0));
    if (effect === "main-drew-two" || effect === "security-drew-two") {
      you.hand.push(card("demo-blade-draw-one", "BT1-001", 0), card("demo-blade-draw-two", "BT1-002", 0));
      you.handCount = 2;
      you.deckCount = 34;
    }
  }
  opponent.handCount = 5;
  state.players.push(you, opponent);

  if (effect === null) return { state };
  const descriptions: Record<string, string> = {
    "main-drew-two": "Blade of the True saw 4 security cards and triggered Draw 1 twice.",
    "security-drew-two":
      "Blade of the True's Security effect activated Main and triggered Draw 1 twice from the 4-card security stack.",
    "q966-one": "Blade of the True was used with 1 security card, paid its cost, and drew nothing (Q966).",
    "q966-zero": "Blade of the True was used with no security cards, paid its cost, and drew nothing (Q966).",
  };
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT1-102",
        effectKey: effect === "security-drew-two" ? "BT1-102/security" : "BT1-102/main",
        description: descriptions[effect] ?? mainText,
        timing: effect === "security-drew-two" ? "Security" : "Main",
      },
    ],
  };
}
