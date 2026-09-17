import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function kimeramonBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 8;
  state.turnSeat = 0;
  state.memory = 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const kimeramon = permanent("demo-kimeramon-bt2", "BT2-077", 0, 7000);
  const cost = permanent("demo-kimeramon-bt2-cost", "BT2-067", 0, 3000);
  const breeding = permanent("demo-kimeramon-bt2-breeding", "BT2-067", 0, 3000);
  breeding.inBreeding = true;
  const levelFive = permanent("demo-kimeramon-bt2-level-five", "BT1-074", 1, 7000);
  const higherLevel = permanent("demo-kimeramon-bt2-higher-level", "BT1-084", 1, 15000);
  you.battleArea.push(kimeramon);
  if (effect !== "resolved") you.battleArea.push(cost);
  you.breeding = breeding;
  opponent.battleArea.push(higherLevel);
  if (effect !== "resolved") opponent.battleArea.push(levelFive);
  if (effect === "resolved") {
    you.trash.push(card("demo-kimeramon-bt2-cost-card", "BT2-067", 0));
    opponent.trash.push(card("demo-kimeramon-bt2-target-card", "BT1-074", 1));
  }
  state.players.push(you, opponent);

  const effectText =
    "[On Play] You may delete one of your other Digimon to delete 1 of your opponent's level 5 or lower Digimon.";
  if (effect === null || effect === "optional") {
    return {
      state,
      decision: {
        decisionId: "demo-kimeramon-bt2-optional",
        seat: 0,
        kind: "optional",
        promptText: "Use Kimeramon's On Play effect?",
        sourceCardId: "BT2-077",
        options: { timing: "OnPlay", effectText },
      },
    };
  }
  if (effect === "choose-cost") {
    return {
      state,
      decision: {
        decisionId: "demo-kimeramon-bt2-cost",
        seat: 0,
        kind: "chooseTargets",
        promptText: "Delete 1 of your other Digimon",
        sourceCardId: "BT2-077",
        options: {
          candidateInstanceIds: [cost.permanentId],
          min: 1,
          max: 1,
          timing: "OnPlay",
          effectText,
        },
      },
    };
  }
  if (effect === "choose-target") {
    return {
      state,
      decision: {
        decisionId: "demo-kimeramon-bt2-target",
        seat: 0,
        kind: "chooseTargets",
        promptText: "Delete 1 opposing level 5 or lower Digimon",
        sourceCardId: "BT2-077",
        options: {
          candidateInstanceIds: [levelFive.permanentId],
          min: 1,
          max: 1,
          timing: "OnPlay",
          effectText,
        },
      },
    };
  }

  const descriptions: Record<string, string> = {
    resolved: "Kimeramon deleted another battle-area Digimon as the cost, then deleted the opposing level 5 Digimon.",
    declined: "Kimeramon's optional On Play effect was declined, so neither Digimon was deleted.",
  };
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT2-077",
        effectKey: `BT2-077/${effect}`,
        description: descriptions[effect]!,
        timing: "OnPlay",
      },
    ],
  };
}
