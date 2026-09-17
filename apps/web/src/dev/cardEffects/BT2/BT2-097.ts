import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function lightningPawBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 7;
  state.turnSeat = 0;
  state.memory = 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const targets = [0, 1, 2, 3].map((index) => permanent(`demo-lightning-paw-l3-${index}`, "BT1-009", 1, 4000));
  const levelFour = permanent("demo-lightning-paw-l4", "BT2-071", 1, 4000);
  if (effect === null || effect === "choose-exactly-three") {
    opponent.battleArea.push(...targets, levelFour);
  } else if (effect === "affected-three" || effect === "security-affected") {
    opponent.battleArea.push(targets[3]!, levelFour);
    opponent.trash.push(
      card("demo-lightning-paw-deleted-a", "BT1-009", 1),
      card("demo-lightning-paw-deleted-b", "BT1-009", 1),
      card("demo-lightning-paw-deleted-c", "BT1-009", 1),
    );
  } else if (effect === "fewer-than-three") {
    opponent.battleArea.push(levelFour);
    opponent.trash.push(
      card("demo-lightning-paw-deleted-a", "BT1-009", 1),
      card("demo-lightning-paw-deleted-b", "BT1-009", 1),
    );
  }
  if (effect !== "security-affected" && effect !== null && effect !== "choose-exactly-three") {
    you.trash.push(card("demo-lightning-paw-option", "BT2-097", 0));
  }
  state.players.push(you, opponent);

  const effectText = "[Main] 3 of your opponent's level 3 Digimon get -4000 DP for the turn.";
  if (effect === null || effect === "choose-exactly-three") {
    return {
      state,
      decision: {
        decisionId: "demo-lightning-paw-selection",
        seat: 0,
        kind: "chooseTargets",
        promptText: "Choose exactly 3 opposing level 3 Digimon",
        sourceCardId: "BT2-097",
        options: {
          candidateInstanceIds: targets.map((target) => target.permanentId),
          visibleInstanceIds: [...targets.map((target) => target.permanentId), levelFour.permanentId],
          min: 3,
          max: 3,
          timing: "Main",
          effectText,
        },
      },
    };
  }

  const descriptions: Record<string, string> = {
    "affected-three":
      "The errata required exactly 3 targets; all 3 received -4000 DP and were deleted, while the fourth remained.",
    "fewer-than-three": "With only 2 eligible Digimon, Lightning Paw affected both as many as possible.",
    "security-affected": "Security activated the errata Main effect and applied -4000 DP to exactly 3 level 3 Digimon.",
  };
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT2-097",
        effectKey: `BT2-097/${effect}`,
        description: descriptions[effect]!,
        timing: effect === "security-affected" ? "Security" : "Main",
      },
    ],
  };
}
