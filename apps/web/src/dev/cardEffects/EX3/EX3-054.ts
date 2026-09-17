import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function darkdramonDemo(effect: string | null, step: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 6;
  state.turnSeat = 0;
  state.memory = 0;
  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "darkdramon-opponent");
  const reductionText =
    "When you would digivolve into this card, by returning up to 5 cards with [D-Brigade] in their traits from your trash to the top of your deck, reduce the digivolution cost by 1 for each returned card.";
  const yourTurnText =
    "[Your Turn] [Once Per Turn] When you play another Digimon with [D-Brigade] in its traits, delete 1 of your opponent's Digimon with a play cost less than or equal to the Digimon you played, and unsuspend this Digimon.";

  if (effect === "your-turn" || effect === "resolved") {
    const darkdramon = permanent("demo-darkdramon", "EX3-054", 0, 12000);
    darkdramon.isSuspended = effect !== "resolved";
    you.battleArea.push(darkdramon, permanent("demo-darkdramon-played", "EX3-046", 0, 2000));
    const eligible = permanent("demo-darkdramon-eligible", "BT1-010", 1, 2000);
    const tooExpensive = permanent("demo-darkdramon-too-expensive", "EX3-049", 1, 4000);
    if (effect === "your-turn") opponent.battleArea.push(eligible);
    else opponent.trash.push(eligible.topCard!);
    opponent.battleArea.push(tooExpensive);
    state.players.push(you, opponent);
    return {
      state,
      ...(effect === "your-turn"
        ? {
            decision: {
              decisionId: "demo-darkdramon-delete",
              seat: 0 as const,
              kind: "chooseTargets" as const,
              promptText: "Choose an opposing Digimon with play cost 3 or less to delete",
              sourceCardId: "EX3-054",
              options: {
                candidateInstanceIds: [eligible.permanentId],
                visibleInstanceIds: [eligible.permanentId, tooExpensive.permanentId],
                min: 1,
                max: 1,
                timing: "YourTurn",
                effectText: yourTurnText,
              },
            },
          }
        : {
            events: [
              {
                kind: "cardsMoved" as const,
                instanceIds: [eligible.topCard!.instanceId],
                from: "battleArea",
                to: "trash",
              },
            ],
          }),
    };
  }

  const trashCards = [
    { instanceId: "demo-darkdramon-commandramon", cardId: "EX3-046" },
    { instanceId: "demo-darkdramon-sealsdramon", cardId: "EX3-049" },
    { instanceId: "demo-darkdramon-cyberdramon", cardId: "EX3-050" },
    { instanceId: "demo-darkdramon-tankdramon", cardId: "EX3-051" },
    { instanceId: "demo-darkdramon-jazarichmon", cardId: "EX3-052" },
    { instanceId: "demo-darkdramon-metallicdramon", cardId: "EX3-053" },
    { instanceId: "demo-darkdramon-agumon", cardId: "BT1-010" },
  ];
  you.battleArea.push(permanent("demo-darkdramon-evolution-base", "EX3-051", 0, 7000));
  you.hand.push(card("demo-darkdramon-hand", "EX3-054", 0));
  you.trash.push(...trashCards.map(({ instanceId, cardId }) => card(instanceId, cardId, 0)));
  state.players.push(you, opponent);

  if (step === "order") {
    const orderCards = trashCards.slice(0, 3);
    return {
      state,
      decision: {
        decisionId: "demo-darkdramon-order",
        seat: 0,
        kind: "orderCards",
        promptText: "Choose the order for the returned D-Brigade cards",
        sourceCardId: "EX3-054",
        options: {
          candidateInstanceIds: orderCards.map(({ instanceId }) => instanceId),
          visibleInstanceIds: orderCards.map(({ instanceId }) => instanceId),
          visibleCards: orderCards,
          min: 3,
          max: 3,
          orderDestination: "deckTop",
          timing: "Static",
          effectText: reductionText,
        },
      },
    };
  }

  if (step === "select") {
    return {
      state,
      decision: {
        decisionId: "demo-darkdramon-select",
        seat: 0,
        kind: "selectCards",
        promptText: "Choose 1 to 5 D-Brigade cards to return to the top of your deck",
        sourceCardId: "EX3-054",
        options: {
          candidateInstanceIds: trashCards.slice(0, 6).map(({ instanceId }) => instanceId),
          visibleInstanceIds: trashCards.map(({ instanceId }) => instanceId),
          min: 1,
          max: 5,
          timing: "Static",
          effectText: reductionText,
        },
      },
    };
  }

  return {
    state,
    decision: {
      decisionId: "demo-darkdramon-optional",
      seat: 0,
      kind: "optional",
      promptText: "Return D-Brigade cards from your trash to reduce the digivolution cost?",
      sourceCardId: "EX3-054",
      options: { timing: "Static", effectText: reductionText },
    },
  };
}
