import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function trumpSwordBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 7;
  state.turnSeat = 0;
  state.memory = 0;
  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const own = permanent("demo-trump-sword-own", "BT2-067", 0, 3000);
  const first = permanent("demo-trump-sword-first", "BT2-043", 1, 2000);
  const second = permanent("demo-trump-sword-second", "BT2-044", 1, 4000);
  const suspended = permanent("demo-trump-sword-suspended", "BT2-046", 1, 7000);
  suspended.isSuspended = true;
  you.battleArea.push(own);
  if (effect !== "resolved" && effect !== "security") opponent.battleArea.push(first, second, suspended);
  else {
    opponent.battleArea.push(first, suspended);
    opponent.trash.push(card("demo-trump-sword-deleted", "BT2-044", 1));
  }
  state.players.push(you, opponent);
  if (effect === null || effect === "choose-main") {
    return {
      state,
      decision: {
        decisionId: "demo-trump-sword-selection",
        seat: 0,
        kind: "chooseTargets",
        promptText: "Delete 1 opposing unsuspended Digimon",
        sourceCardId: "BT2-110",
        options: {
          candidateInstanceIds: [first.permanentId, second.permanentId],
          visibleInstanceIds: [own.permanentId, first.permanentId, second.permanentId, suspended.permanentId],
          min: 1,
          max: 1,
          timing: "Main",
          effectText: "[Main] Delete 1 of your opponent's unsuspended Digimon.",
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
        sourceCardId: "BT2-110",
        effectKey: `BT2-110/${effect}`,
        description:
          "Trump Sword deleted the selected unsuspended opposing Digimon while the suspended Digimon remained in play.",
        timing: effect === "security" ? "Security" : "Main",
      },
    ],
  };
}
