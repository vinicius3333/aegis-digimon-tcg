import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function vNovaBlastDemo(effect: string | null): CardEffectsFixture {
  const effectText =
    "[Main] 1 of your Digimon gains Jamming (This Digimon can't be deleted in battles against Security Digimon) for the turn.";
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = effect === "expired" ? Phase.Active : Phase.Main;
  state.turnCount = effect === "expired" ? 6 : 5;
  state.turnSeat = effect === "expired" ? 1 : 0;
  state.memory = effect === "security-added" ? 0 : 2;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  if (effect === "no-target") {
    you.battleArea.push(permanent("demo-v-nova-tamer", "BT1-086", 0, 0));
  } else {
    const target = permanent("demo-v-nova-target", "BT1-028", 0, 3000);
    if (effect === "granted" || effect === "survived") target.grantedKeywords.push("Jamming");
    if (effect === "survived") target.isSuspended = true;
    you.battleArea.push(target, permanent("demo-v-nova-other", "BT1-029", 0, 2000));
  }
  if (effect === "security-added") {
    you.hand.push(card("demo-v-nova-security", "BT1-098", 0));
    you.handCount = 1;
    you.securityCount = 4;
  } else {
    you.trash.push(card("demo-v-nova-option", "BT1-098", 0));
  }
  opponent.securityCount = effect === "survived" ? 0 : 1;
  opponent.handCount = 5;
  state.players.push(you, opponent);

  if (effect === null) {
    const candidates = you.battleArea.map((entry) => entry.topCard.instanceId);
    return {
      state,
      decision: {
        decisionId: "demo-v-nova-target",
        seat: 0,
        kind: "chooseTargets",
        promptText: "Choose 1 of your Digimon to gain Jamming for the turn.",
        sourceCardId: "BT1-098",
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
    granted: "V-Nova Blast granted Jamming only to the selected Digimon for the turn.",
    survived: "The 3000 DP Digimon survived battle against a stronger Security Digimon because it had Jamming.",
    expired: "V-Nova Blast's Jamming grant expired at end of turn.",
    "no-target": "V-Nova Blast resolved without a target because its controller had no Digimon.",
    "security-added": "V-Nova Blast's Security effect added the card to its owner's hand.",
  };
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT1-098",
        effectKey: effect === "security-added" ? "BT1-098/security" : "BT1-098/main",
        description: descriptions[effect] ?? effectText,
        timing: effect === "security-added" ? "Security" : effect === "expired" ? "End of Turn" : "Main",
      },
    ],
  };
}
