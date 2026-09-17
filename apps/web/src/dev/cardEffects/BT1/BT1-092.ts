import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function nuclearLaserDemo(effect: string | null): CardEffectsFixture {
  const effectText = "[Main] Draw 2. Then 1 of your Digimon gets +2000 DP for the turn.";
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = effect === "expired" ? Phase.Active : Phase.Main;
  state.turnCount = effect === "expired" ? 6 : 5;
  state.turnSeat = effect === "expired" ? 1 : 0;
  state.memory = 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  if (effect === "no-target") {
    you.battleArea.push(permanent("demo-nuclear-laser-tamer", "BT1-085", 0, 0));
  } else {
    you.battleArea.push(
      permanent("demo-nuclear-laser-first", "BT1-010", 0, effect === "buffed" ? 4000 : 2000),
      permanent("demo-nuclear-laser-second", "BT1-011", 0, 3000),
    );
  }
  you.hand.push(card("demo-nuclear-laser-draw-one", "BT1-014", 0));
  you.hand.push(card("demo-nuclear-laser-draw-two", "BT1-015", 0));
  you.handCount = 2;
  you.deckCount = 34;
  you.trash.push(card("demo-nuclear-laser-option", "BT1-092", 0));
  opponent.handCount = 5;
  state.players.push(you, opponent);

  if (effect === null) {
    const candidates = you.battleArea.map((entry) => entry.topCard.instanceId);
    return {
      state,
      decision: {
        decisionId: "demo-nuclear-laser-target",
        seat: 0,
        kind: "chooseTargets",
        promptText: "Draw 2 completed. Choose 1 of your Digimon to get +2000 DP for the turn.",
        sourceCardId: "BT1-092",
        options: {
          candidateInstanceIds: candidates,
          visibleInstanceIds: candidates,
          min: 1,
          max: 1,
          timing: "Main",
          effectText,
        },
      },
    };
  }

  const descriptions: Record<string, string> = {
    buffed: "Nuclear Laser drew 2 cards, then gave only the selected Digimon +2000 DP for the turn.",
    "no-target": "Nuclear Laser still drew 2 cards when no Digimon existed to receive the DP bonus.",
    expired: "Nuclear Laser's +2000 DP expired at the end of the turn.",
  };
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT1-092",
        effectKey: "BT1-092/draw-and-dp",
        description: descriptions[effect] ?? effectText,
        timing: effect === "expired" ? "End of Turn" : "Main",
      },
    ],
  };
}
