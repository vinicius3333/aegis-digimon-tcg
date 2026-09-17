import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function breakdramonDemo(effect: string | null): CardEffectsFixture {
  const suspensionEffect =
    "[All Turns][Once Per Turn] When this Digimon becomes suspended, suspend 1 of your opponent's Digimon.";
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 7;
  state.turnSeat = 0;
  state.memory = 3;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const breakdramon = permanent("demo-breakdramon", "EX3-044", 0, 12000, [
    { instanceId: "demo-breakdramon-base", cardId: "EX3-041" },
  ]);
  const elecmon = permanent("demo-breakdramon-elecmon", "BT1-028", 1, 2000);
  const gabumon = permanent("demo-breakdramon-gabumon", "BT1-029", 1, 2000);
  const agumon = permanent("demo-breakdramon-agumon", "BT1-010", 1, 2000);
  opponent.handCount = 5;

  if (effect === "security") {
    breakdramon.isSuspended = true;
    you.battleArea.push(breakdramon);
    opponent.securityCount = 4;
    opponent.trash.push(
      card("demo-breakdramon-defender", "BT1-028", 1),
      card("demo-breakdramon-security", "BT1-003", 1),
    );
    state.players.push(you, opponent);
    return {
      state,
      events: [
        {
          kind: "effectTriggered",
          seat: 0,
          sourceCardId: "EX3-044",
          effectKey: "EX3-044/security-trash",
          description: "Breakdramon venceu a batalha e descartou a carta do topo da segurança do oponente.",
          timing: "AllTurns",
        },
        { kind: "cardsMoved", instanceIds: ["demo-breakdramon-defender"], from: "battleArea", to: "trash" },
        { kind: "cardsMoved", instanceIds: ["demo-breakdramon-security"], from: "security", to: "trash" },
      ],
    };
  }

  if (effect === "inherited") {
    const wingdramon = permanent("demo-breakdramon-wingdramon", "EX3-020", 0, 7000, [
      { instanceId: "demo-breakdramon-inherited", cardId: "EX3-044" },
    ]);
    wingdramon.isSuspended = true;
    you.battleArea.push(wingdramon);
    opponent.securityCount = 4;
    opponent.trash.push(
      card("demo-breakdramon-inherited-defender", "BT1-028", 1),
      card("demo-breakdramon-inherited-security", "BT1-003", 1),
    );
    state.players.push(you, opponent);
    return {
      state,
      events: [
        {
          kind: "effectTriggered",
          seat: 0,
          sourceCardId: "EX3-044",
          effectKey: "EX3-044/inherited-security-trash",
          description: "O efeito herdado de Breakdramon descartou a carta do topo da segurança do oponente.",
          timing: "AllTurns",
        },
        {
          kind: "cardsMoved",
          instanceIds: ["demo-breakdramon-inherited-defender"],
          from: "battleArea",
          to: "trash",
        },
        {
          kind: "cardsMoved",
          instanceIds: ["demo-breakdramon-inherited-security"],
          from: "security",
          to: "trash",
        },
      ],
    };
  }

  breakdramon.isSuspended = true;
  gabumon.isSuspended = true;
  you.battleArea.push(breakdramon);
  opponent.battleArea.push(elecmon, gabumon, agumon);
  state.players.push(you, opponent);
  return {
    state,
    decision: {
      decisionId: "demo-breakdramon-suspend",
      seat: 0,
      kind: "chooseTargets",
      promptText: "Escolha 1 Digimon ativo do oponente para suspender",
      sourceCardId: "EX3-044",
      options: {
        candidateInstanceIds: [elecmon.permanentId, agumon.permanentId],
        visibleInstanceIds: [elecmon.permanentId, gabumon.permanentId, agumon.permanentId],
        min: 1,
        max: 1,
        timing: "AllTurns",
        effectText: suspensionEffect,
      },
    },
  };
}
