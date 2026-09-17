import { GameState, Phase } from "@aegis/shared";
import { permanent, player, type CardEffectsFixture } from "../fixture";

export function crysPaledramonDemo(effect: string | null): CardEffectsFixture {
  const effectText =
    "[When Digivolving] Trash any 2 digivolution cards under 1 of your opponent's Digimon. Then, 1 of your opponent's Digimon with no digivolution cards can't attack or block until the end of your opponent's turn.";
  const mode = effect ?? "host";
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = mode === "expired" ? 10 : 8;
  state.turnSeat = mode === "opponent-turn" || mode === "expired" ? 1 : 0;
  state.memory = 0;
  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "cryspaledramon-opponent");
  const crys = permanent("demo-crys", "EX3-021", 0, 7000, [{ instanceId: "demo-crys-base", cardId: "BT1-032" }]);
  const sourceHost = permanent("demo-crys-source-host", "BT1-033", 1, 6000, [
    { instanceId: "demo-crys-bottom", cardId: "BT1-003" },
    { instanceId: "demo-crys-lower-middle", cardId: "BT1-029" },
    { instanceId: "demo-crys-upper-middle", cardId: "BT1-030" },
    { instanceId: "demo-crys-top", cardId: "BT1-031" },
  ]);
  const shortHost = permanent("demo-crys-short-host", "EX3-020", 1, 7000, [
    { instanceId: "demo-crys-only-source", cardId: "EX3-018" },
  ]);
  const emptyTarget = permanent("demo-crys-empty-target", "BT1-032", 1, 5000);
  const otherEmptyTarget = permanent("demo-crys-other-empty", "ST18-07", 1, 5000);
  you.battleArea.push(crys);
  opponent.battleArea.push(sourceHost, shortHost, emptyTarget, otherEmptyTarget);
  state.players.push(you, opponent);

  if (mode === "host") {
    return {
      state,
      decision: {
        decisionId: "demo-crys-host",
        seat: 0,
        kind: "chooseTargets",
        promptText: "Escolha 1 Digimon do oponente que tenha fontes para remover até 2 delas.",
        sourceCardId: "EX3-021",
        options: {
          candidateInstanceIds: [sourceHost.permanentId, shortHost.permanentId],
          visibleInstanceIds: opponent.battleArea.map(({ permanentId }) => permanentId),
          min: 1,
          max: 1,
          timing: "WhenDigivolving",
          effectText,
        },
      },
    };
  }
  if (mode === "sources") {
    return {
      state,
      decision: {
        decisionId: "demo-crys-sources",
        seat: 0,
        kind: "selectCards",
        promptText: "Escolha quaisquer 2 fontes desse Digimon para enviar ao lixo; elas não precisam ser adjacentes.",
        sourceCardId: "EX3-021",
        options: {
          candidateInstanceIds: sourceHost.stack.map(({ instanceId }) => instanceId),
          visibleInstanceIds: sourceHost.stack.map(({ instanceId }) => instanceId),
          min: 2,
          max: 2,
          timing: "WhenDigivolving",
          effectText,
        },
      },
    };
  }
  if (mode === "restriction") {
    sourceHost.stack.splice(1, 1);
    sourceHost.stack.splice(2, 1);
    return {
      state,
      decision: {
        decisionId: "demo-crys-restriction",
        seat: 0,
        kind: "chooseTargets",
        promptText:
          "Agora escolha 1 Digimon adversário sem fontes. Os alvos foram reavaliados depois que as 2 fontes foram removidas.",
        sourceCardId: "EX3-021",
        options: {
          candidateInstanceIds: [emptyTarget.permanentId, otherEmptyTarget.permanentId],
          visibleInstanceIds: opponent.battleArea.map(({ permanentId }) => permanentId),
          min: 1,
          max: 1,
          timing: "WhenDigivolving",
          effectText,
        },
      },
    };
  }
  if (mode === "short-restriction") {
    shortHost.stack.splice(0, 1);
    return {
      state,
      decision: {
        decisionId: "demo-crys-short-restriction",
        seat: 0,
        kind: "chooseTargets",
        promptText:
          "Apenas 1 fonte existia e foi removida. Escolha esse Digimon agora vazio ou outro Digimon sem fontes para restringir.",
        sourceCardId: "EX3-021",
        options: {
          candidateInstanceIds: [shortHost.permanentId, emptyTarget.permanentId, otherEmptyTarget.permanentId],
          visibleInstanceIds: opponent.battleArea.map(({ permanentId }) => permanentId),
          min: 1,
          max: 1,
          timing: "WhenDigivolving",
          effectText,
        },
      },
    };
  }

  let description: string;
  if (mode === "resolved") {
    const removed = [sourceHost.stack[1]!, sourceHost.stack[3]!];
    sourceHost.stack.splice(3, 1);
    sourceHost.stack.splice(1, 1);
    opponent.trash.push(...removed);
    description =
      "CrysPaledramon removeu 2 fontes não adjacentes; Paledramon, escolhido depois da remoção, não pode atacar nem bloquear até o fim do turno do oponente.";
  } else if (mode === "short-source") {
    const removed = shortHost.stack.pop()!;
    opponent.trash.push(removed);
    description =
      "Havia apenas 1 fonte, então CrysPaledramon fez o máximo possível e removeu essa carta; Wingdramon agora vazio pôde ser o segundo alvo (Q3392).";
  } else if (mode === "no-sources")
    description =
      "Nenhum Digimon adversário tinha fontes: a primeira etapa foi ignorada, mas o efeito Then ainda restringiu Paledramon.";
  else if (mode === "combat") {
    otherEmptyTarget.isSuspended = false;
    description =
      "O Digimon restringido não apareceu na janela de Blocker e não pôde declarar ataque enquanto a restrição estava ativa.";
  } else if (mode === "opponent-turn")
    description = "Durante todo o turno do oponente, Paledramon continuou sem poder atacar ou bloquear.";
  else
    description =
      "Ao terminar o turno do oponente, as restrições de ataque e bloqueio expiraram; Paledramon voltou a poder agir.";
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "EX3-021",
        effectKey: `EX3-021/${mode}`,
        description: `${description} ${effectText}`,
        timing: "WhenDigivolving",
      },
    ],
  };
}
