import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function spiralSwordBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 7;
  state.turnSeat = 0;
  state.memory = 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  if (effect === null || effect === "choose-main" || effect === "main-boosted") {
    const first = permanent("demo-spiral-sword-own-a", "BT2-052", 0, 3000);
    const second = permanent("demo-spiral-sword-own-b", "BT2-053", 0, effect === "main-boosted" ? 6000 : 3000);
    const opposing = permanent("demo-spiral-sword-opponent", "BT2-052", 1, 3000);
    you.battleArea.push(first, second);
    opponent.battleArea.push(opposing);
    if (effect === "main-boosted") you.trash.push(card("demo-spiral-sword-option", "BT2-103", 0));
    state.players.push(you, opponent);
    if (effect === null || effect === "choose-main") {
      return {
        state,
        decision: {
          decisionId: "demo-spiral-sword-main-selection",
          seat: 0,
          kind: "chooseTargets",
          promptText: "Give 1 of your Digimon +3000 DP",
          sourceCardId: "BT2-103",
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
  } else {
    const firstBlocker = permanent("demo-spiral-sword-blocker-a", "BT2-054", 0, 5000);
    firstBlocker.keywords.push("Blocker");
    firstBlocker.isSuspended = true;
    const secondBlocker = permanent("demo-spiral-sword-blocker-b", "BT2-072", 0, 5000);
    secondBlocker.keywords.push("Blocker");
    secondBlocker.isSuspended = effect === "choose-security-blocker";
    const nonBlocker = permanent("demo-spiral-sword-non-blocker", "BT2-052", 0, 3000);
    nonBlocker.isSuspended = true;
    you.battleArea.push(firstBlocker, secondBlocker, nonBlocker);
    state.players.push(you, opponent);
    if (effect === "choose-security-blocker") {
      return {
        state,
        decision: {
          decisionId: "demo-spiral-sword-security-selection",
          seat: 0,
          kind: "chooseTargets",
          promptText: "Unsuspend 1 of your Digimon with Blocker",
          sourceCardId: "BT2-103",
          options: {
            candidateInstanceIds: [firstBlocker.permanentId, secondBlocker.permanentId],
            visibleInstanceIds: [firstBlocker.permanentId, secondBlocker.permanentId, nonBlocker.permanentId],
            min: 1,
            max: 1,
            timing: "Security",
            effectText: "[Security] Unsuspend 1 of your Digimon with Blocker.",
          },
        },
      };
    }
  }

  const descriptions: Record<string, string> = {
    "main-boosted": "Spiral Sword gave exactly 1 selected own Digimon +3000 DP for the turn.",
    "security-unsuspended":
      "Security unsuspended exactly 1 selected Blocker; the other Blocker and non-Blocker stayed suspended.",
  };
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT2-103",
        effectKey: `BT2-103/${effect}`,
        description: descriptions[effect]!,
        timing: effect === "security-unsuspended" ? "Security" : "Main",
      },
    ],
  };
}
