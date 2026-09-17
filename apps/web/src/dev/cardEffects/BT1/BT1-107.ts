import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function holyWaveDemo(effect: string | null): CardEffectsFixture {
  const mainText = "[Main] Trigger ＜Recovery +1 (Deck)＞.";
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 5;
  state.turnSeat = effect === "q1237-q1249" ? 1 : 0;
  state.memory = effect === null || effect === "empty-deck" ? 6 : 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  you.battleArea.push(permanent("demo-wave-color", "BT1-047", 0, 6000));
  if (effect === "q1237-q1249") {
    you.battleArea.push(permanent("demo-wave-dan", "BT4-088", 0, 12000));
    const kari = permanent("demo-wave-kari", "BT4-097", 0, 0);
    kari.isSuspended = true;
    you.battleArea.push(kari);
    opponent.battleArea.push(permanent("demo-wave-attacker", "BT1-010", 1, 5000));
    you.securityCount = 1;
    opponent.securityCount = 0;
    opponent.trash.push(card("demo-wave-dan-trashed", "BT1-001", 1));
    you.deckCount = 35;
  } else if (effect === "main-recovered") {
    you.securityCount = 6;
    you.deckCount = 35;
  } else if (effect === "security-recovered") {
    you.securityCount = 5;
    you.deckCount = 35;
    you.trash.push(card("demo-wave-security", "BT1-107", 0));
  } else if (effect === "q977-continued") {
    you.securityCount = 0;
    you.deckCount = 35;
    you.trash.push(card("demo-wave-security", "BT1-107", 0), card("demo-wave-recovered", "BT1-010", 0));
  }
  if (effect === null || effect === "empty-deck") {
    you.hand.push(card("demo-wave-option", "BT1-107", 0));
    you.handCount = 1;
    if (effect === "empty-deck") you.deckCount = 0;
  } else if (effect === "main-recovered") {
    you.trash.push(card("demo-wave-option", "BT1-107", 0));
  }
  opponent.handCount = 5;
  state.players.push(you, opponent);

  if (effect === null || effect === "empty-deck") {
    if (effect === null) return { state };
  }
  const descriptions: Record<string, string> = {
    "main-recovered": "Holy Wave placed the top card of the deck face down on top of the security stack.",
    "security-recovered":
      "Holy Wave's Security effect activated Recovery +1; one card left security and one was added from deck.",
    "q977-continued":
      "After Security Holy Wave recovered a card into the empty stack, the remaining Security Attack +1 check continued into that new card (Q977).",
    "q1237-q1249":
      "Even though Holy Wave left the security count unchanged, removing the checked card triggered DanDevimon and let Kari suspend to gain 1 memory (Q1237/Q1249).",
    "empty-deck": "Holy Wave was legally used with an empty deck and resolved without recovering a card.",
  };
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT1-107",
        effectKey: effect === "main-recovered" || effect === "empty-deck" ? "BT1-107/main" : "BT1-107/security",
        description: descriptions[effect ?? ""] ?? mainText,
        timing: effect === "main-recovered" || effect === "empty-deck" ? "Main" : "Security",
      },
    ],
  };
}
