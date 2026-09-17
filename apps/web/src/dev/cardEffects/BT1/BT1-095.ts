import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function braveShieldDemo(effect: string | null): CardEffectsFixture {
  const mainText =
    "[Main] Unsuspend 1 of your Digimon. Until the end of your opponent's next turn, that Digimon gains Blocker.";
  const securityText = "[Security] Unsuspend 1 of your Digimon. That Digimon gains Blocker for the turn.";
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = effect === "expired" || effect === "security-expired" ? Phase.End : Phase.Main;
  state.turnCount = effect === "persisted" || effect === "expired" || effect === "security-expired" ? 6 : 5;
  state.turnSeat =
    effect === "persisted" || effect === "security-granted" || effect === "security-expired" || effect === "expired"
      ? 1
      : 0;
  state.memory = effect === "security-granted" || effect === "security-expired" ? 0 : 5;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const target = permanent("demo-brave-shield-target", "BT1-010", 0, 2000);
  const other = permanent("demo-brave-shield-other", "BT1-011", 0, 3000);
  target.isSuspended = effect === null;
  other.isSuspended = true;
  if (effect === "main-granted" || effect === "q963" || effect === "persisted" || effect === "security-granted") {
    target.grantedKeywords.push("Blocker");
  }
  you.battleArea.push(target, other);
  you.trash.push(card("demo-brave-shield-option", "BT1-095", 0));
  opponent.handCount = 5;
  state.players.push(you, opponent);

  if (effect === null) {
    const candidates = [target.topCard.instanceId, other.topCard.instanceId];
    return {
      state,
      decision: {
        decisionId: "demo-brave-shield-target",
        seat: 0,
        kind: "chooseTargets",
        promptText: "Choose 1 of your Digimon to unsuspend and give Blocker.",
        sourceCardId: "BT1-095",
        options: {
          candidateInstanceIds: candidates,
          visibleInstanceIds: candidates,
          min: 1,
          max: 1,
          timing: "Main",
          effectText: mainText,
        },
      },
    };
  }

  const descriptions: Record<string, string> = {
    "main-granted":
      "Brave Shield unsuspended the selected Digimon and granted Blocker through the opponent's next turn.",
    q963: "Brave Shield granted Blocker to a Digimon that was already unsuspended (Q963).",
    persisted: "The Main-effect Blocker grant remained after the controller's turn ended.",
    expired: "The Main-effect Blocker grant expired at the end of the opponent's next turn.",
    "security-granted":
      "Brave Shield's Security effect unsuspended the Digimon and granted Blocker for the current turn.",
    "security-expired": "The Security-effect Blocker grant expired at the end of the current turn.",
  };
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT1-095",
        effectKey: effect.startsWith("security-") ? "BT1-095/security" : "BT1-095/main",
        description: descriptions[effect] ?? (effect.startsWith("security-") ? securityText : mainText),
        timing: effect.startsWith("security-") ? "Security" : effect === "expired" ? "End of Turn" : "Main",
      },
    ],
  };
}
