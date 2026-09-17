import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function agumonBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 5;
  state.turnSeat = 0;
  state.memory = 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  you.battleArea.push(
    permanent("demo-agumon-bt2-host", "BT2-035", 0, 5000, [
      { instanceId: "demo-agumon-bt2-source", cardId: "BT2-033" },
    ]),
    permanent("demo-agumon-bt2-tamer-a", "BT1-087", 0, 0),
    permanent("demo-agumon-bt2-tamer-b", "BT1-087", 0, 0),
  );
  if (effect !== "two-yellow-tamers") {
    you.battleArea.push(permanent("demo-agumon-bt2-tamer-c", "BT1-087", 0, 0));
  }
  if (effect === "draw") {
    you.hand.push(card("demo-agumon-bt2-drawn", "BT1-010", 0));
    you.handCount = 1;
  }
  opponent.securityCount = effect === "draw" ? 4 : 5;
  state.players.push(you, opponent);

  if (effect === null) return { state };
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT2-033",
        effectKey: "BT2-033/inherited-draw",
        description:
          effect === "draw"
            ? "The host attacked with 3 yellow Tamers in play, so Agumon's inherited effect drew 1 card."
            : "The host attacked with only 2 yellow Tamers, so Agumon's inherited effect did not draw.",
        timing: "When Attacking",
      },
    ],
  };
}
