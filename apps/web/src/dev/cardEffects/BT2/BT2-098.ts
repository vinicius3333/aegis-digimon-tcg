import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function edensJavelinBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 7;
  state.turnSeat = 0;
  state.memory = 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const first = permanent("demo-edens-javelin-first", "BT1-062", 1, 8000);
  const second = permanent("demo-edens-javelin-second", "BT1-062", 1, 8000);
  if (effect === null || effect === "choose-one") {
    you.hand.push(
      card("demo-edens-javelin-hand-a", "BT2-034", 0),
      card("demo-edens-javelin-hand-b", "BT2-035", 0),
      card("demo-edens-javelin-drawn", "BT2-036", 0),
    );
    opponent.battleArea.push(first, second);
  } else {
    const reduction = effect === "one-card-hand" ? 1000 : 2000;
    first.currentDP = first.baseDP - reduction;
    opponent.battleArea.push(first, second);
    const handCount = effect === "one-card-hand" ? 1 : 2;
    for (let index = 0; index < handCount; index += 1) {
      you.hand.push(card(`demo-edens-javelin-hand-${index}`, index === 0 ? "BT2-035" : "BT2-034", 0));
    }
    if (effect !== "security-main") you.trash.push(card("demo-edens-javelin-option", "BT2-098", 0));
  }
  state.players.push(you, opponent);

  const effectText =
    "[Main] Draw 1. Then, 1 of your opponent's Digimon gets -1000 DP for each card in your hand for the turn.";
  if (effect === null || effect === "choose-one") {
    return {
      state,
      decision: {
        decisionId: "demo-edens-javelin-selection",
        seat: 0,
        kind: "chooseTargets",
        promptText: "Choose 1 opposing Digimon for -3000 DP",
        sourceCardId: "BT2-098",
        options: {
          candidateInstanceIds: [first.permanentId, second.permanentId],
          visibleInstanceIds: [first.permanentId, second.permanentId],
          min: 1,
          max: 1,
          timing: "Main",
          effectText,
        },
      },
    };
  }

  const descriptions: Record<string, string> = {
    "draw-and-scale": "After Draw 1, the 2-card hand made exactly 1 opposing Digimon lose 2000 DP.",
    "one-card-hand": "With only the drawn card in hand, exactly 1 opposing Digimon lost 1000 DP.",
    "security-main": "Security activated Main: draw 1, then one target lost 2000 DP from the post-draw hand size.",
  };
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT2-098",
        effectKey: `BT2-098/${effect}`,
        description: descriptions[effect]!,
        timing: effect === "security-main" ? "Security" : "Main",
      },
    ],
  };
}
