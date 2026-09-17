import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function magnadramonBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 5;
  state.turnSeat = 0;
  state.memory = 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  you.battleArea.push(permanent("demo-magnadramon-bt2", "BT2-039", 0, 10000));
  if (effect === "recovery-two") {
    you.securityCount = 3;
  } else if (effect === "four-security") {
    you.securityCount = 4;
  } else if (effect === "q1011-decline") {
    you.hand.push(card("demo-magnadramon-bt2-declined", "BT1-048", 0));
    you.handCount = 1;
  } else if (effect === "q1012-on-play") {
    you.battleArea.push(permanent("demo-magnadramon-bt2-patamon", "BT1-048", 0, 2000));
    you.hand.push(card("demo-magnadramon-bt2-found-tamer", "BT1-087", 0));
    you.handCount = 1;
  }
  opponent.securityCount = 5;
  state.players.push(you, opponent);

  if (effect === null) return { state };
  const descriptions: Record<string, string> = {
    "recovery-two": "Magnadramon was played at 1 security and recovered the top 2 deck cards, reaching 3 security.",
    "four-security": "Magnadramon was played at 4 security, so its Recovery +2 condition was not met.",
    "q1011-decline": "Q1011: the optional When Attacking play was declined, leaving Patamon in hand.",
    "q1012-on-play":
      "Q1012: Magnadramon played Patamon for free, then Patamon's On Play effect activated and added T.K. Takaishi to hand.",
  };
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT2-039",
        effectKey: effect.startsWith("q101") ? "BT2-039/when-attacking-play" : "BT2-039/on-play-recovery",
        description: descriptions[effect] ?? "Magnadramon's conditional effect state is displayed.",
        timing: effect.startsWith("q101") ? "When Attacking" : "On Play",
      },
    ],
  };
}
