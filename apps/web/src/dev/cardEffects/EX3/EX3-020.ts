import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function wingdramonDemo(effect: string | null): CardEffectsFixture {
  const endTurn =
    "[End of Your Turn] This Digimon and 1 of your other Digimon with [Dramon] in its name may DNA digivolve into a Digimon card in your hand by paying its DNA digivolve cost.";
  const inherited =
    "[All Turns] While this Digimon has [Dramon] or [Examon] in its name, it gains ＜Evade＞. (When this Digimon would be deleted, you may suspend it to prevent that deletion.)";
  const mode = effect ?? "end-turn";
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 8;
  state.turnSeat = mode === "treat-opponent" ? 1 : 0;
  state.memory = 0;
  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "wingdramon-opponent");
  const wing = permanent("demo-wingdramon", "EX3-020", 0, 7000, [
    { instanceId: "demo-wing-coredramon", cardId: "EX3-018" },
  ]);
  const firstPartner = permanent("demo-wing-first-partner", "BT20-044", 0, 12000);
  const secondPartner = permanent("demo-wing-second-partner", "EX3-024", 0, 12000);
  const incompatibleDramon = permanent("demo-wing-incompatible", "EX3-021", 0, 7000);
  const unrelated = permanent("demo-wing-unrelated", "BT1-032", 0, 5000);
  const firstExamon = card("demo-wing-examon-one", "EX3-074", 0);
  const secondExamon = card("demo-wing-examon-two", "EX3-074", 0);
  const incompatibleDna = card("demo-wing-incompatible-dna", "EX3-063", 0);
  const normalEvolution = card("demo-wing-normal-evolution", "EX3-024", 0);

  if (mode === "resolved") {
    const examon = permanent("demo-wing-resolved-examon", "EX3-074", 0, 15000, [
      wing.topCard,
      ...wing.stack,
      firstPartner.topCard,
    ]);
    you.battleArea.push(examon);
    state.players.push(you, opponent);
    return {
      state,
      events: [
        {
          kind: "effectTriggered",
          seat: 0,
          sourceCardId: "EX3-020",
          effectKey: "EX3-020/resolved",
          description:
            "Wingdramon tratou-se como nível 6 para Examon, escolheu Breakdramon e os dois DNA digievoluíram em Examon no fim do turno.",
          timing: "EndOfYourTurn",
        },
      ],
    };
  }

  if (
    [
      "evade",
      "evade-declined",
      "evade-disabled",
      "inherited-evade",
      "inherited-negative",
      "inherited-disabled",
    ].includes(mode)
  ) {
    const inheritedMode = mode.startsWith("inherited");
    const eligible = mode !== "inherited-negative";
    const host = inheritedMode
      ? permanent("demo-wing-inherited-host", eligible ? "EX3-019" : "BT1-038", 0, eligible ? 6000 : 7000, [
          { instanceId: "demo-wing-inherited-source", cardId: "EX3-020" },
        ])
      : wing;
    host.isSuspended = mode === "evade" || mode === "inherited-evade" || mode.endsWith("disabled");
    if (eligible) host.grantedKeywords.push("Evade");
    if (!mode.includes("declined") && !mode.endsWith("disabled")) you.battleArea.push(host);
    else you.trash.push(host.topCard, ...host.stack);
    state.players.push(you, opponent);
    const descriptions: Record<string, string> = {
      evade: "Wingdramon aceitou Evade, suspendeu-se e evitou a deleção por efeito.",
      "evade-declined": "Wingdramon recusou Evade e foi enviado ao lixo pela deleção.",
      "evade-disabled": "Wingdramon já estava suspenso; Evade ficou indisponível e não evitou a deleção.",
      "inherited-evade": "Paledramon tem Dramon no nome, recebeu Evade herdado de Wingdramon e evitou a deleção.",
      "inherited-negative": "O host não tem Dramon nem Examon no nome; não recebeu Evade herdado de Wingdramon.",
      "inherited-disabled":
        "O host com Evade herdado já estava suspenso; a ação ficou indisponível e ele foi deletado.",
    };
    return {
      state,
      events: [
        {
          kind: "effectTriggered",
          seat: 0,
          sourceCardId: "EX3-020",
          effectKey: `EX3-020/${mode}`,
          description: `${descriptions[mode]} ${inheritedMode ? inherited : "＜Evade＞ (When this Digimon would be deleted, you may suspend it to prevent that deletion.)"}`,
          timing: inheritedMode ? "AllTurns" : "Static",
        },
      ],
    };
  }

  you.battleArea.push(wing, firstPartner, secondPartner, incompatibleDramon, unrelated);
  you.hand.push(firstExamon, secondExamon, incompatibleDna, normalEvolution);
  you.handCount = you.hand.length;
  state.players.push(you, opponent);
  if (mode === "partner") {
    return {
      state,
      decision: {
        decisionId: "demo-wing-partner",
        seat: 0,
        kind: "chooseTargets",
        promptText: "Escolha 1 dos seus outros Digimon com Dramon no nome que forme uma DNA válida com Wingdramon.",
        sourceCardId: "EX3-020",
        options: {
          candidateInstanceIds: [firstPartner.permanentId, secondPartner.permanentId],
          visibleInstanceIds: [
            firstPartner.permanentId,
            secondPartner.permanentId,
            incompatibleDramon.permanentId,
            unrelated.permanentId,
          ],
          min: 1,
          max: 1,
          timing: "EndOfYourTurn",
          effectText: endTurn,
        },
      },
    };
  }
  if (mode === "result") {
    return {
      state,
      decision: {
        decisionId: "demo-wing-result",
        seat: 0,
        kind: "selectCards",
        promptText: "Escolha 1 Examon compatível da sua mão para a DNA Digivolution.",
        sourceCardId: "EX3-020",
        options: {
          candidateInstanceIds: [firstExamon.instanceId, secondExamon.instanceId],
          visibleInstanceIds: you.hand.map(({ instanceId }) => instanceId),
          min: 1,
          max: 1,
          timing: "EndOfYourTurn",
          effectText: endTurn,
        },
      },
    };
  }
  const descriptions: Record<string, string> = {
    declined: "A DNA Digivolution opcional de fim de turno foi recusada; os materiais e a mão não mudaram.",
    "no-legal": "Não havia resultado de DNA compatível na mão, então nenhuma ação opcional impossível foi aberta.",
    treat: "No próprio turno, Examon na mão pôde tratar Wingdramon como nível 6 somente para DNA Digivolution.",
    "treat-opponent": "No turno do oponente, Wingdramon não foi tratado como nível 6 para Examon.",
    "normal-negative": "Treat as level 6 não permite uma evolução normal; Slayerdramon permaneceu na mão.",
  };
  if (descriptions[mode]) {
    return {
      state,
      events: [
        {
          kind: "effectTriggered",
          seat: 0,
          sourceCardId: "EX3-020",
          effectKey: `EX3-020/${mode}`,
          description: `${descriptions[mode]} ${endTurn}`,
          timing: mode.startsWith("treat") || mode === "normal-negative" ? "YourTurn" : "EndOfYourTurn",
        },
      ],
    };
  }
  return {
    state,
    decision: {
      decisionId: "demo-wing-end-turn",
      seat: 0,
      kind: "optional",
      promptText: "DNA digievoluir Wingdramon e outro Dramon no fim do seu turno?",
      sourceCardId: "EX3-020",
      options: { timing: "EndOfYourTurn", effectText: endTurn },
    },
  };
}
