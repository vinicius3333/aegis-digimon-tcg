import { GameState, Phase, type DecisionRequest } from "@aegis/shared";
import { card, permanent, player } from "../fixture";

export function examonDemo(): { state: GameState; decision: DecisionRequest } {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 5;
  state.turnSeat = 0;
  state.memory = 3;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  you.battleArea.push(permanent("demo-examon", "EX3-074", 0, 15000));
  opponent.battleArea.push(permanent("demo-elecmon", "BT1-028", 1, 2000));
  opponent.battleArea.push(permanent("demo-gabumon", "BT1-029", 1, 2000));
  you.hand.push(card("demo-slayerdramon", "EX3-024", 0));
  you.hand.push(card("demo-breakdramon", "EX3-044", 0));
  you.hand.push(card("demo-fighter-mode", "BT8-032", 0));
  you.handCount = you.hand.length;
  opponent.handCount = 5;
  state.players.push(you, opponent);

  return {
    state,
    decision: {
      decisionId: "demo-examon-when-digivolving",
      seat: 0,
      kind: "selectCards",
      promptText: "Select cards",
      sourceCardId: "EX3-074",
      options: {
        candidateInstanceIds: ["demo-slayerdramon", "demo-breakdramon", "demo-fighter-mode"],
        min: 1,
        max: 1,
        timing: "WhenDigivolving",
        effectText:
          "[When Digivolving] You may place 1 green or blue Digimon card with [Dramon] in its name from your hand under this Digimon as its bottom digivolution card.",
      },
    },
  };
}
