import { GameState, Phase, type DecisionRequest } from "@aegis/shared";
import { card, permanent, player } from "../fixture";

export function fighterModeDemo(effect: string | null): { state: GameState; decision: DecisionRequest } {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 5;
  state.turnSeat = 0;
  state.memory = 2;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  you.battleArea.push(
    permanent("demo-fighter-mode", "EX3-073", 0, 13000, [{ instanceId: "demo-dragon-mode-source", cardId: "EX3-063" }]),
  );
  you.battleArea.push(permanent("demo-veemon-ally", "EX3-004", 0, 2000));
  opponent.battleArea.push(permanent("demo-elecmon", "BT1-028", 1, 2000));
  opponent.battleArea.push(permanent("demo-gabumon", "BT1-029", 1, 2000));
  you.trash.push(card("demo-wormmon-trash", "EX3-055", 0));
  you.trash.push(card("demo-veemon-trash", "EX3-004", 0));
  you.trash.push(card("demo-unrelated-trash", "BT1-028", 0));
  opponent.handCount = 5;
  state.players.push(you, opponent);

  if (effect === "on-deletion") {
    return {
      state,
      decision: {
        decisionId: "demo-fighter-mode-on-deletion-wormmon",
        seat: 0,
        kind: "chooseTargets",
        promptText: "Select cards",
        sourceCardId: "EX3-073",
        options: {
          candidateInstanceIds: ["demo-wormmon-trash"],
          visibleInstanceIds: ["demo-wormmon-trash", "demo-veemon-trash", "demo-unrelated-trash"],
          min: 0,
          max: 1,
          timing: "OnDeletion",
          effectText: "[On Deletion] You may play 1 [Wormmon] and 1 [Veemon] from your trash without paying the costs.",
        },
      },
    };
  }

  return {
    state,
    decision: {
      decisionId: "demo-fighter-mode-when-digivolving",
      seat: 0,
      kind: "chooseTargets",
      promptText: "Choose targets",
      sourceCardId: "EX3-073",
      options: {
        candidateInstanceIds: ["demo-dragon-mode-source"],
        min: 1,
        max: 1,
        timing: "WhenDigivolving",
        effectText:
          "[When Digivolving] By returning 1 [Imperialdramon: Dragon Mode] from this Digimon's digivolution cards to the bottom of its owner's deck, none of your opponent's [Security] effects can activate for the turn.",
      },
    },
  };
}
