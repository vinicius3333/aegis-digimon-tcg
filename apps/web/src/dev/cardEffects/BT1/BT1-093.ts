import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function greatTornadoDemo(effect: string | null): CardEffectsFixture {
  const effectText = "[Main] 1 of your Digimon gets +2000 DP and Security Attack +1 for the turn.";
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = effect === "expired" ? Phase.Active : Phase.Main;
  state.turnCount = effect === "expired" ? 6 : 5;
  state.turnSeat = effect === "expired" ? 1 : 0;
  state.memory = 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  if (effect === "no-target") {
    you.battleArea.push(permanent("demo-great-tornado-tamer", "BT1-085", 0, 0));
  } else {
    const chosen = permanent(
      "demo-great-tornado-chosen",
      "BT1-010",
      0,
      effect === "buffed" || effect === "attacked" ? 4000 : 2000,
    );
    if (effect === "buffed" || effect === "attacked") chosen.grantedKeywords.push("SecurityAttack");
    if (effect === "attacked") chosen.isSuspended = true;
    you.battleArea.push(chosen, permanent("demo-great-tornado-other", "BT1-011", 0, 3000));
  }
  if (effect === "security-added") {
    you.hand.push(card("demo-great-tornado-security", "BT1-093", 0));
    you.handCount = 1;
    you.securityCount = 4;
  } else {
    you.trash.push(card("demo-great-tornado-option", "BT1-093", 0));
  }
  opponent.securityCount = effect === "attacked" ? 0 : 2;
  opponent.handCount = 5;
  state.players.push(you, opponent);

  if (effect === null) {
    const candidates = you.battleArea.map((entry) => entry.topCard.instanceId);
    return {
      state,
      decision: {
        decisionId: "demo-great-tornado-target",
        seat: 0,
        kind: "chooseTargets",
        promptText: "Choose 1 of your Digimon to receive both +2000 DP and Security Attack +1.",
        sourceCardId: "BT1-093",
        options: {
          candidateInstanceIds: candidates,
          visibleInstanceIds: candidates,
          min: 1,
          max: 1,
          timing: "Main",
          effectText,
        },
      },
    };
  }

  const descriptions: Record<string, string> = {
    buffed: "Great Tornado gave the selected Digimon both +2000 DP and Security Attack +1 for the turn.",
    attacked: "The selected Digimon used Security Attack +1 to perform 2 security checks.",
    expired: "Great Tornado's DP and Security Attack bonuses both expired at end of turn.",
    "no-target": "Great Tornado resolved without a target because its controller had no Digimon.",
    "security-added": "Great Tornado's Security effect added the card to its owner's hand.",
  };
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT1-093",
        effectKey: effect === "security-added" ? "BT1-093/security" : "BT1-093/main",
        description: descriptions[effect] ?? effectText,
        timing: effect === "security-added" ? "Security" : effect === "expired" ? "End of Turn" : "Main",
      },
    ],
  };
}
