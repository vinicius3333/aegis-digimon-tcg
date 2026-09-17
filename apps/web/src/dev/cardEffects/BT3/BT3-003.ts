import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function upamonBt3Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 7;
  state.turnSeat = 0;
  state.memory = 0;
  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const qualifies = effect !== "four-security";
  const host = permanent("demo-upamon-host", "BT1-032", 0, 4000);
  host.stack.push(card("demo-upamon-source", "BT3-003", 0));
  host.isSuspended = true;
  you.battleArea.push(host);
  you.securityCount = qualifies ? 3 : 4;
  you.deckCount = qualifies ? 35 : 36;
  if (qualifies) you.hand.push(card("demo-upamon-drawn", "BT1-013", 0));
  state.players.push(you, opponent);
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT3-003",
        effectKey: `BT3-003/${effect ?? "three-security"}`,
        description: qualifies
          ? "With exactly 3 security cards, Upamon's inherited When Attacking effect drew 1 card."
          : "With 4 security cards, Upamon's condition was false and no card was drawn.",
        timing: "WhenAttacking",
      },
    ],
  };
}
