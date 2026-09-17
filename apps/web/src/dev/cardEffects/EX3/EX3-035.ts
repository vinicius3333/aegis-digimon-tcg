import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function goldramonDemo(effect: string | null, step: string | null): CardEffectsFixture {
  const whenDigivolving =
    "[When Digivolving] You may return 1 card with the [Four Great Dragons] trait from your trash to your hand.";
  const whenAttacking =
    "[When Attacking] 1 of your opponent's Digimon gets -6000 for the turn. Then, by returning 1 [Magnadramon], 1 [Azulongmon], and 1 [Megidramon] from your trash to the bottom of your deck in any order, trash the top 2 cards of your opponent's security stack.";
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = effect === "expired" ? 8 : 7;
  state.turnSeat = 0;
  state.memory = 2;
  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "goldramon-opponent");
  const goldramon = permanent("demo-goldramon", "EX3-035", 0, 11000);
  you.battleArea.push(goldramon);

  if (
    !effect ||
    effect === "return-choice" ||
    effect === "accepted" ||
    effect === "declined" ||
    effect === "no-dragon"
  ) {
    const firstDragon = card("demo-goldramon-magna-one", "EX3-036", 0);
    const secondDragon = card("demo-goldramon-magna-two", "EX3-036", 0);
    const trial = card("demo-goldramon-trial", "EX3-069", 0);
    const filler = card("demo-goldramon-filler", "BT1-010", 0);
    you.trash.push(firstDragon, secondDragon, trial, filler);
    if (effect === "no-dragon") you.trash.splice(0, 3);
    if (effect === "accepted") {
      you.trash.splice(0, 1);
      you.hand.push(firstDragon);
      you.handCount = 1;
    }
    state.players.push(you, opponent);
    if (effect === "accepted" || effect === "declined" || effect === "no-dragon") {
      const description =
        effect === "accepted"
          ? "Goldramon devolveu 1 Magnadramon do lixo para a mão."
          : effect === "declined"
            ? "A devolução opcional foi recusada; as cartas permaneceram no lixo."
            : "Não havia carta com Four Great Dragons no lixo; nenhuma ação foi aberta.";
      return {
        state,
        events: [
          {
            kind: "effectTriggered",
            seat: 0,
            sourceCardId: "EX3-035",
            effectKey: `EX3-035/${effect}`,
            description: `${description} ${whenDigivolving}`,
            timing: "WhenDigivolving",
          },
        ],
      };
    }
    if (effect === "return-choice") {
      return {
        state,
        decision: {
          decisionId: "demo-goldramon-return-choice",
          seat: 0,
          kind: "selectCards",
          promptText: "Escolha 1 carta Four Great Dragons para devolver do lixo à mão",
          sourceCardId: "EX3-035",
          options: {
            candidateInstanceIds: [firstDragon.instanceId, secondDragon.instanceId, trial.instanceId],
            visibleInstanceIds: [firstDragon.instanceId, secondDragon.instanceId, trial.instanceId, filler.instanceId],
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
        decisionId: "demo-goldramon-return-optional",
        seat: 0,
        kind: "optional",
        promptText: "Devolver 1 carta Four Great Dragons do lixo para a mão?",
        sourceCardId: "EX3-035",
        options: { timing: "WhenDigivolving", effectText: whenDigivolving },
      },
    };
  }

  const magnaOne = card("demo-goldramon-cost-magna-one", "EX3-036", 0);
  const magnaTwo = card("demo-goldramon-cost-magna-two", "EX3-036", 0);
  const azulongmon = card("demo-goldramon-cost-azulongmon", "EX3-025", 0);
  const megidramon = card("demo-goldramon-cost-megidramon", "EX3-064", 0);
  const filler = card("demo-goldramon-cost-filler", "BT1-010", 0);
  you.trash.push(magnaOne, magnaTwo, azulongmon, megidramon, filler);
  const targetResolved = step !== "target" && effect !== "expired";
  const target = permanent("demo-goldramon-target", "BT1-010", 1, targetResolved ? 4000 : 10000);
  const other = permanent("demo-goldramon-other", "BT1-011", 1, 10000);
  opponent.battleArea.push(target, other);
  state.players.push(you, opponent);

  if (effect === "paid" || effect === "declined-cost" || effect === "missing-name" || effect === "expired") {
    if (effect === "paid") {
      you.trash.splice(0, you.trash.length, magnaTwo, filler);
      you.deck.push(megidramon, azulongmon, magnaOne);
      you.deckCount = 39;
      opponent.securityCount = 3;
    }
    if (effect === "missing-name") you.trash.splice(3, 1);
    const description =
      effect === "paid"
        ? "Goldramon aplicou -6000 DP, devolveu os 3 nomes ao fundo na ordem escolhida e descartou as 2 cartas do topo da segurança do oponente."
        : effect === "declined-cost"
          ? "Goldramon aplicou -6000 DP; o custo de 3 nomes foi recusado e nenhuma segurança foi descartada pelo efeito."
          : effect === "missing-name"
            ? "Goldramon aplicou -6000 DP, mas faltava Megidramon no lixo; o custo não foi oferecido."
            : "O turno terminou e a redução de -6000 DP de Goldramon expirou.";
    return {
      state,
      events: [
        {
          kind: "effectTriggered",
          seat: 0,
          sourceCardId: "EX3-035",
          effectKey: `EX3-035/${effect}`,
          description: `${description} ${whenAttacking}`,
          timing: "WhenAttacking",
        },
      ],
    };
  }

  if (step === "target") {
    return {
      state,
      decision: {
        decisionId: "demo-goldramon-target",
        seat: 0,
        kind: "chooseTargets",
        promptText: "Escolha 1 Digimon do oponente para receber -6000 DP neste turno",
        sourceCardId: "EX3-035",
        options: {
          candidateInstanceIds: [target.permanentId, other.permanentId],
          visibleInstanceIds: [target.permanentId, other.permanentId],
          min: 1,
          max: 1,
          timing: "WhenAttacking",
          effectText: whenAttacking,
        },
      },
    };
  }
  const selections = {
    azulongmon: { cards: [azulongmon], min: 1, prompt: "Escolha 1 Azulongmon para devolver ao fundo do baralho" },
    megidramon: { cards: [megidramon], min: 1, prompt: "Escolha 1 Megidramon para devolver ao fundo do baralho" },
    magnadramon: { cards: [magnaOne, magnaTwo], min: 0, prompt: "Você pode escolher 1 Magnadramon para pagar o custo" },
  } as const;
  if (step === "order") {
    return {
      state,
      decision: {
        decisionId: "demo-goldramon-order",
        seat: 0,
        kind: "orderCards",
        promptText: "Escolha a ordem dos 3 nomes no fundo do baralho",
        sourceCardId: "EX3-035",
        options: {
          candidateInstanceIds: [magnaOne.instanceId, azulongmon.instanceId, megidramon.instanceId],
          visibleInstanceIds: [magnaOne.instanceId, azulongmon.instanceId, megidramon.instanceId],
          min: 3,
          max: 3,
          orderDestination: "deckBottom",
          timing: "WhenAttacking",
          effectText: whenAttacking,
        },
      },
    };
  }
  const selection = selections[step === "azulongmon" || step === "megidramon" ? step : "magnadramon"];
  return {
    state,
    decision: {
      decisionId: `demo-goldramon-${step ?? "magnadramon"}`,
      seat: 0,
      kind: "selectCards",
      promptText: selection.prompt,
      sourceCardId: "EX3-035",
      options: {
        candidateInstanceIds: selection.cards.map(({ instanceId }) => instanceId),
        visibleInstanceIds: [
          magnaOne.instanceId,
          magnaTwo.instanceId,
          azulongmon.instanceId,
          megidramon.instanceId,
          filler.instanceId,
        ],
        min: selection.min,
        max: 1,
        timing: "WhenAttacking",
        effectText: whenAttacking,
      },
    },
  };
}
