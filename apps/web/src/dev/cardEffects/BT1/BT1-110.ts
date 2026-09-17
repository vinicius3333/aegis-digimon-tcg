import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function flowerCannonDemo(effect: string | null): CardEffectsFixture {
  const mainText = "[Main] Suspend 1 of your opponent's Digimon.";
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 5;
  state.turnSeat = 0;
  state.memory = effect === null ? 2 : 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  you.battleArea.push(permanent("demo-flower-color", "BT1-067", 0, 1000));
  const first = permanent("demo-flower-first", "BT1-010", 1, 2000);
  const second = permanent("demo-flower-second", "BT1-011", 1, 3000);
  if (
    effect === "main-suspended" ||
    effect === "already-suspended" ||
    effect === "security-all" ||
    effect === "q981-granted"
  ) {
    first.isSuspended = true;
  }
  if (effect === "security-all" || effect === "q981-granted") second.isSuspended = true;
  opponent.battleArea.push(first, second);
  if (effect === "security-all") opponent.battleArea.push(permanent("demo-flower-printed-blocker", "BT1-023", 1, 6000));
  if (effect === "q981-granted") opponent.battleArea.push(permanent("demo-flower-granted-blocker", "BT1-012", 1, 3000));
  if (effect === null) {
    you.hand.push(card("demo-flower-option", "BT1-110", 0));
    you.handCount = 1;
  } else if (effect === "security-all" || effect === "q981-granted") {
    you.trash.push(card("demo-flower-security", "BT1-110", 0));
    you.securityCount = 4;
  } else {
    you.trash.push(card("demo-flower-option", "BT1-110", 0));
  }
  opponent.handCount = 5;
  state.players.push(you, opponent);

  if (effect === null) return { state };
  const descriptions: Record<string, string> = {
    "main-suspended": "Flower Cannon suspended exactly 1 selected opposing Digimon.",
    "already-suspended":
      "Flower Cannon legally selected an already suspended opposing Digimon and resolved as a no-op.",
    "security-all":
      "Security Flower Cannon suspended every opposing non-Blocker and left the printed Blocker unsuspended.",
    "q981-granted":
      "Security Flower Cannon left the Digimon that had gained Blocker unsuspended while suspending every non-Blocker (Q981).",
  };
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT1-110",
        effectKey:
          effect === "security-all" || effect === "q981-granted" ? "BT1-110/security-suspend" : "BT1-110/main-suspend",
        description: descriptions[effect ?? ""] ?? mainText,
        timing: effect === "security-all" || effect === "q981-granted" ? "Security" : "Main",
      },
    ],
  };
}
