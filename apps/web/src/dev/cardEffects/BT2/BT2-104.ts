import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function atomicRayBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 7;
  state.turnSeat = 0;
  state.memory = 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const first = permanent("demo-atomic-ray-blocker-a", "BT2-054", 0, effect === "security-all" ? 10000 : 5000);
  first.keywords.push("Blocker");
  first.isSuspended = effect !== "security-all";
  const second = permanent("demo-atomic-ray-blocker-b", "BT2-058", 0, effect === "security-all" ? 12000 : 7000);
  second.keywords.push("Blocker");
  second.isSuspended = effect === null || effect === "choose-main";
  const nonBlocker = permanent("demo-atomic-ray-non-blocker", "BT2-052", 0, 3000);
  nonBlocker.isSuspended = true;
  you.battleArea.push(first, second, nonBlocker);
  if (effect === "main-one") you.trash.push(card("demo-atomic-ray-option", "BT2-104", 0));
  state.players.push(you, opponent);

  const effectText = "[Main] Unsuspend 1 of your Digimon with Blocker.";
  if (effect === null || effect === "choose-main") {
    return {
      state,
      decision: {
        decisionId: "demo-atomic-ray-main-selection",
        seat: 0,
        kind: "chooseTargets",
        promptText: "Unsuspend 1 of your Blockers",
        sourceCardId: "BT2-104",
        options: {
          candidateInstanceIds: [first.permanentId, second.permanentId],
          visibleInstanceIds: [first.permanentId, second.permanentId, nonBlocker.permanentId],
          min: 1,
          max: 1,
          timing: "Main",
          effectText,
        },
      },
    };
  }

  const descriptions: Record<string, string> = {
    "main-one": "Atomic Ray unsuspended exactly 1 selected own Blocker; the other targets were unchanged.",
    "security-all":
      "Security unsuspended all own Blockers and gave every one +5000 DP, while the non-Blocker remained suspended and unchanged.",
  };
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT2-104",
        effectKey: `BT2-104/${effect}`,
        description: descriptions[effect]!,
        timing: effect === "security-all" ? "Security" : "Main",
      },
    ],
  };
}
