import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function trialOfTheFourGreatDragonsDemo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = effect === "main" ? 5 : 6;
  state.turnSeat = 0;
  state.memory = 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  opponent.handCount = 5;
  state.players.push(you, opponent);

  if (effect === "main") {
    you.battleArea.push(permanent("demo-trial", "EX3-069", 0, 0));
    you.hand.push(card("demo-drawn-azulongmon", "EX3-025", 0));
    you.handCount = 1;
    return {
      state,
      events: [
        { kind: "cardsMoved", instanceIds: ["demo-drawn-azulongmon"], from: "deck", to: "hand" },
        { kind: "cardsMoved", instanceIds: ["demo-trial-top"], from: "hand", to: "battleArea" },
      ],
    };
  }

  if (effect === "security") {
    you.battleArea.push(permanent("demo-trial", "EX3-069", 0, 0));
    return {
      state,
      events: [{ kind: "cardsMoved", instanceIds: ["demo-trial-top"], from: "security", to: "battleArea" }],
    };
  }

  you.trash.push(card("demo-trial-trash", "EX3-069", 0));
  you.hand.push(card("demo-azulongmon", "EX3-025", 0));
  you.hand.push(card("demo-magnadramon", "EX3-036", 0));
  you.hand.push(card("demo-agumon", "BT1-010", 0));
  you.handCount = you.hand.length;

  return {
    state,
    decision: {
      decisionId: "demo-trial-delay",
      seat: 0,
      kind: "selectCards",
      promptText: "Select cards",
      sourceCardId: "EX3-069",
      options: {
        candidateInstanceIds: ["demo-azulongmon", "demo-magnadramon"],
        visibleInstanceIds: ["demo-azulongmon", "demo-magnadramon", "demo-agumon"],
        min: 1,
        max: 1,
        timing: "Main",
        effectText:
          "[Main] ＜Delay＞ Play 1 Digimon card with [Four Great Dragons] in its traits from your hand without paying the cost. The Digimon played by this effect can't digivolve to level 7, and at the next end of your opponent's turn, delete that Digimon.",
      },
    },
  };
}
