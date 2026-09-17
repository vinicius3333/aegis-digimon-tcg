import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function gatomonDemo(effect: string | null, step: string | null): CardEffectsFixture {
  const onPlay =
    "[On Play] Reveal the top 4 cards of your deck. Add 1 yellow card with [Angel], [Cherub], [Throne], [Authority], [Seraph] or [Virtue], other than [Three Great Angels], in one of its traits and 1 card with the [Four Great Dragons] trait among them to your hand. Place the rest at the bottom of your deck in any order.";
  const inherited =
    "[Your Turn] [Once Per Turn] When you play a Digimon with the [Four Great Dragons] trait, 1 of those Digimon gains ＜Rush＞ for the turn. (This Digimon may attack the turn it was played.)";
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = effect === "inherited-expired" ? 9 : 8;
  state.turnSeat = 0;
  state.memory = 6;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "gatomon-opponent");
  const host = permanent("demo-gatomon-host", "BT1-056", 0, 6000, [
    { instanceId: "demo-gatomon-source", cardId: "EX3-030" },
  ]);
  const gatomon = permanent("demo-gatomon", "EX3-030", 0, 4000);
  const revealed = [
    { instanceId: "demo-gatomon-authority", cardId: "BT1-062" },
    { instanceId: "demo-gatomon-excluded", cardId: "BT1-063" },
    { instanceId: "demo-gatomon-four-dragons", cardId: "EX3-025" },
    { instanceId: "demo-gatomon-filler", cardId: "BT1-029" },
  ];

  if (effect?.startsWith("inherited")) {
    const firstDragon = permanent("demo-gatomon-first-dragon", "EX3-035", 0, 11000);
    const secondDragon = permanent("demo-gatomon-second-dragon", "EX3-036", 0, 12000);
    const commonDigimon = permanent("demo-gatomon-common", "BT1-010", 0, 2000);
    if (!["inherited-expired", "inherited-multi"].includes(effect)) {
      firstDragon.grantedKeywords.push("Rush");
      firstDragon.canAttackPlayer = true;
    }
    if (effect === "inherited-multi-resolved") {
      firstDragon.grantedKeywords.length = 0;
      firstDragon.canAttackPlayer = false;
      secondDragon.grantedKeywords.push("Rush");
      secondDragon.canAttackPlayer = true;
    }
    you.battleArea.push(host, firstDragon);
    if (["inherited-opt", "inherited-multi", "inherited-multi-resolved"].includes(effect)) {
      you.battleArea.push(secondDragon);
    }
    if (["inherited-multi", "inherited-multi-resolved"].includes(effect)) you.battleArea.push(commonDigimon);
    opponent.handCount = 5;
    state.players.push(you, opponent);
    if (effect === "inherited-multi") {
      return {
        state,
        decision: {
          decisionId: "demo-gatomon-multi-play-rush",
          seat: 0,
          kind: "chooseTargets",
          promptText: "Escolha 1 dos Four Great Dragons recém-jogados para receber Rush neste turno.",
          sourceCardId: "EX3-030",
          options: {
            candidateInstanceIds: [firstDragon.permanentId, secondDragon.permanentId],
            visibleInstanceIds: [firstDragon.permanentId, secondDragon.permanentId, commonDigimon.permanentId],
            min: 1,
            max: 1,
            timing: "YourTurn",
            effectText: inherited,
          },
        },
      };
    }
    const description =
      effect === "inherited-opt"
        ? "Gatomon concedeu Rush ao primeiro Four Great Dragons jogado. A segunda jogada não recebeu Rush porque o efeito é Once Per Turn."
        : effect === "inherited-multi-resolved"
          ? "Goldramon, Magnadramon e Agumon foram jogados simultaneamente; só os dois Four Great Dragons eram elegíveis, Magnadramon foi escolhido e somente ele recebeu Rush neste turno."
          : effect === "inherited-expired"
            ? "O turno terminou e o Rush concedido por Gatomon expirou; Goldramon não pode mais atacar por ter sido jogado naquele turno."
            : "O efeito herdado de Gatomon concedeu Rush ao Goldramon recém-jogado, que pode atacar neste turno; o host não recebeu Rush.";
    return {
      state,
      events: [
        {
          kind: "effectTriggered",
          seat: 0,
          sourceCardId: "EX3-030",
          effectKey: `EX3-030/${effect}`,
          description: `${description} ${inherited}`,
          timing: "YourTurn",
        },
      ],
    };
  }

  you.battleArea.push(gatomon);
  opponent.handCount = 5;
  if (effect === "no-dragon") {
    revealed[2] = { instanceId: "demo-gatomon-no-dragon", cardId: "BT1-010" };
  }
  if (effect === "no-angel") {
    revealed[0] = { instanceId: "demo-gatomon-no-angel", cardId: "BT1-011" };
  }
  if (effect === "no-categories") {
    revealed[0] = { instanceId: "demo-gatomon-no-angel", cardId: "BT1-011" };
    revealed[2] = { instanceId: "demo-gatomon-no-dragon", cardId: "BT1-010" };
  }

  const choosingDragon = step === "dragon" || effect === "no-angel";
  const ordering = step === "order" || effect === "no-categories" || effect === "no-dragon";
  if (choosingDragon && effect !== "no-angel") you.hand.push(card(revealed[0]!.instanceId, revealed[0]!.cardId, 0));
  if (ordering && effect !== "no-categories") {
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
  you.deckCount = effect === "resolved" ? 34 : 36;
  state.players.push(you, opponent);

  if (effect === "resolved") {
    return {
      state,
      events: [
        {
          kind: "effectTriggered",
          seat: 0,
          sourceCardId: "EX3-030",
          effectKey: "EX3-030/on-play",
          description:
            "Gatomon adicionou SlashAngemon e Azulongmon à mão; Seraphimon foi excluído por ter Three Great Angels, e as outras 2 cartas foram ao fundo na ordem escolhida. " +
            onPlay,
          timing: "OnPlay",
        },
      ],
    };
  }

  if (ordering) {
    const remaining =
      effect === "no-categories" ? revealed : effect === "no-dragon" ? revealed.slice(1) : [revealed[1]!, revealed[3]!];
    return {
      state,
      decision: {
        decisionId: "demo-gatomon-order",
        seat: 0,
        kind: "orderCards",
        promptText: "Escolha a ordem das cartas que irão para o fundo do baralho.",
        sourceCardId: "EX3-030",
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
      decisionId: choosingDragon ? "demo-gatomon-four-dragons" : "demo-gatomon-angel-family",
      seat: 0,
      kind: "selectCards",
      promptText: choosingDragon
        ? "Escolha 1 carta com Four Great Dragons nos traits."
        : "Escolha 1 carta amarela com Angel, Cherub, Throne, Authority, Seraph ou Virtue nos traits, exceto Three Great Angels.",
      sourceCardId: "EX3-030",
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
