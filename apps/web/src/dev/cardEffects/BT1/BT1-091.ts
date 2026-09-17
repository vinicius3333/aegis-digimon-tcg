import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function scrapClawDemo(effect: string | null): CardEffectsFixture {
  const effectText =
    "[Main] 1 of your Digimon gains Piercing (When this Digimon attacks and deletes an opponent's Digimon and survives the battle, it performs any security checks it normally would) for the turn.";
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = effect === "expired" ? Phase.Active : Phase.Main;
  state.turnCount = effect === "expired" ? 6 : 5;
  state.turnSeat = effect === "expired" ? 1 : 0;
  state.memory = 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const target = permanent("demo-scrap-claw-target", "BT1-010", 0, 5000);
  const other = permanent("demo-scrap-claw-other", "BT1-011", 0, 3000);
  if (effect === "piercing-granted" || effect === "battle-won") target.grantedKeywords.push("Piercing");
  if (effect === "battle-won") target.isSuspended = true;
  you.battleArea.push(target, other);
  you.trash.push(card("demo-scrap-claw-option", "BT1-091", 0));
  if (effect === "battle-won") {
    opponent.trash.push(card("demo-scrap-claw-defender", "BT1-009", 1));
    opponent.securityCount = 0;
  } else {
    const defender = permanent("demo-scrap-claw-defender", "BT1-009", 1, 1000);
    defender.isSuspended = true;
    opponent.battleArea.push(defender);
    opponent.securityCount = 1;
  }
  opponent.handCount = 5;
  state.players.push(you, opponent);

  if (effect === null) {
    const candidates = [target.topCard.instanceId, other.topCard.instanceId];
    return {
      state,
      decision: {
        decisionId: "demo-scrap-claw-target",
        seat: 0,
        kind: "chooseTargets",
        promptText: "Choose 1 of your Digimon to gain Piercing for the turn.",
        sourceCardId: "BT1-091",
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
    "piercing-granted":
      "Scrap Claw granted Piercing to the selected Digimon for the turn; the other Digimon was unaffected.",
    "battle-won":
      "The selected Digimon deleted the opposing Digimon in battle, survived, and Piercing performed its security check.",
    expired: "Scrap Claw's granted Piercing expired at the end of the turn.",
  };
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT1-091",
        effectKey: "BT1-091/piercing",
        description: descriptions[effect] ?? effectText,
        timing: effect === "expired" ? "End of Turn" : "Main",
      },
    ],
  };
}
