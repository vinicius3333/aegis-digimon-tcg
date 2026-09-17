import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function tapirmonBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 8;
  state.turnSeat = effect === "battle-deleted" ? 1 : 0;
  state.memory = 2;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  you.trash.push(card("demo-tapirmon-bt2-deleted", "BT2-070", 0));
  if (effect !== "empty-deck") {
    you.hand.push(card("demo-tapirmon-bt2-drawn", "BT1-010", 0));
    you.handCount = 1;
  }
  if (effect === "battle-deleted") {
    const attacker = permanent("demo-tapirmon-bt2-attacker", "BT1-084", 1, 15000);
    attacker.isSuspended = true;
    opponent.battleArea.push(attacker);
  }
  state.players.push(you, opponent);

  const selected = effect ?? "deleted-drew";
  const descriptions: Record<string, string> = {
    "deleted-drew": "Tapirmon's On Deletion effect drew the top card of its controller's deck.",
    "empty-deck": "Tapirmon's On Deletion effect resolved with no card to draw from the empty deck.",
    "battle-deleted": "After Tapirmon was deleted in battle, its On Deletion effect drew 1 card.",
  };
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT2-070",
        effectKey: `BT2-070/${selected}`,
        description: descriptions[selected]!,
        timing: "OnDeletion",
      },
    ],
  };
}
