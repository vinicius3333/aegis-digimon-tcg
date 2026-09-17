import { GameState, Phase } from "@aegis/shared";
import { permanent, player, type CardEffectsFixture } from "../fixture";

export function hydramonDemo(effect: string | null): CardEffectsFixture {
  const whenDigivolving = "[When Digivolving] You may suspend 1 Digimon.";
  const endTurn =
    "[End of Your Turn][Once Per Turn] If you have 2 or more suspended Digimon with [Vegetation], [Plant], or [Fairy] in one of their traits, return 1 of your opponent's suspended Digimon to the bottom of its owner's deck.";
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 7;
  state.turnSeat = 0;
  state.memory = effect === "memory" ? 2 : 3;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const hydramon = permanent("demo-hydramon", "EX3-045", 0, 13000, [
    { instanceId: "demo-hydramon-base", cardId: "EX3-043" },
  ]);
  const pomumon = permanent("demo-hydramon-pomumon", "EX3-038", 0, 2000);
  const tinkermon = permanent("demo-hydramon-tinkermon", "BT1-047", 0, 2000);
  const elecmon = permanent("demo-hydramon-elecmon", "BT1-028", 1, 2000, [
    { instanceId: "demo-hydramon-elecmon-source", cardId: "BT1-003" },
  ]);
  const gabumon = permanent("demo-hydramon-gabumon", "BT1-029", 1, 2000);
  const agumon = permanent("demo-hydramon-agumon", "BT1-010", 1, 2000);
  opponent.handCount = 5;

  if (effect === "memory") {
    hydramon.isSuspended = true;
    pomumon.isSuspended = true;
    tinkermon.isSuspended = true;
    elecmon.isSuspended = true;
    you.battleArea.push(hydramon, pomumon, tinkermon);
    opponent.battleArea.push(elecmon);
    state.players.push(you, opponent);
    return {
      state,
      events: [
        {
          kind: "memoryChanged",
          from: 0,
          to: 2,
          reason: "Hydramon: 2 outros Digimon Vegetation/Fairy estão suspensos",
        },
      ],
    };
  }

  if (effect === "returned") {
    hydramon.isSuspended = true;
    pomumon.isSuspended = true;
    gabumon.isSuspended = true;
    you.battleArea.push(hydramon, pomumon);
    opponent.battleArea.push(gabumon);
    opponent.deck.push(elecmon.topCard);
    opponent.deckCount = 37;
    opponent.trash.push(...elecmon.stack);
    state.players.push(you, opponent);
    return {
      state,
      events: [
        { kind: "cardsMoved", instanceIds: [elecmon.topCard.instanceId], from: "battleArea", to: "deck" },
        {
          kind: "cardsMoved",
          instanceIds: elecmon.stack.map(({ instanceId }) => instanceId),
          from: "digivolutionCards",
          to: "trash",
        },
      ],
    };
  }

  if (effect === "end-turn") {
    hydramon.isSuspended = true;
    pomumon.isSuspended = true;
    elecmon.isSuspended = true;
    gabumon.isSuspended = true;
    you.battleArea.push(hydramon, pomumon);
    opponent.battleArea.push(elecmon, gabumon, agumon);
    state.players.push(you, opponent);
    return {
      state,
      decision: {
        decisionId: "demo-hydramon-end-turn",
        seat: 0,
        kind: "chooseTargets",
        promptText: "Escolha 1 Digimon suspenso do oponente para devolver ao fundo do baralho",
        sourceCardId: "EX3-045",
        options: {
          candidateInstanceIds: [elecmon.permanentId, gabumon.permanentId],
          visibleInstanceIds: [elecmon.permanentId, gabumon.permanentId, agumon.permanentId],
          min: 1,
          max: 1,
          timing: "OnEndTurn",
          effectText: endTurn,
        },
      },
    };
  }

  const alreadySuspended = gabumon;
  alreadySuspended.isSuspended = true;
  you.battleArea.push(hydramon, pomumon);
  opponent.battleArea.push(elecmon, alreadySuspended);
  state.players.push(you, opponent);

  if (effect === "suspend") {
    return {
      state,
      decision: {
        decisionId: "demo-hydramon-suspend",
        seat: 0,
        kind: "chooseTargets",
        promptText: "Escolha 1 Digimon ativo para suspender",
        sourceCardId: "EX3-045",
        options: {
          candidateInstanceIds: [hydramon.permanentId, pomumon.permanentId, elecmon.permanentId],
          visibleInstanceIds: [
            hydramon.permanentId,
            pomumon.permanentId,
            elecmon.permanentId,
            alreadySuspended.permanentId,
          ],
          min: 1,
          max: 1,
          timing: "WhenDigivolving",
          effectText: whenDigivolving,
        },
      },
    };
  }

  return {
    state,
    decision: {
      decisionId: "demo-hydramon-optional",
      seat: 0,
      kind: "optional",
      promptText: "Ativar o efeito de Hydramon para suspender 1 Digimon?",
      sourceCardId: "EX3-045",
      options: { timing: "WhenDigivolving", effectText: whenDigivolving },
    },
  };
}
