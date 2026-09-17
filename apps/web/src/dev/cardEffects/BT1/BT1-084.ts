import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function omnimonDemo(effect: string | null, step: string | null): CardEffectsFixture {
  const deleteText =
    "[When Digivolving] Choose 1 of your opponent's Digimon. Delete all of your opponent's Digimon that share a name with it.";
  const attackText =
    "[When Attacking] You can unsuspend this Digimon by returning 1 of this Digimon's level 6 digivolution cards to your hand.";
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 5;
  state.turnSeat = 0;
  state.memory = 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const omnimon = permanent("demo-omnimon", "BT1-084", 0, 15000, [
    { instanceId: "demo-omnimon-level-six", cardId: "BT1-025" },
  ]);
  omnimon.isSuspended = step === "return-level-six" || effect === "declined";
  you.battleArea.push(omnimon);
  opponent.handCount = 5;

  if (effect === "deleted-names") {
    opponent.battleArea.push(permanent("demo-omnimon-different", "BT1-011", 1, 3000));
    opponent.trash.push(
      card("demo-omnimon-metal-a", "ST1-09", 1),
      card("demo-omnimon-metal-b", "BT1-021", 1),
      card("demo-omnimon-metal-c", "BT1-114", 1),
    );
  } else if (effect === "deleted-token") {
    opponent.trash.push(
      card("demo-omnimon-diaboromon", "BT2-082", 1),
      card("demo-omnimon-diaboromon-token", "TOKEN-Diaboromon", 1),
    );
  } else if (effect !== "unsuspended" && step !== "return-level-six") {
    opponent.battleArea.push(
      permanent("demo-omnimon-metal-a", "ST1-09", 1, 7000),
      permanent("demo-omnimon-metal-b", "BT1-021", 1, 7000),
      permanent("demo-omnimon-different", "BT1-011", 1, 3000),
    );
  }
  if (effect === "unsuspended") {
    omnimon.stack.splice(0);
    you.hand.push(card("demo-omnimon-level-six", "BT1-025", 0));
    you.handCount = 1;
  }
  state.players.push(you, opponent);

  if (effect === "deleted-names" || effect === "deleted-token" || effect === "unsuspended" || effect === "declined") {
    const descriptions: Record<string, string> = {
      "deleted-names": "Omnimon deleted every MetalGreymon with the exact chosen name across different card numbers.",
      "deleted-token": "Omnimon deleted the chosen Diaboromon and the matching Diaboromon token.",
      unsuspended: "Omnimon returned its level 6 digivolution card to hand and unsuspended.",
      declined:
        "Omnimon's controller declined the optional effect, so it remained suspended and kept its level 6 card.",
    };
    return {
      state,
      events: [
        {
          kind: "effectTriggered",
          seat: 0,
          sourceCardId: "BT1-084",
          effectKey:
            effect === "unsuspended" || effect === "declined"
              ? "BT1-084/return-lv6-unsuspend"
              : "BT1-084/delete-same-name",
          description: descriptions[effect] ?? deleteText,
          timing: effect === "unsuspended" || effect === "declined" ? "When Attacking" : "When Digivolving",
        },
      ],
    };
  }

  if (step === "return-level-six") {
    return {
      state,
      decision: {
        decisionId: "demo-omnimon-return-level-six",
        seat: 0,
        kind: "selectCards",
        promptText: "Choose 1 level 6 digivolution card to return to your hand.",
        sourceCardId: "BT1-084",
        options: {
          candidateInstanceIds: [omnimon.stack[0]!.instanceId],
          visibleInstanceIds: [omnimon.stack[0]!.instanceId],
          min: 1,
          max: 1,
          timing: "WhenAttacking",
          effectText: attackText,
        },
      },
    };
  }

  const candidates = opponent.battleArea.map((permanent) => permanent.topCard.instanceId);
  return {
    state,
    decision: {
      decisionId: "demo-omnimon-delete-name",
      seat: 0,
      kind: "chooseTargets",
      promptText: "Choose 1 opposing Digimon; every opposing Digimon with exactly that name will be deleted.",
      sourceCardId: "BT1-084",
      options: {
        candidateInstanceIds: candidates,
        visibleInstanceIds: candidates,
        min: 1,
        max: 1,
        timing: "WhenDigivolving",
        effectText: deleteText,
      },
    },
  };
}
