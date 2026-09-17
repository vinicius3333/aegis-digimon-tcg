import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function patamonDemo(effect: string | null, step: string | null): CardEffectsFixture {
  const onPlay =
    "[On Play] Reveal the top 4 cards of your deck. Add 1 yellow card with [Angel], [Cherub], [Throne], [Authority], [Seraph] or [Virtue], other than [Three Great Angels], in one of its traits and 1 card with the [Four Great Dragons] trait among them to your hand. Place the rest at the bottom of your deck in any order.";
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 8;
  state.turnSeat = 0;
  state.memory = 7;
  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "patamon-opponent");
  you.battleArea.push(permanent("demo-patamon", "EX3-028", 0, 2000));
  const revealed = [
    { instanceId: "demo-patamon-authority", cardId: "BT1-062" },
    { instanceId: "demo-patamon-excluded", cardId: "BT1-063" },
    { instanceId: "demo-patamon-four-dragons", cardId: "EX3-025" },
    { instanceId: "demo-patamon-filler", cardId: "BT1-029" },
  ];
  if (effect === "no-dragon") revealed[2] = { instanceId: "demo-patamon-no-dragon", cardId: "BT1-010" };
  if (effect === "no-angel") revealed[0] = { instanceId: "demo-patamon-no-angel", cardId: "BT1-011" };
  if (effect === "no-categories") {
    revealed[0] = { instanceId: "demo-patamon-no-angel", cardId: "BT1-011" };
    revealed[2] = { instanceId: "demo-patamon-no-dragon", cardId: "BT1-010" };
  }
  if (effect === "filter-boundary") {
    revealed.splice(
      0,
      revealed.length,
      { instanceId: "demo-patamon-purple-cherub", cardId: "ST17-09" },
      { instanceId: "demo-patamon-yellow-three-angels", cardId: "BT3-041" },
      { instanceId: "demo-patamon-boundary-filler", cardId: "BT1-029" },
    );
  }
  if (effect === "short-deck") revealed.splice(3, 1);

  const choosingDragon = step === "dragon" || effect === "no-angel";
  const ordering =
    step === "order" ||
    effect === "no-categories" ||
    effect === "no-dragon" ||
    effect === "filter-boundary" ||
    effect === "short-deck";
  if (choosingDragon && effect !== "no-angel") you.hand.push(card(revealed[0]!.instanceId, revealed[0]!.cardId, 0));
  if (ordering && !["no-categories", "filter-boundary"].includes(effect ?? "")) {
    you.hand.push(card(revealed[0]!.instanceId, revealed[0]!.cardId, 0));
    if (effect !== "no-dragon") you.hand.push(card(revealed[2]!.instanceId, revealed[2]!.cardId, 0));
  }
  if (effect === "resolved") {
    you.hand.push(card(revealed[0]!.instanceId, revealed[0]!.cardId, 0));
    you.hand.push(card(revealed[2]!.instanceId, revealed[2]!.cardId, 0));
    you.deck.push(card(revealed[1]!.instanceId, revealed[1]!.cardId, 0));
    you.deck.push(card(revealed[3]!.instanceId, revealed[3]!.cardId, 0));
  }
  you.handCount = you.hand.length;
  you.deckCount = effect === "resolved" ? 34 : effect === "short-deck" ? 0 : 36;
  opponent.handCount = 5;
  state.players.push(you, opponent);

  if (effect === "resolved") {
    return {
      state,
      events: [
        {
          kind: "effectTriggered",
          seat: 0,
          sourceCardId: "EX3-028",
          effectKey: "EX3-028/on-play",
          description:
            "Patamon adicionou SlashAngemon e Azulongmon à mão; Seraphimon foi excluído por ter Three Great Angels, e as outras 2 cartas foram ao fundo na ordem escolhida. " +
            onPlay,
          timing: "OnPlay",
        },
      ],
    };
  }

  if (ordering) {
    const remaining =
      effect === "no-categories" || effect === "filter-boundary"
        ? revealed
        : effect === "no-dragon"
          ? revealed.slice(1)
          : [revealed[1]!, ...(revealed[3] === undefined ? [] : [revealed[3]!])];
    return {
      state,
      decision: {
        decisionId: "demo-patamon-order",
        seat: 0,
        kind: "orderCards",
        promptText:
          effect === "filter-boundary"
            ? "Nenhuma carta era elegível. Escolha a ordem de todas para o fundo do baralho."
            : "Escolha a ordem das cartas que irão para o fundo do baralho.",
        sourceCardId: "EX3-028",
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
      decisionId: choosingDragon ? "demo-patamon-four-dragons" : "demo-patamon-angel-family",
      seat: 0,
      kind: "selectCards",
      promptText: choosingDragon
        ? "Escolha 1 carta com Four Great Dragons nos traits."
        : "Escolha 1 carta amarela com Angel, Cherub, Throne, Authority, Seraph ou Virtue nos traits, exceto Three Great Angels.",
      sourceCardId: "EX3-028",
      options: {
        candidateInstanceIds: [revealed[choosingDragon ? 2 : 0]!.instanceId],
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
