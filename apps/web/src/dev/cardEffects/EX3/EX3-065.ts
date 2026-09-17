import { GameState, Phase } from "@aegis/shared";
import { permanent, player, type CardEffectsFixture } from "../fixture";

export function hinaKuriharaDemo(effect: string | null, step: string | null): CardEffectsFixture {
  const dragonWatcherText =
    "[Your Turn] When one of your Digimon digivolves into a Digimon with [Rock Dragon], " +
    "[Earth Dragon], [Machine Dragon], or [Sky Dragon] in its traits, by suspending this Tamer, " +
    "activate 1 of that Digimon's [On Play] effects.";
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 6;
  state.turnSeat = 0;
  state.memory = step === "start-turn" ? 1 : 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const hina = permanent("demo-hina", "EX3-065", 0, 0);
  if (step === "resolved") hina.isSuspended = true;
  you.battleArea.push(hina);
  opponent.handCount = 5;

  if (effect !== "security") {
    you.battleArea.push(
      permanent("demo-volcanicdramon", "BT2-018", 0, 12000, [
        { instanceId: "demo-monochromon-source", cardId: "BT2-014" },
      ]),
    );
    if (step !== "resolved") opponent.battleArea.push(permanent("demo-elecmon", "BT1-028", 1, 3000));
  }
  state.players.push(you, opponent);

  if (effect === "security") {
    return {
      state,
      events: [{ kind: "cardsMoved", instanceIds: ["demo-hina-top"], from: "security", to: "battleArea" }],
    };
  }

  if (step === "start-turn") {
    opponent.battleArea.push(permanent("demo-gabumon", "BT1-029", 1, 2000));
    return {
      state,
      events: [{ kind: "memoryChanged", from: 0, to: 1, reason: "Hina Kurihara: opponent has a Digimon in play" }],
    };
  }

  if (step === "resolved") {
    return {
      state,
      events: [
        {
          kind: "effectTriggered",
          seat: 0,
          sourceCardId: "EX3-065",
          effectKey: "EX3-065/digivolve-dragon-trait-reactivate-onplay",
          description: "Suspended Hina Kurihara and activated Volcanicdramon's On Play effect.",
          timing: "OnEnterFieldAnyone",
        },
      ],
    };
  }

  return {
    state,
    decision: {
      decisionId: "demo-hina-dragon-on-play",
      seat: 0,
      kind: "optional",
      promptText: "Activate Hina Kurihara's effect?",
      sourceCardId: "EX3-065",
      options: {
        timing: "OnEnterFieldAnyone",
        effectText: dragonWatcherText,
      },
    },
  };
}
