import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function hornBusterDemo(effect: string | null): CardEffectsFixture {
  const mainText = "[Main] 1 of your Digimon gets +3000 DP for the turn.";
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = effect === "expired" ? Phase.End : Phase.Main;
  state.turnCount = 5;
  state.turnSeat = 0;
  state.memory = effect === null || effect === "no-target" ? 1 : 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  if (effect === "no-target" || effect === "no-target-used") {
    you.battleArea.push(permanent("demo-horn-mimi", "BT1-089", 0, 0));
  } else {
    const recipient = permanent("demo-horn-recipient", "BT1-064", 0, effect === "main-boosted" ? 7000 : 4000);
    if (effect === "main-boosted") recipient.baseDP = 4000;
    you.battleArea.push(recipient);
  }
  if (effect === "security-resolved") {
    const target = permanent("demo-horn-security-target", "BT1-010", 1, 2000);
    target.isSuspended = true;
    opponent.battleArea.push(target);
  }
  if (effect === null || effect === "no-target") {
    you.hand.push(card("demo-horn-option", "BT1-108", 0));
    you.handCount = 1;
  } else if (effect === "security-resolved" || effect === "security-no-target") {
    you.hand.push(card("demo-horn-security", "BT1-108", 0));
    you.handCount = 1;
    you.securityCount = 4;
  } else {
    you.trash.push(card("demo-horn-option", "BT1-108", 0));
  }
  opponent.handCount = 5;
  state.players.push(you, opponent);

  if (effect === null || effect === "no-target") return { state };
  const descriptions: Record<string, string> = {
    "main-boosted":
      "Horn Buster gave the selected Digimon +3000 DP for the turn through the production Option-use timing.",
    expired: "Horn Buster's +3000 DP modifier expired at the end of the turn.",
    "no-target-used":
      "Horn Buster was legally used with a green Tamer satisfying its color requirement and no Digimon to select; the effect resolved without a target.",
    "security-resolved":
      "Horn Buster suspended 1 opposing Digimon, then added itself from security to its owner's hand.",
    "security-no-target":
      "With no opposing Digimon to suspend, Security Horn Buster still added itself to its owner's hand.",
  };
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT1-108",
        effectKey:
          effect === "security-resolved" || effect === "security-no-target"
            ? "BT1-108/security-suspend-return"
            : "BT1-108/main-dp-boost",
        description: descriptions[effect] ?? mainText,
        timing:
          effect === "security-resolved" || effect === "security-no-target"
            ? "Security"
            : effect === "expired"
              ? "End of Turn"
              : "Main",
      },
    ],
  };
}
