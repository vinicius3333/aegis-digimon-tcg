import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function wereGarurumonBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 8;
  state.turnSeat = 0;
  state.memory = 2;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const hostCardId = effect === "top-card" ? "BT2-078" : "BT2-079";
  const under = effect === "top-card" ? [] : [{ instanceId: "demo-weregarurumon-bt2-source", cardId: "BT2-078" }];
  const host = permanent("demo-weregarurumon-bt2-host", hostCardId, 0, effect === "top-card" ? 7000 : 10000, under);
  host.isSuspended = effect === "declined" || effect === "once-used" || effect === "top-card";
  you.battleArea.push(host);
  const firstCost = permanent("demo-weregarurumon-bt2-first-cost", "BT2-068", 0, 1000);
  const secondCost = permanent("demo-weregarurumon-bt2-second-cost", "BT2-070", 0, 2000);
  if (effect !== "unsuspended") you.battleArea.push(firstCost);
  if (effect === "choose-cost" || effect === "once-used") you.battleArea.push(secondCost);
  if (effect === "choose-cost") {
    const breeding = permanent("demo-weregarurumon-bt2-breeding", "BT2-067", 0, 3000);
    breeding.inBreeding = true;
    you.breeding = breeding;
  }
  if (effect === "unsuspended") you.trash.push(card("demo-weregarurumon-bt2-paid", "BT2-068", 0));
  state.players.push(you, opponent);

  const effectText =
    "[When Attacking] [Once Per Turn] You may delete 1 of your other Digimon to unsuspend this Digimon.";
  if (effect === null || effect === "optional") {
    return {
      state,
      decision: {
        decisionId: "demo-weregarurumon-bt2-optional",
        seat: 0,
        kind: "optional",
        promptText: "Use WereGarurumon's inherited effect?",
        sourceCardId: "BT2-078",
        options: { timing: "WhenAttacking", effectText },
      },
    };
  }
  if (effect === "choose-cost") {
    return {
      state,
      decision: {
        decisionId: "demo-weregarurumon-bt2-cost",
        seat: 0,
        kind: "chooseTargets",
        promptText: "Delete 1 of your other Digimon",
        sourceCardId: "BT2-078",
        options: {
          candidateInstanceIds: [firstCost.permanentId, secondCost.permanentId],
          min: 1,
          max: 1,
          timing: "WhenAttacking",
          effectText,
        },
      },
    };
  }

  const descriptions: Record<string, string> = {
    unsuspended: "The host deleted another Digimon as the cost and unsuspended during its attack.",
    declined:
      "The optional inherited effect was declined, so the host remained suspended and the other Digimon survived.",
    "once-used":
      "On the second attack that turn, the inherited effect could not activate again and the host remained suspended.",
    "top-card": "WereGarurumon was the top card, so its inherited When Attacking effect did not activate.",
  };
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT2-078",
        effectKey: `BT2-078/${effect}`,
        description: descriptions[effect]!,
        timing: "WhenAttacking",
      },
    ],
  };
}
