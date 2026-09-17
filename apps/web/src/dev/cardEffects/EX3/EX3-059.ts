import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function darkTyrannomonDemo(): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 6;
  state.turnSeat = 0;
  state.memory = 3;
  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "darktyrannomon-opponent");
  you.trash.push(card("demo-deleted-mastertyrannomon", "BT8-016", 0), card("demo-darktyrannomon-source", "EX3-059", 0));
  const elecmon = permanent("demo-ready-elecmon", "BT1-028", 1, 2000);
  const gabumon = permanent("demo-suspended-gabumon", "BT1-029", 1, 2000);
  gabumon.isSuspended = true;
  const agumon = permanent("demo-ready-agumon", "BT1-010", 1, 2000);
  opponent.battleArea.push(elecmon, gabumon, agumon);
  state.players.push(you, opponent);
  return {
    state,
    events: [
      {
        kind: "cardsMoved",
        instanceIds: ["demo-deleted-mastertyrannomon", "demo-darktyrannomon-source"],
        from: "battleArea",
        to: "trash",
      },
    ],
    decision: {
      decisionId: "demo-darktyrannomon-on-deletion",
      seat: 0,
      kind: "chooseTargets",
      promptText: "Choose an opposing Digimon to suspend",
      sourceCardId: "EX3-059",
      options: {
        candidateInstanceIds: [elecmon.permanentId, agumon.permanentId],
        visibleInstanceIds: [elecmon.permanentId, gabumon.permanentId, agumon.permanentId],
        min: 1,
        max: 1,
        timing: "OnDeletion",
        effectText: "[On Deletion] Suspend 1 of your opponent's Digimon.",
      },
    },
  };
}
