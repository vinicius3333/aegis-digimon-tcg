import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function heatViperBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 7;
  state.turnSeat = 0;
  state.memory = 0;
  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const cost = permanent("demo-heat-viper-cost", "BT2-067", 0, 3000);
  const levelThree = permanent("demo-heat-viper-lv3", "BT2-043", 1, 2000);
  const levelFour = permanent("demo-heat-viper-lv4", "BT2-044", 1, 4000);
  const levelFive = permanent("demo-heat-viper-lv5", "BT2-046", 1, 7000);
  if (effect === "security") {
    you.hand.push(card("demo-heat-viper-security", "BT2-109", 0));
  } else if (effect !== "resolved") {
    you.battleArea.push(cost);
    opponent.battleArea.push(levelThree, levelFour, levelFive);
  } else {
    you.trash.push(card("demo-heat-viper-cost-trash", "BT2-067", 0));
    opponent.battleArea.push(levelFive);
    opponent.trash.push(
      card("demo-heat-viper-lv3-trash", "BT2-043", 1),
      card("demo-heat-viper-lv4-trash", "BT2-044", 1),
    );
  }
  state.players.push(you, opponent);
  if (effect === null || effect === "pay-cost") {
    return {
      state,
      decision: {
        decisionId: "demo-heat-viper-cost-decision",
        seat: 0,
        kind: "optional",
        promptText: "Delete 1 of your Digimon to activate Heat Viper?",
        sourceCardId: "BT2-109",
        options: {
          candidateInstanceIds: [cost.permanentId],
          visibleInstanceIds: [cost.permanentId],
          timing: "Main",
          effectText: "You may delete 1 of your Digimon to delete up to 2 opposing level 4 or lower Digimon.",
        },
      },
    };
  }
  if (effect === "choose-targets") {
    return {
      state,
      decision: {
        decisionId: "demo-heat-viper-targets",
        seat: 0,
        kind: "chooseTargets",
        promptText: "Delete up to 2 opposing level 4 or lower Digimon",
        sourceCardId: "BT2-109",
        options: {
          candidateInstanceIds: [levelThree.permanentId, levelFour.permanentId],
          visibleInstanceIds: [levelThree.permanentId, levelFour.permanentId, levelFive.permanentId],
          min: 0,
          max: 2,
          timing: "Main",
          effectText: "Delete up to 2 of your opponent's level 4 or lower Digimon.",
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
        sourceCardId: "BT2-109",
        effectKey: `BT2-109/${effect}`,
        description:
          effect === "security"
            ? "Heat Viper's Security effect added itself to its owner's hand."
            : "Heat Viper deleted one own Digimon and both eligible opposing Digimon; the level 5 Digimon remained.",
        timing: effect === "security" ? "Security" : "Main",
      },
    ],
  };
}
