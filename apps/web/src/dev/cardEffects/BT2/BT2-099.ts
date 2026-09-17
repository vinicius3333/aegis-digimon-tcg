import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function gloriousBurstBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 7;
  state.turnSeat = 0;
  state.memory = effect === "two-yellow-tamers" ? 3 : effect === "only-own-yellow-counts" ? 1 : 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  if (effect === "two-yellow-tamers") {
    you.battleArea.push(
      permanent("demo-glorious-burst-tamer-a", "BT1-087", 0, 0),
      permanent("demo-glorious-burst-tamer-b", "BT1-087", 0, 0),
    );
  } else if (effect === "only-own-yellow-counts") {
    you.battleArea.push(
      permanent("demo-glorious-burst-own-yellow", "BT1-087", 0, 0),
      permanent("demo-glorious-burst-own-blue", "BT2-085", 0, 0),
    );
    opponent.battleArea.push(permanent("demo-glorious-burst-opponent-yellow", "BT1-087", 1, 0));
  }
  const first = permanent(
    "demo-glorious-burst-first",
    "BT2-083",
    1,
    effect === null || effect === "choose-one-target" ? 13000 : 1000,
  );
  const second = permanent("demo-glorious-burst-second", "BT2-083", 1, 13000);
  opponent.battleArea.push(first, second);
  if (effect !== null && effect !== "choose-one-target") {
    you.trash.push(card("demo-glorious-burst-option", "BT2-099", 0));
  }
  state.players.push(you, opponent);

  const effectText = "[Main] 1 of your opponent's Digimon gets -12000 DP for the turn.";
  if (effect === null || effect === "choose-one-target") {
    return {
      state,
      decision: {
        decisionId: "demo-glorious-burst-selection",
        seat: 0,
        kind: "chooseTargets",
        promptText: "Choose 1 opposing Digimon for -12000 DP",
        sourceCardId: "BT2-099",
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

  const descriptions: Record<string, string> = {
    "full-cost": "With no yellow Tamer, Glorious Burst used its full 9 memory cost.",
    "two-yellow-tamers": "Two own yellow Tamers reduced Glorious Burst's use cost from 9 to 7.",
    "only-own-yellow-counts": "Only the controller's yellow Tamer counted; blue and opposing yellow Tamers did not.",
    "one-target": "Exactly 1 selected opposing Digimon received the full -12000 DP; the second was unchanged.",
  };
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT2-099",
        effectKey: `BT2-099/${effect}`,
        description: descriptions[effect]!,
        timing: "Main",
      },
    ],
  };
}
