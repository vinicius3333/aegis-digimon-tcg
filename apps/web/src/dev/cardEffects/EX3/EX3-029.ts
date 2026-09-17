import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function airdramonDemo(effect: string | null): CardEffectsFixture {
  const onPlay =
    "[On Play] Search your security stack, reveal 1 card from it, and add it to your hand. If it's a yellow card, ＜Recovery +1 (Deck)＞. (Place the top card of your deck on top of your security stack.) Then, shuffle your security stack.";
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 8;
  state.turnSeat = 0;
  state.memory = 5;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "airdramon-opponent");
  you.battleArea.push(permanent("demo-airdramon", "EX3-029", 0, 5000));
  const yellow = card("demo-airdramon-yellow", "BT1-045", 0);
  const red = card("demo-airdramon-red", "BT1-009", 0);
  const multicolor = card("demo-airdramon-multicolor", "BT10-055", 0);
  const recovery = card("demo-airdramon-recovery", "BT1-001", 0);
  const security = [yellow, red, multicolor];
  opponent.handCount = 5;

  if (!effect) {
    you.security.push(...security);
    you.securityCount = security.length;
    you.deck.push(recovery);
    you.deckCount = 35;
    state.players.push(you, opponent);
    return {
      state,
      decision: {
        decisionId: "demo-airdramon-search-security",
        seat: 0,
        kind: "selectCards",
        promptText: "Escolha 1 carta da sua segurança para revelar e adicionar à mão.",
        sourceCardId: "EX3-029",
        options: {
          candidateInstanceIds: security.map(({ instanceId }) => instanceId),
          visibleInstanceIds: security.map(({ instanceId }) => instanceId),
          visibleCards: security.map(({ instanceId, cardId }) => ({ instanceId, cardId })),
          min: 1,
          max: 1,
          timing: "OnPlay",
          effectText: onPlay,
        },
      },
    };
  }

  let description: string;
  let revealedCardId: string | undefined;
  if (effect === "empty-security") {
    you.deck.push(recovery);
    you.deckCount = 35;
    description =
      "A segurança estava vazia; Airdramon não abriu uma escolha impossível e o baralho permaneceu intacto.";
  } else if (effect === "non-yellow") {
    revealedCardId = red.cardId;
    red.faceUp = true;
    you.hand.push(red);
    you.security.push(yellow, multicolor);
    you.deck.push(recovery);
    you.deckCount = 35;
    description =
      "Airdramon revelou Monodramon e o adicionou à mão. Como a carta não era amarela, não houve Recovery; a segurança restante foi embaralhada e voltou a ficar oculta.";
  } else if (effect === "yellow-empty-deck") {
    revealedCardId = yellow.cardId;
    yellow.faceUp = true;
    you.hand.push(yellow);
    you.security.push(red, multicolor);
    you.deckCount = 0;
    description =
      "Airdramon revelou Tsukaimon e o adicionou à mão. A carta era amarela, mas o baralho estava vazio e Recovery +1 não moveu carta; a segurança restante foi embaralhada.";
  } else {
    const chosen = effect === "multicolor" ? multicolor : yellow;
    revealedCardId = chosen.cardId;
    chosen.faceUp = true;
    you.hand.push(chosen);
    you.security.push(effect === "multicolor" ? yellow : red, recovery);
    you.deckCount = 34;
    description =
      effect === "multicolor"
        ? "Airdramon revelou Gryphonmon, uma carta multicolorida que também é amarela, e a adicionou à mão. Recovery +1 colocou o topo do baralho na segurança; depois, ela foi embaralhada e voltou a ficar oculta."
        : "Airdramon revelou Tsukaimon e o adicionou à mão. Por ser uma carta amarela, Recovery +1 colocou o topo do baralho na segurança; depois, ela foi embaralhada e voltou a ficar oculta.";
  }
  you.handCount = you.hand.length;
  you.securityCount = you.security.length;
  state.players.push(you, opponent);
  return {
    state,
    events: [
      ...(revealedCardId === undefined
        ? []
        : ([{ kind: "cardRevealed", seat: 0, cardId: revealedCardId, sourceCardId: "EX3-029" }] as const)),
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "EX3-029",
        effectKey: `EX3-029/${effect}`,
        description: `${description} ${onPlay}`,
        timing: "OnPlay",
      },
    ],
  };
}
