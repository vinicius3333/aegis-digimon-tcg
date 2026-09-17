import { GameState, Phase, type DecisionRequest } from "@aegis/shared";
import { card, permanent, player } from "../fixture";

export function megiddoFlameDemo(effect: string | null): { state: GameState; decision: DecisionRequest } {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 5;
  state.turnSeat = 0;
  state.memory = 4;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  if (effect !== "security") you.battleArea.push(permanent("demo-guilmon-cost", "EX3-056", 0, 2000));
  opponent.battleArea.push(permanent("demo-growlmon", "EX3-057", 1, 4000));
  opponent.battleArea.push(permanent("demo-megidramon", "EX3-064", 1, 12000));
  opponent.battleArea.push(permanent("demo-examon", "EX3-074", 1, 15000));
  you.trash.push(card("demo-guilmon-trash", "EX3-056", 0));
  you.trash.push(card("demo-guilmon-x-trash", "BT9-009", 0));
  you.trash.push(card("demo-growlmon-trash", "EX3-057", 0));
  opponent.handCount = 5;
  state.players.push(you, opponent);

  const effectText =
    "[Main] Delete 1 of your opponent's level 4 or lower Digimon. By deleting 1 of your Digimon, delete 1 of your opponent's level 6 or lower Digimon instead.";
  if (effect === "security") {
    return {
      state,
      decision: {
        decisionId: "demo-megiddo-flame-security",
        seat: 0,
        kind: "selectCards",
        promptText: "Select cards",
        sourceCardId: "EX3-072",
        options: {
          candidateInstanceIds: ["demo-guilmon-trash", "demo-guilmon-x-trash"],
          visibleInstanceIds: ["demo-guilmon-trash", "demo-guilmon-x-trash", "demo-growlmon-trash"],
          min: 1,
          max: 1,
          timing: "Security",
          effectText: "[Security] You may play 1 [Guilmon] from your trash without paying the cost.",
        },
      },
    };
  }

  return {
    state,
    decision: {
      decisionId: "demo-megiddo-flame-main",
      seat: 0,
      kind: "chooseOption",
      promptText: "Choose one effect to activate",
      sourceCardId: "EX3-072",
      options: {
        choices: [
          "Delete 1 opponent's level 4 or lower Digimon",
          "Delete 1 of your Digimon to delete 1 opponent's level 6 or lower Digimon instead",
        ],
        timing: "Main",
        effectText,
      },
    },
  };
}
