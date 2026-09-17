import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function madDogFireDemo(effect: string | null): CardEffectsFixture {
  const mainText = "[Main] 1 of your Digimon gets +3000 DP for the turn.";
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = effect === "expired" ? Phase.Active : Phase.Main;
  state.turnCount = effect === "expired" ? 6 : 5;
  state.turnSeat = effect === "expired" ? 1 : 0;
  state.memory = effect === "security-resolved" ? 0 : 1;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  if (effect === "no-target") {
    you.battleArea.push(permanent("demo-mad-dog-tamer", "BT1-086", 0, 0));
  } else {
    you.battleArea.push(
      permanent("demo-mad-dog-target", "BT1-028", 0, effect === "buffed" ? 6000 : 3000),
      permanent("demo-mad-dog-other", "BT1-029", 0, 2000),
    );
  }
  if (effect === "security-resolved") {
    you.hand.push(card("demo-mad-dog-drawn", "BT1-029", 0), card("demo-mad-dog-security", "BT1-096", 0));
    you.handCount = 2;
    you.deckCount = 35;
    you.securityCount = 4;
  } else {
    you.trash.push(card("demo-mad-dog-option", "BT1-096", 0));
  }
  opponent.handCount = 5;
  state.players.push(you, opponent);

  if (effect === null) {
    const candidates = you.battleArea.map((entry) => entry.topCard.instanceId);
    return {
      state,
      decision: {
        decisionId: "demo-mad-dog-target",
        seat: 0,
        kind: "chooseTargets",
        promptText: "Choose 1 of your Digimon to get +3000 DP for the turn.",
        sourceCardId: "BT1-096",
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
    buffed: "Mad Dog Fire gave only the selected Digimon +3000 DP for the turn.",
    expired: "Mad Dog Fire's +3000 DP expired at end of turn.",
    "no-target": "Mad Dog Fire resolved without a target because its controller had no Digimon.",
    "security-resolved": "Mad Dog Fire's Security effect drew 1 card, then added Mad Dog Fire to hand.",
  };
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT1-096",
        effectKey: effect === "security-resolved" ? "BT1-096/security" : "BT1-096/main",
        description: descriptions[effect] ?? mainText,
        timing: effect === "security-resolved" ? "Security" : effect === "expired" ? "End of Turn" : "Main",
      },
    ],
  };
}
