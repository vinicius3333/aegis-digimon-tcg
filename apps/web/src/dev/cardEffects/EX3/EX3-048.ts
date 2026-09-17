import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function jazardmonDemo(effect: string | null, step: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 5;
  state.turnSeat = 0;
  state.memory = 3;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  if (effect === "inherited") {
    const onPlayHost = permanent("demo-jazardmon-on-play-host", "EX3-052", 0, 7000, [
      { instanceId: "demo-jazardmon-active-source", cardId: "EX3-048" },
    ]);
    onPlayHost.currentDP = 8000;
    const plainHost = permanent("demo-jazardmon-plain-host", "EX3-049", 0, 4000, [
      { instanceId: "demo-jazardmon-inactive-source", cardId: "EX3-048" },
    ]);
    you.battleArea.push(onPlayHost, plainHost);
    opponent.battleArea.push(permanent("demo-jazardmon-opponent", "EX3-044", 1, 11000));
    state.players.push(you, opponent);
    return { state };
  }

  you.battleArea.push(permanent("demo-jazardmon", "EX3-048", 0, 4000));
  const revealed = [
    { instanceId: "demo-jazardmon-dragon", cardId: "EX3-047" },
    { instanceId: "demo-jazardmon-hina", cardId: "EX3-065" },
    { instanceId: "demo-jazardmon-filler-one", cardId: "BT1-010" },
    { instanceId: "demo-jazardmon-filler-two", cardId: "BT1-011" },
  ];
  if (step === "hina" || step === "order") you.hand.push(card(revealed[0]!.instanceId, revealed[0]!.cardId, 0));
  if (step === "order") you.hand.push(card(revealed[1]!.instanceId, revealed[1]!.cardId, 0));
  state.players.push(you, opponent);
  const effectText =
    "[On Play] Reveal the top 4 cards of your deck. Add 1 Digimon card with [Rock Dragon], [Earth Dragon], [Bird Dragon], [Machine Dragon], or [Sky Dragon] in its traits and 1 [Hina Kurihara] among them to your hand. Place the rest at the bottom of your deck in any order.";

  if (step === "order") {
    return {
      state,
      decision: {
        decisionId: "demo-jazardmon-order",
        seat: 0,
        kind: "orderCards",
        promptText: "Escolha a ordem das cartas que irão para o fundo do baralho",
        sourceCardId: "EX3-048",
        options: {
          candidateInstanceIds: revealed.slice(2).map(({ instanceId }) => instanceId),
          visibleInstanceIds: revealed.slice(2).map(({ instanceId }) => instanceId),
          visibleCards: revealed.slice(2),
          min: 2,
          max: 2,
          orderDestination: "deckBottom",
          timing: "OnPlay",
          effectText,
        },
      },
    };
  }

  const choosingHina = step === "hina";
  return {
    state,
    decision: {
      decisionId: choosingHina ? "demo-jazardmon-hina" : "demo-jazardmon-dragon",
      seat: 0,
      kind: "selectCards",
      promptText: choosingHina
        ? "Escolha Hina Kurihara para adicionar à mão"
        : "Escolha 1 Digimon com uma das traits Dragon indicadas",
      sourceCardId: "EX3-048",
      options: {
        candidateInstanceIds: [revealed[choosingHina ? 1 : 0]!.instanceId],
        visibleInstanceIds: revealed.map(({ instanceId }) => instanceId),
        visibleCards: revealed,
        min: 1,
        max: 1,
        timing: "OnPlay",
        effectText,
      },
    },
  };
}
