import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function plesiomonDemo(effect: string | null): CardEffectsFixture {
  const whenDigivolving =
    "[When Digivolving] You may play 1 blue level 3 Digimon card or 1 level 4 or lower Digimon card with [Aqua] or [Sea Animal] in one of its traits from one of your blue Digimon's digivolution cards without paying its memory cost. Then, you may place 1 blue Digimon card from your hand under this Digimon as its bottom digivolution card.";
  const inherited =
    "[All Turns][Once Per Turn] When you play a Digimon from digivolution cards, you may return 1 of your opponent's Digimon of the same level to the bottom of its owner's deck.";
  const mode = effect ?? "play-optional";
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 8;
  state.turnSeat = 0;
  state.memory = 0;
  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "plesiomon-opponent");
  const plesiomon = permanent("demo-plesiomon", "EX3-023", 0, 11000, [
    { instanceId: "demo-plesiomon-base", cardId: "BT10-022" },
  ]);
  const sourceHost = permanent("demo-plesiomon-blue-host", "BT1-033", 0, 6000, [
    { instanceId: "demo-plesiomon-blue-level-three", cardId: "BT1-029" },
    { instanceId: "demo-plesiomon-sea-animal", cardId: "BT14-008" },
    { instanceId: "demo-plesiomon-invalid-blue-four", cardId: "EX3-019" },
    { instanceId: "demo-plesiomon-invalid-level-five", cardId: "BT2-029" },
  ]);
  const redHost = permanent("demo-plesiomon-red-host", "BT1-010", 0, 3000, [
    { instanceId: "demo-plesiomon-blue-under-red", cardId: "BT1-030" },
  ]);
  const firstBlue = card("demo-plesiomon-hand-blue-one", "BT1-030", 0);
  const secondBlue = card("demo-plesiomon-hand-blue-two", "BT1-031", 0);
  const invalidRed = card("demo-plesiomon-hand-red", "BT1-009", 0);
  const sameLevel = permanent("demo-plesiomon-opponent-level-three", "BT1-031", 1, 3000);
  const otherLevel = permanent("demo-plesiomon-opponent-level-four", "BT1-033", 1, 6000);
  you.battleArea.push(plesiomon, sourceHost, redHost);
  you.hand.push(firstBlue, secondBlue, invalidRed);
  you.handCount = you.hand.length;
  opponent.battleArea.push(sameLevel, otherLevel);
  state.players.push(you, opponent);

  if (mode === "play-optional" || mode === "place-optional") {
    return {
      state,
      decision: {
        decisionId: `demo-plesiomon-${mode}`,
        seat: 0,
        kind: "optional",
        promptText:
          mode === "play-optional"
            ? "Jogar gratuitamente 1 Digimon elegível das fontes de um dos seus Digimon azuis?"
            : "Colocar 1 Digimon azul da sua mão sob Plesiomon como a fonte de baixo? Esta segunda escolha é independente da primeira.",
        sourceCardId: "EX3-023",
        options: { timing: "WhenDigivolving", effectText: whenDigivolving },
      },
    };
  }
  if (mode === "source-choice") {
    const visible = [...sourceHost.stack, ...redHost.stack].map(({ instanceId }) => instanceId);
    return {
      state,
      decision: {
        decisionId: "demo-plesiomon-source-choice",
        seat: 0,
        kind: "selectCards",
        promptText: "Escolha 1 Digimon elegível das fontes de um dos seus Digimon azuis para jogar sem custo.",
        sourceCardId: "EX3-023",
        options: {
          candidateInstanceIds: ["demo-plesiomon-blue-level-three", "demo-plesiomon-sea-animal"],
          visibleInstanceIds: visible,
          min: 1,
          max: 1,
          timing: "WhenDigivolving",
          effectText: whenDigivolving,
        },
      },
    };
  }
  if (mode === "place-choice") {
    return {
      state,
      decision: {
        decisionId: "demo-plesiomon-place-choice",
        seat: 0,
        kind: "selectCards",
        promptText: "Escolha 1 Digimon azul da sua mão para colocar como a fonte de baixo de Plesiomon.",
        sourceCardId: "EX3-023",
        options: {
          candidateInstanceIds: [firstBlue.instanceId, secondBlue.instanceId],
          visibleInstanceIds: [firstBlue.instanceId, secondBlue.instanceId, invalidRed.instanceId],
          min: 1,
          max: 1,
          timing: "WhenDigivolving",
          effectText: whenDigivolving,
        },
      },
    };
  }
  if (mode === "inherited-target") {
    return {
      state,
      decision: {
        decisionId: "demo-plesiomon-inherited-target",
        seat: 0,
        kind: "chooseTargets",
        promptText: "Devolver ao fundo do baralho 1 Digimon adversário de nível 3, igual ao Digimon jogado das fontes?",
        sourceCardId: "EX3-023",
        options: {
          candidateInstanceIds: [sameLevel.permanentId],
          visibleInstanceIds: [sameLevel.permanentId, otherLevel.permanentId],
          min: 0,
          max: 1,
          timing: "AllTurns",
          effectText: inherited,
        },
      },
    };
  }

  let description: string;
  if (mode === "resolved") {
    const playedIndex = sourceHost.stack.findIndex(({ instanceId }) => instanceId === "demo-plesiomon-sea-animal");
    sourceHost.stack.splice(playedIndex, 1);
    you.battleArea.push(permanent("demo-plesiomon-played", "BT14-008", 0, 3000));
    plesiomon.stack.unshift(firstBlue);
    you.hand.splice(0, you.hand.length, secondBlue, invalidRed);
    you.handCount = 2;
    description =
      "Plesiomon jogou o Sea Animal elegível das fontes e depois colocou Gomamon da mão como sua fonte de baixo; as duas ações opcionais resolveram em sequência.";
  } else if (mode === "declined-play-place") {
    plesiomon.stack.unshift(firstBlue);
    you.hand.splice(0, you.hand.length, secondBlue, invalidRed);
    you.handCount = 2;
    description =
      "A primeira ação opcional foi recusada, mas a segunda continuou independente e colocou Gomamon da mão sob Plesiomon.";
  } else if (mode === "inherited-resolved") {
    opponent.battleArea.splice(0, opponent.battleArea.length, otherLevel);
    description =
      "O efeito herdado de Plesiomon devolveu apenas o Digimon de nível 3, igual ao Digimon jogado das fontes, ao fundo do baralho adversário.";
  } else if (mode === "inherited-opt")
    description =
      "O efeito herdado de Plesiomon já foi usado neste turno; o segundo Digimon jogado das fontes não abriu outra escolha.";
  else if (mode === "q2109")
    description =
      "Q2109: Plesiomon foi colocado como fonte depois que o Digimon já havia sido jogado; o efeito herdado não ativou retroativamente.";
  else if (mode === "hand-negative")
    description = "Um Digimon jogado da mão não acionou o efeito herdado de Plesiomon, que exige origem nas fontes.";
  else if (mode === "no-same-level")
    description =
      "Nenhum Digimon adversário tinha o mesmo nível do Digimon jogado das fontes; nenhuma escolha foi aberta.";
  else
    description =
      "Duas cópias herdadas observaram o mesmo evento; cada uma manteve sua própria marca de Once Per Turn e resolveu separadamente.";
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "EX3-023",
        effectKey: `EX3-023/${mode}`,
        description: `${description} ${mode.startsWith("inherited") || ["q2109", "hand-negative", "no-same-level", "two-copies"].includes(mode) ? inherited : whenDigivolving}`,
        timing: mode.startsWith("inherited") ? "AllTurns" : "WhenDigivolving",
      },
    ],
  };
}
