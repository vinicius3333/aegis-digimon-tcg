import { GameState, Phase } from "@aegis/shared";
import { card, permanent, player, type CardEffectsFixture } from "../fixture";

export function diaboromonBt2Demo(effect: string | null): CardEffectsFixture {
  const state = new GameState();
  state.matchId = "card-effects-demo";
  state.phase = Phase.Main;
  state.turnCount = 8;
  state.turnSeat = 0;
  state.memory = 0;

  const you = player(0, "Effect tester", "card-effects-viewer");
  const opponent = player(1, "Training opponent", "card-effects-opponent");
  if (effect === "prevent-with-card") {
    you.battleArea.push(permanent("demo-diaboromon-bt2-protected", "BT2-082", 0, 10000));
    you.trash.push(card("demo-diaboromon-bt2-cost", "BT5-084", 0));
  } else if (effect === "prevent-with-token") {
    you.battleArea.push(permanent("demo-diaboromon-bt2-protected", "BT2-082", 0, 10000));
  } else if (effect === "effect-deletion") {
    you.battleArea.push(permanent("demo-diaboromon-bt2-other", "BT5-084", 0, 10000));
    you.trash.push(card("demo-diaboromon-bt2-deleted", "BT2-082", 0));
  } else {
    const source = permanent("demo-diaboromon-bt2", "BT2-082", 0, 10000);
    source.isSuspended = true;
    you.battleArea.push(source);
    if (effect === "token-played") {
      you.battleArea.push(permanent("demo-diaboromon-bt2-token", "TOKEN-Diaboromon", 0, 3000));
    }
  }
  state.players.push(you, opponent);

  const selected = effect ?? "token-played";
  const descriptions: Record<string, string> = {
    "token-played": "Diaboromon played a level 6 white Diaboromon Token with 3000 DP without paying its cost.",
    declined: "Diaboromon's optional When Attacking effect was declined, so no Token was played.",
    "prevent-with-card": "Another Diaboromon was deleted to prevent this Diaboromon's battle deletion.",
    "prevent-with-token": "A Diaboromon Token was deleted to prevent this Diaboromon's battle deletion.",
    "effect-deletion": "Effect deletion was not a battle, so Diaboromon could not use its prevention effect.",
  };
  return {
    state,
    events: [
      {
        kind: "effectTriggered",
        seat: 0,
        sourceCardId: "BT2-082",
        effectKey: `BT2-082/${selected}`,
        description: descriptions[selected]!,
        timing: selected === "token-played" || selected === "declined" ? "WhenAttacking" : "AllTurns",
      },
    ],
  };
}
