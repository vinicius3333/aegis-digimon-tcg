import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function hyperInfinityCannonDemo(effect: string | null, step: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 6;
  state.turnSeat = 0;
  state.memory = effect === "security" ? 0 : 4;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const costPaid = step === "delete";
  you.battleArea.push(
    permanent(
      "demo-machinedramon",
      "EX1-073",
      0,
      12000,
      costPaid
        ? [
            { instanceId: "demo-metalgreymon-cost", cardId: "BT1-021" },
            { instanceId: "demo-machinedramon-source", cardId: "BT1-114" },
          ]
        : [{ instanceId: "demo-machinedramon-source", cardId: "BT1-114" }],
    ),
  );
  you.battleArea.push(permanent("demo-machinedramon-alternative", "BT2-066", 0, 12000));
  if (!costPaid) you.hand.push(card("demo-metalgreymon-cost", "BT1-021", 0));
  you.hand.push(card("demo-agumon-hand", "BT1-010", 0));
  you.trash.push(card("demo-sealsdramon-cost", "EX3-049", 0));
  you.trash.push(card("demo-trial-trash", "EX3-069", 0));
  you.handCount = you.hand.length;

  const afterDeDigivolve = step !== null;
  opponent.battleArea.push(
    permanent(
      "demo-stacked-wargreymon",
      "BT1-025",
      1,
      11000,
      afterDeDigivolve
        ? [{ instanceId: "demo-stacked-bottom", cardId: "BT1-024" }]
        : [
            { instanceId: "demo-stacked-bottom", cardId: "BT1-024" },
            { instanceId: "demo-stacked-source-2", cardId: "BT1-021" },
            { instanceId: "demo-stacked-source-3", cardId: "BT1-020" },
            { instanceId: "demo-stacked-source-4", cardId: "BT1-015" },
          ],
    ),
  );
  opponent.battleArea.push(permanent("demo-weak", "BT1-028", 1, 3000));
  opponent.battleArea.push(permanent("demo-boundary", "BT1-030", 1, 6000));
  opponent.battleArea.push(permanent("demo-large", "BT1-029", 1, 7000));
  opponent.handCount = 5;
  state.players.push(you, opponent);

  const mainText =
    "[Main] ＜De-Digivolve 3＞ 1 of your opponent's Digimon. Then, by placing 1 card with [Cyborg] in its traits from your hand or trash under 1 of your level 6 Digimon with [Machine] in its traits as its bottom digivolution card, delete 1 of your opponent's Digimon with 6000 DP or less.";
  const effectText = effect === "security" ? `[Security] Activate this card's [Main] effect. ${mainText}` : mainText;
  const timing = effect === "security" ? "Security" : "Main";

  if (step === "optional") {
    return {
      state,
      decision: {
        decisionId: "demo-hyper-infinity-optional",
        seat: 0,
        kind: "optional",
        promptText: "Place a Cyborg card to delete a 6000 DP or lower Digimon?",
        sourceCardId: "EX3-066",
        options: { timing, effectText },
      },
    };
  }

  if (step === "cyborg") {
    return {
      state,
      decision: {
        decisionId: "demo-hyper-infinity-cyborg",
        seat: 0,
        kind: "selectCards",
        promptText: "Select cards",
        sourceCardId: "EX3-066",
        options: {
          candidateInstanceIds: ["demo-metalgreymon-cost", "demo-sealsdramon-cost"],
          visibleInstanceIds: [
            "demo-metalgreymon-cost",
            "demo-agumon-hand",
            "demo-sealsdramon-cost",
            "demo-trial-trash",
          ],
          min: 1,
          max: 1,
          timing,
          effectText,
        },
      },
    };
  }

  if (step === "host") {
    return {
      state,
      decision: {
        decisionId: "demo-hyper-infinity-host",
        seat: 0,
        kind: "chooseTargets",
        promptText: "Choose targets",
        sourceCardId: "EX3-066",
        options: {
          candidateInstanceIds: ["demo-machinedramon", "demo-machinedramon-alternative"],
          visibleInstanceIds: ["demo-machinedramon", "demo-machinedramon-alternative"],
          min: 1,
          max: 1,
          timing,
          effectText,
        },
      },
    };
  }

  const opponentIds = ["demo-stacked-wargreymon", "demo-weak", "demo-boundary", "demo-large"];
  return {
    state,
    decision: {
      decisionId: step === "delete" ? "demo-hyper-infinity-delete" : "demo-hyper-infinity-de-digivolve",
      seat: 0,
      kind: "chooseTargets",
      promptText: "Choose targets",
      sourceCardId: "EX3-066",
      options: {
        candidateInstanceIds: step === "delete" ? ["demo-weak", "demo-boundary"] : opponentIds,
        visibleInstanceIds: opponentIds,
        min: 1,
        max: 1,
        timing,
        effectText,
      },
    },
  };
}
