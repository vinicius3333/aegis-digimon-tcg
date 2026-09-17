import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function dinobeemonDemo(effect: string | null, step: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 6;
  state.turnSeat = 0;
  state.memory = 3;
  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "dinobeemon-opponent");

  if (effect === "inherited") {
    const imperialdramon = permanent("demo-imperialdramon", "EX3-063", 0, 12000, [
      { instanceId: "demo-dinobeemon-source", cardId: "EX3-061" },
    ]);
    const unsuspended = permanent("demo-unsuspended-target", "BT1-028", 1, 2000);
    imperialdramon.attackablePermanentIds.push(unsuspended.permanentId);
    you.battleArea.push(imperialdramon);
    opponent.battleArea.push(unsuspended);
    state.players.push(you, opponent);
    return { state };
  }

  const dnaText =
    "[When Digivolving] When DNA digivolving, you may play 1 Paildramon from your trash without paying the cost.";
  const deletionText = "[On Deletion] You may play 1 Wormmon from your trash without paying the cost.";
  if (effect === "deletion") {
    you.trash.push(
      card("demo-deleted-dinobeemon", "EX3-061", 0),
      card("demo-stack-wormmon", "EX3-055", 0),
      card("demo-trash-wormmon", "BT3-047", 0),
      card("demo-other-larva", "BT11-075", 0),
    );
    state.players.push(you, opponent);
    return {
      state,
      decision:
        step === "wormmon"
          ? {
              decisionId: "demo-dinobeemon-wormmon-choice",
              seat: 0,
              kind: "selectCards",
              promptText: "Choose a Wormmon to play",
              sourceCardId: "EX3-061",
              options: {
                candidateInstanceIds: ["demo-stack-wormmon", "demo-trash-wormmon"],
                visibleInstanceIds: you.trash.map(({ instanceId }) => instanceId),
                min: 1,
                max: 1,
                timing: "OnDeletion",
                effectText: deletionText,
              },
            }
          : {
              decisionId: "demo-dinobeemon-wormmon-optional",
              seat: 0,
              kind: "optional",
              promptText: "Play 1 Wormmon from your trash for free?",
              sourceCardId: "EX3-061",
              options: { timing: "OnDeletion", effectText: deletionText },
            },
    };
  }

  you.battleArea.push(
    permanent("demo-dinobeemon", "EX3-061", 0, 8000, [
      { instanceId: "demo-shadramon-source", cardId: "EX3-058" },
      { instanceId: "demo-flamedramon-source", cardId: "EX3-008" },
    ]),
  );
  you.trash.push(
    card("demo-paildramon", "EX3-010", 0),
    card("demo-other-paildramon", "ST9-05", 0),
    card("demo-other-dinobeemon", "BT3-055", 0),
  );
  state.players.push(you, opponent);
  return {
    state,
    decision:
      step === "paildramon"
        ? {
            decisionId: "demo-dinobeemon-paildramon-choice",
            seat: 0,
            kind: "selectCards",
            promptText: "Choose a Paildramon to play",
            sourceCardId: "EX3-061",
            options: {
              candidateInstanceIds: ["demo-paildramon", "demo-other-paildramon"],
              visibleInstanceIds: you.trash.map(({ instanceId }) => instanceId),
              min: 1,
              max: 1,
              timing: "WhenDigivolving",
              effectText: dnaText,
            },
          }
        : {
            decisionId: "demo-dinobeemon-paildramon-optional",
            seat: 0,
            kind: "optional",
            promptText: "Play 1 Paildramon from your trash for free?",
            sourceCardId: "EX3-061",
            options: { timing: "WhenDigivolving", effectText: dnaText },
          },
  };
}
