import { GameState, Phase } from "@aegis/shared";
import { card, player, type CardEffectsFixture } from "../fixture";

export function pumpkinmonBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 8;
  state.turnSeat = 0;
  state.memory = 2;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  state.players.push(you, opponent);

  if (effect === null || effect === "choose-trash") {
    you.hand.push(
      card("demo-pumpkinmon-bt2-existing", "BT1-012", 0),
      card("demo-pumpkinmon-bt2-first-draw", "BT1-010", 0),
      card("demo-pumpkinmon-bt2-second-draw", "BT1-011", 0),
    );
    you.handCount = 3;
    you.trash.push(card("demo-pumpkinmon-bt2-source", "BT2-076", 0), card("demo-pumpkinmon-bt2-host", "BT2-079", 0));
    return {
      state,
      decision: {
        decisionId: "demo-pumpkinmon-bt2-trash-choice",
        seat: 0,
        kind: "selectCards",
        promptText: "Trash 1 card from your hand",
        sourceCardId: "BT2-076",
        options: {
          candidateInstanceIds: [
            "demo-pumpkinmon-bt2-existing",
            "demo-pumpkinmon-bt2-first-draw",
            "demo-pumpkinmon-bt2-second-draw",
          ],
          visibleInstanceIds: [
            "demo-pumpkinmon-bt2-existing",
            "demo-pumpkinmon-bt2-first-draw",
            "demo-pumpkinmon-bt2-second-draw",
          ],
          min: 1,
          max: 1,
          timing: "OnDeletion",
          effectText: "[On Deletion] Draw 2. Then trash 1 card from your hand.",
        },
      },
    };
  }

  if (effect === "top-card") {
    you.trash.push(card("demo-pumpkinmon-bt2-deleted-top", "BT2-076", 0));
  } else {
    you.hand.push(card("demo-pumpkinmon-bt2-kept", "BT1-010", 0));
    you.handCount = 1;
    you.trash.push(
      card("demo-pumpkinmon-bt2-source", "BT2-076", 0),
      card("demo-pumpkinmon-bt2-host", "BT2-079", 0),
      card("demo-pumpkinmon-bt2-discarded", "BT1-011", 0),
    );
  }
  const descriptions: Record<string, string> = {
    resolved: "Pumpkinmon's inherited On Deletion effect drew 2 cards, then trashed the selected card from hand.",
    "top-card": "Pumpkinmon was the top card, so its inherited On Deletion effect did not activate.",
    "battle-deleted": "The host was deleted in battle; Pumpkinmon drew 2, then trashed 1 card from hand.",
  };
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT2-076",
        effectKey: `BT2-076/${effect}`,
        description: descriptions[effect]!,
        timing: "OnDeletion",
      },
    ],
  };
}
