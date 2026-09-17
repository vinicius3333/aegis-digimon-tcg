import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function keramonBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 7;
  state.turnSeat = effect === "opponent-turn" ? 1 : 0;
  state.memory = 2;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  const hostCardId = effect === "q2814" ? "BT2-082" : "BT2-054";
  const host = permanent("demo-keramon-bt2-host", hostCardId, 0, effect === "q2814" ? 10000 : 3000, [
    { instanceId: "demo-keramon-bt2-source", cardId: "BT2-053" },
  ]);
  you.battleArea.push(host);

  if (effect === "same-name") {
    you.battleArea.push(permanent("demo-keramon-bt2-played-gotsumon", "BT2-054", 0, 3000));
    you.hand.push(card("demo-keramon-bt2-drawn", "BT1-010", 0));
    you.handCount = 1;
  } else if (effect === "wrong-name") {
    you.battleArea.push(permanent("demo-keramon-bt2-played-keramon", "BT2-053", 0, 2000));
  } else if (effect === "q2814") {
    you.battleArea.push(
      permanent("demo-keramon-bt2-token-one", "TOKEN-Diaboromon", 0, 3000),
      permanent("demo-keramon-bt2-token-two", "TOKEN-Diaboromon", 0, 3000),
    );
    you.hand.push(card("demo-keramon-bt2-single-draw", "BT1-010", 0));
    you.handCount = 1;
  } else if (effect === "opponent-turn") {
    you.battleArea.push(permanent("demo-keramon-bt2-opponent-turn-play", "BT2-054", 0, 3000));
  }
  state.players.push(you, opponent);

  if (effect === null) return { state };
  const descriptions: Record<string, string> = {
    "same-name": "Q1023: playing another Gotsumon matched the evolved host's current name and drew 1 card.",
    "wrong-name": "Q1023: playing Keramon did not match the Gotsumon host's name, so no card was drawn.",
    q2814: "Q2814: 2 Diaboromon Tokens played simultaneously triggered Keramon's inherited draw only once.",
    "opponent-turn": "The inherited effect did not trigger outside its controller's turn.",
  };
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT2-053",
        effectKey: "BT2-053/inherited-draw",
        description: descriptions[effect] ?? "Keramon's inherited effect state is displayed.",
        timing: "YourTurn",
      },
    ],
  };
}
