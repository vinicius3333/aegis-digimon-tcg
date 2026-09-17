import { GameState, Phase } from "@aegis/shared";
import { permanent, player, type CardEffectsFixture } from "../fixture";

export function entmonDemo(effect: string | null): CardEffectsFixture {
  const digisorption =
    "＜Digisorption -3＞ (When one of your Digimon digivolves into this card from your hand, you may suspend 1 of your Digimon to reduce the digivolution cost by 3.)";
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 7;
  state.turnSeat = 0;
  state.memory = effect === "threshold" ? -3 : effect === "reduced" ? 0 : 1;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const entmon = permanent("demo-entmon", "EX3-043", 0, 8000, [{ instanceId: "demo-entmon-base", cardId: "BT1-072" }]);
  const pomumon = permanent("demo-entmon-pomumon", "EX3-038", 0, 2000);
  const mushroomon = permanent("demo-entmon-mushroomon", "BT1-065", 0, 2000);
  opponent.handCount = 5;

  if (effect === "reduced") {
    pomumon.isSuspended = true;
    you.battleArea.push(entmon, pomumon, mushroomon);
    state.players.push(you, opponent);
    return {
      state,
      events: [
        { kind: "memoryChanged", from: 1, to: 0, reason: "Entmon: Digisorption reduziu o custo de evolução em 3" },
        {
          kind: "effectTriggered",
          seat: 0,
          sourceCardId: "EX3-043",
          effectKey: "EX3-043/when-digivolving-unsuspend",
          description: "Entmon contou consigo mesma e 1 aliado suspenso, então foi dessuspensa.",
          timing: "WhenDigivolving",
        },
      ],
    };
  }

  if (effect === "threshold") {
    entmon.isSuspended = true;
    you.battleArea.push(entmon, pomumon);
    state.players.push(you, opponent);
    return {
      state,
      events: [
        { kind: "memoryChanged", from: 1, to: -3, reason: "Entmon: Digisorption recusada; custo completo pago" },
      ],
    };
  }

  mushroomon.isSuspended = true;
  you.battleArea.push(entmon, pomumon, mushroomon);
  state.players.push(you, opponent);

  if (effect === "cost") {
    return {
      state,
      decision: {
        decisionId: "demo-entmon-digisorption-target",
        seat: 0,
        kind: "chooseTargets",
        promptText: "Escolha 1 dos seus Digimon ativos para suspender e reduzir o custo em 3",
        sourceCardId: "EX3-043",
        options: {
          candidateInstanceIds: [entmon.topCard.instanceId, pomumon.topCard.instanceId],
          visibleInstanceIds: [entmon.topCard.instanceId, pomumon.topCard.instanceId, mushroomon.topCard.instanceId],
          min: 1,
          max: 1,
          timing: "Static",
          effectText: digisorption,
        },
      },
    };
  }

  return {
    state,
    decision: {
      decisionId: "demo-entmon-digisorption-optional",
      seat: 0,
      kind: "optional",
      promptText: "Usar Digisorption -3 de Entmon?",
      sourceCardId: "EX3-043",
      options: { timing: "Static", effectText: digisorption },
    },
  };
}
