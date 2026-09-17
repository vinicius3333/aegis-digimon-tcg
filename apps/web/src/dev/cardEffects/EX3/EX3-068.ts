import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function godFlameDemo(effect: string | null, step: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 6;
  state.turnSeat = 0;
  state.memory = effect === "security" ? 0 : 5;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  you.battleArea.push(permanent("demo-angewomon", "EX3-034", 0, 6000));
  const megidramon = permanent("demo-megidramon", "EX3-064", 1, 12000);
  if (step === "optional" || step === "recovery") megidramon.currentDP = 6000;
  opponent.battleArea.push(megidramon);
  opponent.battleArea.push(permanent("demo-examon", "EX3-074", 1, 15000));
  you.trash.push(card("demo-azulongmon-trash", "EX3-025", 0));
  you.trash.push(card("demo-trial-trash", "EX3-069", 0));
  you.trash.push(card("demo-agumon-trash", "BT1-010", 0));
  opponent.handCount = 5;
  state.players.push(you, opponent);

  const mainText =
    "[Main] 1 of your opponent's Digimon gets -6000 DP for the turn. Then, you may return 1 card with the [Four Great Dragons] trait from your trash to your hand.";
  const effectText = effect === "security" ? `[Security] Activate this card's [Main] effect. ${mainText}` : mainText;
  const timing = effect === "security" ? "Security" : "Main";

  if (step === "optional") {
    return {
      state,
      decision: {
        decisionId: "demo-god-flame-optional",
        seat: 0,
        kind: "optional",
        promptText: "Return a Four Great Dragons card to your hand?",
        sourceCardId: "EX3-068",
        options: { timing, effectText },
      },
    };
  }

  if (step === "recovery") {
    return {
      state,
      decision: {
        decisionId: "demo-god-flame-recovery",
        seat: 0,
        kind: "selectCards",
        promptText: "Select cards",
        sourceCardId: "EX3-068",
        options: {
          candidateInstanceIds: ["demo-azulongmon-trash", "demo-trial-trash"],
          visibleInstanceIds: ["demo-azulongmon-trash", "demo-trial-trash", "demo-agumon-trash"],
          min: 1,
          max: 1,
          timing,
          effectText,
        },
      },
    };
  }

  return {
    state,
    decision: {
      decisionId: "demo-god-flame-dp",
      seat: 0,
      kind: "chooseTargets",
      promptText: "Choose targets",
      sourceCardId: "EX3-068",
      options: {
        candidateInstanceIds: ["demo-megidramon", "demo-examon"],
        visibleInstanceIds: ["demo-megidramon", "demo-examon"],
        min: 1,
        max: 1,
        timing,
        effectText,
      },
    },
  };
}
