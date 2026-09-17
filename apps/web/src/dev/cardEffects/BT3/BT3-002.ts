import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function demiVeemonBt3Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 7;
  state.turnSeat = 0;
  state.memory = 0;
  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const hasJamming = effect !== "no-jamming";
  const host = permanent("demo-demiveemon-host", hasJamming ? "BT1-016" : "BT1-010", 0, hasJamming ? 4000 : 2000);
  host.stack.push(card("demo-demiveemon-source", "BT3-002", 0));
  host.isSuspended = true;
  if (hasJamming) {
    host.keywords.push("Jamming");
    you.hand.push(card("demo-demiveemon-drawn", "BT1-012", 0));
    you.deckCount = 35;
  } else you.deckCount = 36;
  you.battleArea.push(host);
  state.players.push(you, opponent);
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT3-002",
        effectKey: `BT3-002/${effect ?? "jamming-draw"}`,
        description: hasJamming
          ? "DemiVeemon's inherited When Attacking effect saw Jamming and drew exactly 1 card."
          : "The attacking host lacked Jamming, so DemiVeemon did not draw a card.",
        timing: "WhenAttacking",
      },
    ],
  };
}
