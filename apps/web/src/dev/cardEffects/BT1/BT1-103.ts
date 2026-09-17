import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function testamentDemo(effect: string | null): CardEffectsFixture {
  const mainText = "[Main] Until the end of your opponent's next turn, 1 of your Digimon gains ＜Blocker＞.";
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = effect === "expired" ? Phase.End : Phase.Main;
  state.turnCount = effect === "expired" ? 7 : 5;
  state.turnSeat = effect === "main-active" ? 1 : 0;
  state.memory = effect === null || effect === "no-target" ? 3 : 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  if (effect === "no-target" || effect === "no-target-used") {
    you.battleArea.push(permanent("demo-testament-tamer", "BT1-087", 0, 0));
  } else {
    you.battleArea.push(permanent("demo-testament-recipient", "BT1-047", 0, 6000));
  }
  if (effect === null || effect === "no-target") {
    you.hand.push(card("demo-testament-option", "BT1-103", 0));
    you.handCount = 1;
  } else if (effect === "security-resolved") {
    you.hand.push(card("demo-testament-option", "BT1-103", 0), card("demo-testament-drawn", "BT1-001", 0));
    you.handCount = 2;
    you.deckCount = 35;
    you.securityCount = 4;
  } else {
    you.trash.push(card("demo-testament-option", "BT1-103", 0));
  }
  opponent.handCount = 5;
  state.players.push(you, opponent);

  if (effect === null || effect === "no-target") return { state };
  const descriptions: Record<string, string> = {
    "main-active": "Testament granted Blocker to the selected Digimon through the end of the opponent's next turn.",
    expired: "The Blocker granted by Testament expired at the end of the opponent's next turn.",
    "no-target-used":
      "Testament was legally used with a yellow Tamer satisfying its color requirement and no Digimon to select; the effect resolved without a target.",
    "security-resolved": "Testament's Security effect drew 1 card, then added Testament itself to its owner's hand.",
  };
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT1-103",
        effectKey: effect === "security-resolved" ? "BT1-103/security-draw-return" : "BT1-103/main-gain-blocker",
        description: descriptions[effect] ?? mainText,
        timing: effect === "security-resolved" ? "Security" : effect === "expired" ? "End of Turn" : "Main",
      },
    ],
  };
}
