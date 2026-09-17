import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function demiMeramonBt3Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 7;
  state.turnSeat = 0;
  state.memory = 0;
  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const host = permanent("demo-demimeramon-host", "BT2-079", 0, 12000);
  host.stack.push(card("demo-demimeramon-source", "BT3-006", 0));
  you.deckCount = effect === "resolved" ? 35 : 36;
  you.trash.push(
    card("demo-demimeramon-host-trash", "BT2-079", 0),
    card("demo-demimeramon-source-trash", "BT3-006", 0),
  );
  if (effect === "resolved") {
    you.hand.push(card("demo-demimeramon-kept", "BT1-011", 0));
    you.trash.push(card("demo-demimeramon-drawn-then-trashed", "BT1-010", 0));
  } else {
    you.battleArea.push(host);
    you.deckCount = 36;
    you.hand.push(card("demo-demimeramon-existing", "BT1-011", 0));
  }
  state.players.push(you, opponent);
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT3-006",
        effectKey: `BT3-006/${effect ?? "resolved"}`,
        description: "DemiMeramon's On Deletion effect drew 1 card, then trashed 1 card from its owner's hand.",
        timing: "OnDeletion",
      },
    ],
  };
}
