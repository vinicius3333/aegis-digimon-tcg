import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function impmonBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 8;
  state.turnSeat = effect === "battle-deleted" ? 1 : 0;
  state.memory = 2;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const trashedCount = effect === "short-deck" ? 2 : 3;
  for (let index = 0; index < trashedCount; index += 1) {
    you.trash.push(card(`demo-impmon-bt2-trashed-${index}`, `BT1-0${10 + index}`, 0));
  }
  you.trash.push(card("demo-impmon-bt2-deleted", "BT2-068", 0));
  if (effect === "battle-deleted") {
    const attacker = permanent("demo-impmon-bt2-attacker", "BT1-010", 1, 2000);
    attacker.isSuspended = true;
    opponent.battleArea.push(attacker);
  }
  state.players.push(you, opponent);

  const selected = effect ?? "deleted-three";
  const descriptions: Record<string, string> = {
    "deleted-three": "Impmon's On Deletion effect trashed the top 3 cards of its controller's deck.",
    "short-deck": "With only 2 cards left in the deck, Impmon trashed both remaining cards.",
    "battle-deleted": "After Impmon was deleted in battle, its On Deletion effect trashed the top 3 cards.",
  };
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT2-068",
        effectKey: `BT2-068/${selected}`,
        description: descriptions[selected]!,
        timing: "OnDeletion",
      },
    ],
  };
}
