import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function growlmonDemo(effect: string | null, step: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 6;
  state.turnSeat = 0;
  state.memory = 2;
  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "growlmon-opponent");
  const growlmon = permanent("demo-growlmon", "EX3-057", 0, 5000, [
    { instanceId: "demo-guilmon-source", cardId: "EX3-056" },
  ]);
  const elecmon = permanent("demo-elecmon", "BT1-028", 1, 2000);
  const guilmon = permanent("demo-guilmon", "EX3-056", 1, 3000);
  const tooLarge = permanent("demo-too-large", "EX3-058", 1, 5000);
  you.battleArea.push(growlmon);
  opponent.battleArea.push(elecmon, guilmon, tooLarge);

  const whenDigivolvingText =
    "[When Digivolving] Delete 1 of your opponent's Digimon with 3000 DP or less. If no Digimon was deleted by this effect, trash the top 2 cards of both players' decks.";
  if (effect === "mill") {
    you.deckCount = 34;
    opponent.deckCount = 34;
    you.trash.push(card("demo-own-milled-one", "BT1-010", 0), card("demo-own-milled-two", "BT1-020", 0));
    opponent.trash.push(card("demo-opponent-milled-one", "BT1-028", 1), card("demo-opponent-milled-two", "BT1-029", 1));
    opponent.battleArea.splice(0, 2);
    state.players.push(you, opponent);
    return {
      state,
      events: [
        { kind: "cardsMoved", instanceIds: ["demo-own-milled-one", "demo-own-milled-two"], from: "deck", to: "trash" },
        {
          kind: "cardsMoved",
          instanceIds: ["demo-opponent-milled-one", "demo-opponent-milled-two"],
          from: "deck",
          to: "trash",
        },
      ],
    };
  }

  if (effect === "inherited") {
    const host = permanent("demo-virus-host", "BT1-020", 0, 6000, [
      { instanceId: "demo-growlmon-source", cardId: "EX3-057" },
    ]);
    const guilmonCost = permanent("demo-guilmon-cost", "EX3-056", 0, 2000);
    const agumonCost = permanent("demo-agumon-cost", "BT1-010", 0, 2000);
    you.battleArea.splice(0, you.battleArea.length);
    you.battleArea.push(host, guilmonCost, agumonCost);
    opponent.battleArea.splice(0, opponent.battleArea.length);
    state.players.push(you, opponent);
    const inheritedText =
      "[When Attacking] [Once Per Turn] By deleting 1 of your other Digimon, this Digimon gains Security Attack +1 for the turn.";
    return {
      state,
      decision:
        step === "cost"
          ? {
              decisionId: "demo-growlmon-inherited-cost",
              seat: 0,
              kind: "chooseTargets",
              promptText: "Choose another Digimon to delete",
              sourceCardId: "EX3-057",
              options: {
                candidateInstanceIds: [guilmonCost.permanentId, agumonCost.permanentId],
                visibleInstanceIds: [host.permanentId, guilmonCost.permanentId, agumonCost.permanentId],
                min: 1,
                max: 1,
                timing: "WhenAttacking",
                effectText: inheritedText,
              },
            }
          : {
              decisionId: "demo-growlmon-inherited-optional",
              seat: 0,
              kind: "optional",
              promptText: "Delete another Digimon to gain Security Attack +1?",
              sourceCardId: "EX3-057",
              options: { timing: "WhenAttacking", effectText: inheritedText },
            },
    };
  }

  state.players.push(you, opponent);
  return {
    state,
    decision: {
      decisionId: "demo-growlmon-delete",
      seat: 0,
      kind: "chooseTargets",
      promptText: "Choose an opposing Digimon with 3000 DP or less to delete",
      sourceCardId: "EX3-057",
      options: {
        candidateInstanceIds: [elecmon.permanentId, guilmon.permanentId],
        visibleInstanceIds: [elecmon.permanentId, guilmon.permanentId, tooLarge.permanentId],
        min: 1,
        max: 1,
        timing: "WhenDigivolving",
        effectText: whenDigivolvingText,
      },
    },
  };
}
