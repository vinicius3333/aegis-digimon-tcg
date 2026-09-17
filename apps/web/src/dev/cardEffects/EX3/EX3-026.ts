import { GameState, Phase } from "@aegis/shared";
import { permanent, player, type CardEffectsFixture } from "../fixture";

export function aegisdramonDemo(effect: string | null): CardEffectsFixture {
  const whenDigivolving =
    "[When Digivolving] You may play 1 blue level 3 Digimon card or 1 Digimon card with [Seadramon] in its name or [Aqua] or [Sea Animal] in one of its traits from one of your blue Digimon's digivolution cards without paying its memory cost.";
  const opponentTurn =
    "[Opponent's Turn][Once Per Turn] When your opponent plays a Digimon, you may activate 1 of this Digimon's [When Digivolving] effects.";
  const mode = effect ?? "when-digivolving";
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = mode === "reset" ? 9 : 8;
  state.turnSeat = mode.startsWith("opponent") || mode === "reset" || mode === "second-play" ? 1 : 0;
  state.memory = 0;
  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "aegisdramon-opponent");
  const aegis = permanent("demo-aegisdramon", "EX3-026", 0, 14000);
  const blueHost = permanent("demo-aegis-blue-host", "BT1-033", 0, 6000, [
    { instanceId: "demo-aegis-blue-l3", cardId: "BT1-029" },
    { instanceId: "demo-aegis-sea-animal", cardId: "BT14-008" },
    { instanceId: "demo-aegis-seadramon", cardId: "BT2-024" },
    { instanceId: "demo-aegis-blue-l4", cardId: "EX3-019" },
  ]);
  const redHost = permanent("demo-aegis-red-host", "BT1-010", 0, 2000, [
    { instanceId: "demo-aegis-under-red", cardId: "BT1-030" },
  ]);
  const visible = [
    { instanceId: "demo-aegis-blue-l3", cardId: "BT1-029" },
    { instanceId: "demo-aegis-sea-animal", cardId: "BT14-008" },
    { instanceId: "demo-aegis-seadramon", cardId: "BT2-024" },
    { instanceId: "demo-aegis-blue-l4", cardId: "EX3-019" },
    { instanceId: "demo-aegis-under-red", cardId: "BT1-030" },
  ];
  const candidates = visible.slice(0, 3).map(({ instanceId }) => instanceId);
  you.battleArea.push(aegis, blueHost, redHost);
  if (mode.startsWith("opponent") || mode === "second-play" || mode === "reset") {
    opponent.battleArea.push(permanent("demo-aegis-opponent-play", "BT1-010", 1, 2000));
  }
  opponent.handCount = 5;
  state.players.push(you, opponent);

  if (mode === "when-digivolving" || mode === "reset") {
    return {
      state,
      decision: {
        decisionId: `demo-aegis-${mode}`,
        seat: 0,
        kind: "optional",
        promptText:
          mode === "reset"
            ? "O turno mudou. Reativar o efeito When Digivolving de Aegisdramon para a nova jogada do oponente?"
            : "Jogar 1 carta elegível das fontes de um dos seus Digimon azuis sem pagar o custo?",
        sourceCardId: "EX3-026",
        options: {
          timing: mode === "reset" ? "OpponentsTurn" : "WhenDigivolving",
          effectText: mode === "reset" ? opponentTurn : whenDigivolving,
        },
      },
    };
  }
  if (mode === "opponent-reactivate") {
    return {
      state,
      decision: {
        decisionId: "demo-aegis-reactivate",
        seat: 0,
        kind: "optional",
        promptText: "Reativar o efeito When Digivolving deste Aegisdramon?",
        sourceCardId: "EX3-026",
        options: { timing: "OpponentsTurn", effectText: opponentTurn },
      },
    };
  }
  if (mode === "opponent-play") {
    return {
      state,
      decision: {
        decisionId: "demo-aegis-reactivated-play",
        seat: 0,
        kind: "optional",
        promptText: "O efeito foi reativado. Jogar 1 carta elegível das fontes de um Digimon azul?",
        sourceCardId: "EX3-026",
        options: { timing: "WhenDigivolving", effectText: whenDigivolving },
      },
    };
  }
  if (mode === "select" || mode === "opponent-select") {
    return {
      state,
      decision: {
        decisionId: `demo-aegis-${mode}`,
        seat: 0,
        kind: "selectCards",
        promptText: "Escolha 1 carta elegível das fontes dos seus Digimon azuis para jogar sem custo.",
        sourceCardId: "EX3-026",
        options: {
          candidateInstanceIds: candidates,
          visibleInstanceIds: visible.map(({ instanceId }) => instanceId),
          visibleCards: visible,
          min: 1,
          max: 1,
          timing: "WhenDigivolving",
          effectText: whenDigivolving,
        },
      },
    };
  }

  let description: string;
  if (mode === "resolved") {
    blueHost.stack.splice(1, 1);
    you.battleArea.push(permanent("demo-aegis-played-source", "BT14-008", 0, 3000));
    description =
      "Aegisdramon jogou Gizamon das fontes de Dolphmon sem pagar o custo; somente a fonte escolhida saiu da stack.";
  } else if (mode === "declined") {
    description = "O jogador recusou o efeito When Digivolving de Aegisdramon; nenhuma fonte saiu das stacks.";
  } else if (mode === "opponent-declined") {
    description = "A reativação opcional de Aegisdramon foi recusada; nenhuma fonte foi consumida.";
  } else if (mode === "second-play") {
    description =
      "Um segundo Digimon do oponente foi jogado no mesmo turno, mas o Once Per Turn de Aegisdramon já havia sido usado e não abriu nova ação.";
  } else {
    description =
      "O oponente jogou um Digimon durante o turno de Aegisdramon; o watcher de Opponent's Turn não ativou e nenhuma fonte foi consumida.";
  }
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "EX3-026",
        effectKey: `EX3-026/${mode}`,
        description: `${description} ${whenDigivolving} ${opponentTurn}`,
        timing: mode.startsWith("opponent") || mode === "second-play" ? "OpponentsTurn" : "WhenDigivolving",
      },
    ],
  };
}
