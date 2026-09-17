import { GameState, Phase } from "@aegis/shared";
import { permanent, player, type CardEffectsFixture } from "../fixture";

export function pomumonDemo(effect: string | null): CardEffectsFixture {
  const effectText = "[Your Turn] When an effect suspends this Digimon, suspend 1 of your opponent's Digimon.";
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 7;
  state.turnSeat = effect === "opponent-turn" ? 1 : 0;
  state.memory = 2;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "pomumon-opponent");
  const pomumon = permanent("demo-pomumon", "EX3-038", 0, 2000);
  pomumon.isSuspended = true;
  const elecmon = permanent("demo-pomumon-elecmon", "BT1-028", 1, 2000);
  const gabumon = permanent("demo-pomumon-gabumon", "BT1-029", 1, 2000, [
    { instanceId: "demo-pomumon-gabumon-source", cardId: "BT1-003" },
  ]);
  const agumon = permanent("demo-pomumon-agumon", "BT1-010", 1, 2000);
  agumon.isSuspended = true;
  you.battleArea.push(pomumon);
  opponent.battleArea.push(elecmon, gabumon, agumon);
  state.players.push(you, opponent);

  if (effect === "resolved") {
    gabumon.isSuspended = true;
    return {
      state,
      events: [
        {
          kind: "effectTriggered",
          seat: 0,
          sourceCardId: "EX3-038",
          effectKey: "EX3-038/your-turn-suspend",
          description: "Pomumon's [Your Turn] effect suspended Gabumon.",
          timing: "YourTurn",
        },
      ],
    };
  }

  if (effect === "not-effect" || effect === "opponent-turn") {
    return {
      state,
      events: [
        {
          kind: "effectTriggered",
          seat: 0,
          sourceCardId: "EX3-038",
          effectKey: `EX3-038/${effect}`,
          description:
            effect === "not-effect"
              ? "Pomumon was suspended by a game action, not an effect, so its effect did not trigger."
              : "Pomumon was suspended during the opponent's turn, so its [Your Turn] effect did not trigger.",
          timing: "YourTurn",
        },
      ],
    };
  }

  if (effect === "no-active-targets") {
    elecmon.isSuspended = true;
    gabumon.isSuspended = true;
    return { state };
  }

  return {
    state,
    decision: {
      decisionId: "demo-pomumon-suspend-target",
      seat: 0,
      kind: "chooseTargets",
      promptText: "Escolha 1 Digimon ativo do oponente para suspender.",
      sourceCardId: "EX3-038",
      options: {
        candidateInstanceIds: [elecmon.permanentId, gabumon.permanentId],
        visibleInstanceIds: [elecmon.permanentId, gabumon.permanentId, agumon.permanentId],
        min: 1,
        max: 1,
        timing: "YourTurn",
        effectText,
      },
    },
  };
}
