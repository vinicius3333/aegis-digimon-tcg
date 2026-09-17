import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function spiderShooterBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 7;
  state.turnSeat = 0;
  state.memory = 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const first = permanent("demo-spider-shooter-target-a", "BT2-045", 1, 7000);
  first.stack.push(card("demo-spider-shooter-source-a", "BT2-043", 1));
  const second = permanent("demo-spider-shooter-target-b", effect === "main-resolved" ? "BT2-044" : "BT2-046", 1, 6000);
  if (effect !== "main-resolved") second.stack.push(card("demo-spider-shooter-source-b", "BT2-044", 1));
  opponent.battleArea.push(first, second);
  if (effect === "main-resolved") opponent.trash.push(card("demo-spider-shooter-trashed-top", "BT2-046", 1));
  state.players.push(you, opponent);

  const effectText = "[Main] De-Digivolve 1 on 1 of your opponent's Digimon.";
  if (effect === null || effect === "choose-main") {
    return {
      state,
      decision: {
        decisionId: "demo-spider-shooter-main-selection",
        seat: 0,
        kind: "chooseTargets",
        promptText: "Choose 1 opposing Digimon to De-Digivolve 1",
        sourceCardId: "BT2-105",
        options: {
          candidateInstanceIds: [first.permanentId, second.permanentId],
          visibleInstanceIds: [first.permanentId, second.permanentId],
          min: 1,
          max: 1,
          timing: "Main",
          effectText,
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
        sourceCardId: "BT2-105",
        effectKey: `BT2-105/${effect}`,
        description:
          effect === "security"
            ? "The Security effect activated Spider Shooter's Main effect and De-Digivolved one opposing Digimon by one card."
            : "Spider Shooter removed exactly the top card from the selected opposing Digimon's digivolution stack.",
        timing: effect === "security" ? "Security" : "Main",
      },
    ],
  };
}
