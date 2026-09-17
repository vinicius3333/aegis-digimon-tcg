import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function terrorsClusterBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 7;
  state.turnSeat = 0;
  state.memory = 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const own = permanent("demo-terrors-cluster-own", "BT2-042", 0, 3000);
  own.isSuspended = true;
  you.battleArea.push(own);
  const suspendedFirst = permanent("demo-terrors-cluster-suspended-a", "BT2-045", 1, 5000, [
    { instanceId: "demo-terrors-cluster-source", cardId: "BT2-001" },
  ]);
  suspendedFirst.isSuspended = true;
  const suspendedSecond = permanent("demo-terrors-cluster-suspended-b", "BT2-046", 1, 6000);
  suspendedSecond.isSuspended = true;
  const unsuspended = permanent("demo-terrors-cluster-unsuspended", "BT2-047", 1, 6000);
  if (effect === null || effect === "choose-suspended") {
    opponent.battleArea.push(suspendedFirst, suspendedSecond, unsuspended);
  } else if (effect === "unsuspended-ineligible") {
    opponent.battleArea.push(unsuspended);
    opponent.deck.push(card("demo-terrors-cluster-existing-bottom", "BT2-043", 1));
  } else {
    opponent.battleArea.push(unsuspended);
    opponent.deck.push(card("demo-terrors-cluster-returned", "BT2-045", 1));
    opponent.trash.push(card("demo-terrors-cluster-trashed-source", "BT2-001", 1));
  }
  if (effect !== "security-bottom" && effect !== null && effect !== "choose-suspended") {
    you.trash.push(card("demo-terrors-cluster-option", "BT2-102", 0));
  }
  state.players.push(you, opponent);

  const effectText =
    "[Main] Return 1 of your opponent's suspended Digimon to the bottom of their deck. Trash all of the digivolution cards of that Digimon.";
  if (effect === null || effect === "choose-suspended") {
    return {
      state,
      decision: {
        decisionId: "demo-terrors-cluster-selection",
        seat: 0,
        kind: "chooseTargets",
        promptText: "Choose 1 suspended opposing Digimon",
        sourceCardId: "BT2-102",
        options: {
          candidateInstanceIds: [suspendedFirst.permanentId, suspendedSecond.permanentId],
          visibleInstanceIds: [suspendedFirst.permanentId, suspendedSecond.permanentId, unsuspended.permanentId],
          min: 1,
          max: 1,
          timing: "Main",
          effectText,
        },
      },
    };
  }

  const descriptions: Record<string, string> = {
    "bottom-decked":
      "Terrors Cluster bottom-decked the suspended opponent, trashed only its source, and preserved the own suspended Digimon.",
    "unsuspended-ineligible":
      "The only opposing Digimon was unsuspended, so it remained in play and the deck was unchanged.",
    "security-bottom": "Security activated Main and bottom-decked the suspended Digimon with its source sent to trash.",
  };
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT2-102",
        effectKey: `BT2-102/${effect}`,
        description: descriptions[effect]!,
        timing: effect === "security-bottom" ? "Security" : "Main",
      },
    ],
  };
}
