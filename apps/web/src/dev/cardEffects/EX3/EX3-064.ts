import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function megidramonDemo(effect: string | null, step: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 6;
  state.turnSeat = 0;
  state.memory = 0;
  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const megidramon = permanent("demo-megidramon", "EX3-064", 0, 12000);
  const onDeletionText =
    "[On Deletion] If you don't have Trial of the Four Great Dragons in play, you may place 1 Trial of the Four Great Dragons from your hand in your battle area.";

  if (step === "optional" || step === "trial" || step === "resolved") {
    you.trash.push(megidramon.topCard!);
    if (step === "resolved") you.battleArea.push(permanent("demo-trial", "EX3-069", 0, 0));
    else you.hand.push(card("demo-trial-hand", "EX3-069", 0), card("demo-agumon-hand", "BT1-010", 0));
    you.handCount = you.hand.length;
    state.players.push(you, opponent);
    if (step === "resolved") {
      return {
        state,
        events: [{ kind: "cardsMoved", instanceIds: ["demo-trial-hand"], from: "hand", to: "battleArea" }],
      };
    }
    return {
      state,
      decision:
        step === "optional"
          ? {
              decisionId: "demo-megidramon-place-trial-optional",
              seat: 0,
              kind: "optional",
              promptText: "Place Trial of the Four Great Dragons in your battle area?",
              sourceCardId: "EX3-064",
              options: { timing: "OnDeletion", effectText: onDeletionText },
            }
          : {
              decisionId: "demo-megidramon-select-trial",
              seat: 0,
              kind: "selectCards",
              promptText: "Choose Trial of the Four Great Dragons",
              sourceCardId: "EX3-064",
              options: {
                candidateInstanceIds: ["demo-trial-hand"],
                visibleInstanceIds: ["demo-trial-hand", "demo-agumon-hand"],
                min: 1,
                max: 1,
                timing: "OnDeletion",
                effectText: onDeletionText,
              },
            },
    };
  }

  you.battleArea.push(megidramon);
  opponent.battleArea.push(permanent("demo-level-5", "BT1-020", 1, 7000));
  opponent.battleArea.push(permanent("demo-level-6", "BT1-025", 1, 10000));
  opponent.battleArea.push(permanent("demo-level-7", "AD1-025", 1, 14000));
  state.players.push(you, opponent);
  return {
    state,
    decision: {
      decisionId: "demo-megidramon-on-play",
      seat: 0,
      kind: "chooseTargets",
      promptText:
        effect === "trial"
          ? "Choose a level 6 or lower Digimon to delete"
          : "Choose a level 5 or lower Digimon to delete",
      sourceCardId: "EX3-064",
      options: {
        candidateInstanceIds: effect === "trial" ? ["demo-level-5", "demo-level-6"] : ["demo-level-5"],
        visibleInstanceIds: ["demo-level-5", "demo-level-6", "demo-level-7"],
        min: 1,
        max: 1,
        timing: "OnPlay",
        effectText:
          "[On Play] Delete 1 of your opponent's level 5 or lower Digimon. If this card was played by Trial of the Four Great Dragons' effect, delete 1 of your opponent's level 6 or lower Digimon instead.",
      },
    },
  };
}
