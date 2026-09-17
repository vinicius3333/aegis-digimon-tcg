import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function oblivionBirdDemo(effect: string | null): CardEffectsFixture {
  const effectText = "[Main] Delete 1 of your opponent's Digimon with Blocker.";
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 5;
  state.turnSeat = 0;
  state.memory = effect === "security-deleted" ? 0 : 5;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  you.battleArea.push(permanent("demo-oblivion-red", "BT1-010", 0, 2000));
  const nonBlocker = permanent("demo-oblivion-non-blocker", "BT1-071", 1, 6000);
  if (effect === "no-target") {
    opponent.battleArea.push(nonBlocker);
  } else if (effect === "q962-deleted") {
    opponent.trash.push(nonBlocker.topCard);
  } else if (effect === "deleted" || effect === "security-deleted") {
    opponent.battleArea.push(nonBlocker);
    opponent.trash.push(card("demo-oblivion-deleted-blocker", "BT1-072", 1));
  } else {
    opponent.battleArea.push(permanent("demo-oblivion-blocker", "BT1-072", 1, 6000), nonBlocker);
  }
  you.trash.push(card("demo-oblivion-option", "BT1-094", 0));
  opponent.handCount = 5;
  state.players.push(you, opponent);

  if (effect === null) {
    const blocker = opponent.battleArea[0]!;
    return {
      state,
      decision: {
        decisionId: "demo-oblivion-target",
        seat: 0,
        kind: "chooseTargets",
        promptText: "Choose 1 opposing Digimon with Blocker to delete.",
        sourceCardId: "BT1-094",
        options: {
          candidateInstanceIds: [blocker.topCard.instanceId],
          visibleInstanceIds: opponent.battleArea.map((entry) => entry.topCard.instanceId),
          min: 1,
          max: 1,
          timing: "Main",
          effectText,
        },
      },
    };
  }

  const descriptions: Record<string, string> = {
    deleted: "Oblivion Bird deleted the opposing Digimon with Blocker and left the non-Blocker untouched.",
    "q962-deleted": "Oblivion Bird deleted a Digimon whose Blocker was granted by another Option effect (Q962).",
    "no-target": "Oblivion Bird resolved without a target because the opponent controlled no Digimon with Blocker.",
    "security-deleted": "Oblivion Bird's Security effect activated its Main effect and deleted the opposing Blocker.",
  };
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT1-094",
        effectKey: effect === "security-deleted" ? "BT1-094/security" : "BT1-094/main",
        description: descriptions[effect] ?? effectText,
        timing: effect === "security-deleted" ? "Security" : "Main",
      },
    ],
  };
}
