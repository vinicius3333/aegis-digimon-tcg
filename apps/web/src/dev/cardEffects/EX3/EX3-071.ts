import { GameState, Phase, type DecisionRequest } from "@aegis/shared";
import { permanent, player } from "../fixture";

export function laserCannonDemo(
  effect: string | null,
  step: string | null,
): { state: GameState; decision: DecisionRequest } {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 5;
  state.turnSeat = 0;
  state.memory = effect === "security" ? 0 : 5;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  you.battleArea.push(permanent("demo-commandramon", "EX3-046", 0, 2000));
  opponent.battleArea.push(
    permanent("demo-metallicdramon", "EX3-053", 1, 12000, [
      { instanceId: "demo-cyberdramon-source", cardId: "EX3-050" },
    ]),
  );
  opponent.battleArea.push(permanent("demo-sealsdramon", "EX3-049", 1, 4000));
  opponent.battleArea.push(permanent("demo-examon", "EX3-074", 1, 15000));
  opponent.handCount = 5;
  state.players.push(you, opponent);

  const mainText =
    "[Main] ＜De-Digivolve 1＞ 1 of your opponent's Digimon. (Trash 1 card from the top of 1 of your opponent's Digimon. Stop trashing when you would trash a level 3 card or the Digimon's last card.) Then, delete 1 of your opponent's Digimon with a play cost of 5 or less.";
  const effectText = effect === "security" ? `[Security] Activate this card's [Main] effect. ${mainText}` : mainText;
  const isDeleteStep = step === "delete";

  return {
    state,
    decision: {
      decisionId: isDeleteStep ? "demo-laser-cannon-delete" : "demo-laser-cannon-de-digivolve",
      seat: 0,
      kind: "chooseTargets",
      promptText: "Choose targets",
      sourceCardId: "EX3-071",
      options: {
        candidateInstanceIds: isDeleteStep
          ? ["demo-sealsdramon"]
          : ["demo-metallicdramon", "demo-sealsdramon", "demo-examon"],
        visibleInstanceIds: ["demo-metallicdramon", "demo-sealsdramon", "demo-examon"],
        min: 1,
        max: 1,
        timing: effect === "security" ? "Security" : "Main",
        effectText,
      },
    },
  };
}
