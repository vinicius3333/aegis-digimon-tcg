import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function dracomonDemo(effect: string | null, step: string | null): CardEffectsFixture {
  const onPlay =
    "[On Play] Reveal the top 4 cards of your deck. Add 1 green or blue card with [Dramon] in its name and 1 card with [Examon] in its name among them to your hand. Place the rest at the bottom of your deck in any order.";
  const inherited =
    "[All Turns][Once Per Turn] When one of your Digimon with [Dramon] or [Examon] in its name becomes suspended, this Digimon gets +1000 DP for the turn.";
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 7;
  state.turnSeat = 0;
  state.memory = 2;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "dracomon-opponent");

  if (effect === "inherited" || effect === "inherited-negative" || effect === "inherited-opt") {
    const active = effect !== "inherited-negative";
    const host = permanent("demo-dracomon-host", "EX3-020", 0, 7000, [
      { instanceId: "demo-dracomon-source", cardId: "EX3-037" },
    ]);
    const firstSuspended = permanent(
      "demo-dracomon-trigger-one",
      active ? "EX3-074" : "BT1-028",
      0,
      active ? 15000 : 2000,
    );
    firstSuspended.isSuspended = true;
    you.battleArea.push(host, firstSuspended);
    if (effect === "inherited-opt") {
      const secondSuspended = permanent("demo-dracomon-trigger-two", "EX3-041", 0, 7000);
      secondSuspended.isSuspended = true;
      you.battleArea.push(secondSuspended);
    }
    if (active) host.currentDP = 8000;
    state.players.push(you, opponent);
    return {
      state,
      events: [
        {
          kind: "effectTriggered",
          seat: 0,
          sourceCardId: "EX3-037",
          effectKey: "EX3-037/inherited-dp",
          description:
            effect === "inherited-negative"
              ? `Elecmon não tem Dramon nem Examon no nome; Dracomon não concedeu +1000 DP. ${inherited}`
              : effect === "inherited-opt"
                ? `Dois Digimon elegíveis foram suspensos, mas o efeito Once Per Turn de Dracomon concedeu apenas +1000 DP. ${inherited}`
                : `Examon foi suspenso e o efeito herdado de Dracomon concedeu +1000 DP a Wingdramon. ${inherited}`,
          timing: "AllTurns",
        },
      ],
    };
  }

  const dracomon = permanent("demo-dracomon-on-play", "EX3-037", 0, 2000);
  you.battleArea.push(dracomon);
  const revealed = [
    { instanceId: "demo-dracomon-dramon", cardId: "EX3-020" },
    { instanceId: "demo-dracomon-examon", cardId: "EX3-074" },
    { instanceId: "demo-dracomon-filler-one", cardId: "BT1-010" },
    { instanceId: "demo-dracomon-filler-two", cardId: "BT1-029" },
  ];

  if (effect === "resolved") {
    you.hand.push(card(revealed[0]!.instanceId, revealed[0]!.cardId, 0));
    you.hand.push(card(revealed[1]!.instanceId, revealed[1]!.cardId, 0));
    you.handCount = 2;
    you.deck.push(card(revealed[2]!.instanceId, revealed[2]!.cardId, 0));
    you.deck.push(card(revealed[3]!.instanceId, revealed[3]!.cardId, 0));
    you.deckCount = 34;
    state.players.push(you, opponent);
    return {
      state,
      events: [
        {
          kind: "effectTriggered",
          seat: 0,
          sourceCardId: "EX3-037",
          effectKey: "EX3-037/on-play-reveal",
          description: "Dracomon adicionou Wingdramon e Examon à mão e colocou o restante no fundo do baralho.",
          timing: "OnPlay",
        },
        {
          kind: "cardsMoved",
          instanceIds: revealed.slice(0, 2).map(({ instanceId }) => instanceId),
          from: "deck",
          to: "hand",
        },
      ],
    };
  }

  const noDramon = effect === "no-dramon";
  const noExamon = effect === "no-examon";
  const noCategories = effect === "no-categories";
  if (noDramon) revealed[0] = { instanceId: "demo-dracomon-filler-zero", cardId: "BT1-011" };
  if (noExamon) revealed[1] = { instanceId: "demo-dracomon-filler-examon", cardId: "BT1-028" };
  if (noCategories) {
    revealed[0] = { instanceId: "demo-dracomon-filler-zero", cardId: "BT1-011" };
    revealed[1] = { instanceId: "demo-dracomon-filler-examon", cardId: "BT1-028" };
  }

  const ordering = step === "order" || noCategories;
  const choosingExamon = step === "examon" || noDramon;
  if (choosingExamon && !noDramon) you.hand.push(card(revealed[0]!.instanceId, revealed[0]!.cardId, 0));
  if (ordering && !noCategories) {
    you.hand.push(card(revealed[0]!.instanceId, revealed[0]!.cardId, 0));
    you.hand.push(card(revealed[1]!.instanceId, revealed[1]!.cardId, 0));
  }
  you.handCount = you.hand.length;
  state.players.push(you, opponent);

  if (ordering) {
    const remaining = noCategories ? revealed : revealed.slice(2);
    return {
      state,
      decision: {
        decisionId: "demo-dracomon-order",
        seat: 0,
        kind: "orderCards",
        promptText: "Escolha a ordem das cartas que irão para o fundo do baralho.",
        sourceCardId: "EX3-037",
        options: {
          candidateInstanceIds: remaining.map(({ instanceId }) => instanceId),
          visibleInstanceIds: remaining.map(({ instanceId }) => instanceId),
          visibleCards: remaining,
          min: remaining.length,
          max: remaining.length,
          orderDestination: "deckBottom",
          timing: "OnPlay",
          effectText: onPlay,
        },
      },
    };
  }

  return {
    state,
    decision: {
      decisionId: choosingExamon ? "demo-dracomon-examon" : "demo-dracomon-dramon",
      seat: 0,
      kind: "selectCards",
      promptText: choosingExamon
        ? "Escolha 1 carta com Examon no nome."
        : "Escolha 1 carta verde ou azul com Dramon no nome.",
      sourceCardId: "EX3-037",
      options: {
        candidateInstanceIds: [revealed[choosingExamon ? 1 : 0]!.instanceId],
        visibleInstanceIds: revealed.map(({ instanceId }) => instanceId),
        visibleCards: revealed,
        min: 1,
        max: 1,
        timing: "OnPlay",
        effectText: onPlay,
      },
    },
  };
}
