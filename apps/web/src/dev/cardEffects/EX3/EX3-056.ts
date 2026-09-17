import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function guilmonDemo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 6;
  state.turnSeat = 0;
  state.memory = 2;
  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "guilmon-opponent");
  const elecmon = permanent("demo-guilmon-elecmon", "BT1-028", 1, 2000);
  const boundary = permanent("demo-guilmon-boundary", "EX3-056", 1, 3000);
  const tooLarge = permanent("demo-guilmon-too-large", "EX3-058", 1, 5000);
  you.trash.push(card("demo-deleted-guilmon", "EX3-056", 0));
  opponent.battleArea.push(elecmon, boundary, tooLarge);

  const effectText =
    "[On Deletion] Delete 1 of your opponent's Digimon with 3000 DP or less. If no Digimon is deleted by this effect, trash the top 2 cards of both players' decks.";
  if (effect === "mill" || effect === "evade") {
    you.deckCount = 34;
    opponent.deckCount = 34;
    you.trash.push(card("demo-guilmon-own-mill-one", "BT1-010", 0), card("demo-guilmon-own-mill-two", "BT1-020", 0));
    opponent.trash.push(
      card("demo-guilmon-opponent-mill-one", "BT1-028", 1),
      card("demo-guilmon-opponent-mill-two", "BT1-029", 1),
    );
    opponent.battleArea.splice(0, opponent.battleArea.length);
    if (effect === "evade") {
      const survivor = permanent("demo-guilmon-evade-survivor", "BT14-021", 1, 3000);
      survivor.isSuspended = true;
      opponent.battleArea.push(survivor);
    } else {
      opponent.battleArea.push(tooLarge);
    }
    state.players.push(you, opponent);
    return {
      state,
      events: [
        {
          kind: "cardsMoved",
          instanceIds: ["demo-guilmon-own-mill-one", "demo-guilmon-own-mill-two"],
          from: "deck",
          to: "trash",
        },
        {
          kind: "cardsMoved",
          instanceIds: ["demo-guilmon-opponent-mill-one", "demo-guilmon-opponent-mill-two"],
          from: "deck",
          to: "trash",
        },
      ],
    };
  }

  state.players.push(you, opponent);
  return {
    state,
    decision: {
      decisionId: "demo-guilmon-on-deletion",
      seat: 0,
      kind: "chooseTargets",
      promptText: "Choose an opposing Digimon with 3000 DP or less to delete",
      sourceCardId: "EX3-056",
      options: {
        candidateInstanceIds: [elecmon.permanentId, boundary.permanentId],
        visibleInstanceIds: [elecmon.permanentId, boundary.permanentId, tooLarge.permanentId],
        min: 1,
        max: 1,
        timing: "OnDeletion",
        effectText,
      },
    },
  };
}
