import { GameState, Phase } from "@aegis/shared";
import { permanent, player, type CardEffectsFixture } from "../fixture";

export function darknessClawBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 7;
  state.turnSeat = 0;
  state.memory = effect === "security" ? 2 : 0;
  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const first = permanent("demo-darkness-claw-own-a", "BT2-067", 0, 3000);
  const second = permanent("demo-darkness-claw-own-b", "BT2-068", 0, effect === "main-resolved" ? 4000 : 1000);
  const opposing = permanent("demo-darkness-claw-opponent", "BT2-069", 1, 2000);
  you.battleArea.push(first, second);
  opponent.battleArea.push(opposing);
  state.players.push(you, opponent);
  if (effect === null || effect === "choose-main") {
    return {
      state,
      decision: {
        decisionId: "demo-darkness-claw-selection",
        seat: 0,
        kind: "chooseTargets",
        promptText: "Choose 1 of your Digimon to get +3000 DP",
        sourceCardId: "BT2-107",
        options: {
          candidateInstanceIds: [first.permanentId, second.permanentId],
          visibleInstanceIds: [first.permanentId, second.permanentId, opposing.permanentId],
          min: 1,
          max: 1,
          timing: "Main",
          effectText: "[Main] 1 of your Digimon gets +3000 DP for the turn.",
        },
      },
    };
  }
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT2-107",
        effectKey: `BT2-107/${effect}`,
        description:
          effect === "security"
            ? "Darkness Claw's Security effect gained 2 memory."
            : "Darkness Claw gave exactly one selected own Digimon +3000 DP for the turn.",
        timing: effect === "security" ? "Security" : "Main",
      },
    ],
  };
}
