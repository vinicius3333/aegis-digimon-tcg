import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function azulongmonDemo(effect: string | null): CardEffectsFixture {
  const onPlay =
    "[On Play] ＜Draw 2＞. (Draw 2 cards from your deck.) Then, if this card was played by [Trial of the Four Great Dragons]'s effect, gain 2 memory.";
  const onDeletion =
    "[On Deletion] If you don't have a [Trial of the Four Great Dragons] in play, you may place 1 [Trial of the Four Great Dragons] from your hand in your battle area.";
  const mode = effect ?? "on-deletion";
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 8;
  state.turnSeat = 0;
  state.memory = mode === "trial-played" ? 2 : 0;
  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "azulongmon-opponent");
  const firstTrial = card("demo-azulongmon-trial-one", "EX3-069", 0);
  const secondTrial = card("demo-azulongmon-trial-two", "EX3-069", 0);
  const filler = card("demo-azulongmon-filler", "BT1-010", 0);
  opponent.handCount = 5;

  if (["trial-played", "effect-played", "manual", "one-card-deck", "empty-deck"].includes(mode)) {
    you.battleArea.push(permanent("demo-azulongmon", "EX3-025", 0, 12000));
    if (mode === "trial-played") you.battleArea.push(permanent("demo-azulongmon-origin-trial", "EX3-069", 0, 0));
    const draws = mode === "empty-deck" ? 0 : mode === "one-card-deck" ? 1 : 2;
    for (let index = 0; index < draws; index += 1) {
      you.hand.push(card(`demo-azulongmon-draw-${index}`, index === 0 ? "BT1-029" : "BT1-030", 0));
    }
    you.handCount = draws;
    you.deckCount = mode === "empty-deck" ? 0 : mode === "one-card-deck" ? 0 : 34;
    state.players.push(you, opponent);
    const descriptions: Record<string, string> = {
      "trial-played": "Trial jogou Azulongmon: ele comprou 2 cartas e ganhou 2 de memória pela origem correta.",
      "effect-played": "Outro efeito jogou Azulongmon: ele comprou 2 cartas, mas não ganhou memória sem origem Trial.",
      manual: "Azulongmon foi jogado manualmente, pagou 12, comprou 2 cartas e não ganhou o bônus de memória.",
      "one-card-deck": "Azulongmon tentou comprar 2, mas havia só 1 carta no baralho e comprou apenas essa carta.",
      "empty-deck": "Azulongmon tentou comprar 2 com o baralho vazio; nenhuma carta foi comprada e o jogo continuou.",
    };
    return {
      state,
      events: [
        {
          kind: "effectTriggered",
          seat: 0,
          sourceCardId: "EX3-025",
          effectKey: `EX3-025/${mode}`,
          description: `${descriptions[mode]} ${onPlay}`,
          timing: "OnPlay",
        },
      ],
    };
  }

  you.trash.push(card("demo-azulongmon-deleted", "EX3-025", 0));
  if (mode !== "no-trial-hand") you.hand.push(firstTrial, secondTrial, filler);
  if (mode === "trial-in-play") you.battleArea.push(permanent("demo-azulongmon-existing-trial", "EX3-069", 0, 0));
  if (mode === "accepted") {
    you.hand.splice(0, 1);
    you.battleArea.push(permanent("demo-azulongmon-placed-trial", "EX3-069", 0, 0));
  }
  you.handCount = you.hand.length;
  you.deckCount = 36;
  state.players.push(you, opponent);
  if (mode === "on-deletion") {
    return {
      state,
      decision: {
        decisionId: "demo-azulongmon-on-deletion",
        seat: 0,
        kind: "optional",
        promptText: "Colocar 1 Trial of the Four Great Dragons da mão na área de batalha?",
        sourceCardId: "EX3-025",
        options: { timing: "OnDeletion", effectText: onDeletion },
      },
    };
  }
  if (mode === "trial-choice") {
    return {
      state,
      decision: {
        decisionId: "demo-azulongmon-trial-choice",
        seat: 0,
        kind: "selectCards",
        promptText: "Escolha 1 Trial of the Four Great Dragons para colocar na área de batalha.",
        sourceCardId: "EX3-025",
        options: {
          candidateInstanceIds: [firstTrial.instanceId, secondTrial.instanceId],
          visibleInstanceIds: [firstTrial.instanceId, secondTrial.instanceId, filler.instanceId],
          visibleCards: [firstTrial, secondTrial, filler].map(({ instanceId, cardId }) => ({ instanceId, cardId })),
          min: 1,
          max: 1,
          timing: "OnDeletion",
          effectText: onDeletion,
        },
      },
    };
  }
  const descriptions: Record<string, string> = {
    accepted:
      "Q3402: Azulongmon apenas colocou Trial na área de batalha; o Main e o Draw 1 da Option não foram ativados, e o baralho ficou intacto.",
    declined: "A colocação opcional de Trial por Azulongmon foi recusada; as cartas permaneceram na mão.",
    "trial-in-play": "Já havia Trial na área de batalha; Azulongmon não abriu uma ação On Deletion impossível.",
    "no-trial-hand": "Não havia Trial na mão; Azulongmon não abriu uma escolha impossível.",
  };
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "EX3-025",
        effectKey: `EX3-025/${mode}`,
        description: `${descriptions[mode]} ${onDeletion}`,
        timing: "OnDeletion",
      },
    ],
  };
}
